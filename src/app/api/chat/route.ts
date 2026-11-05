import { getChatProvider, getChatModelId } from '@/lib/chat-provider';
import { ChatbotError } from '@/lib/errors';
import { checkIpRateLimit } from '@/lib/ratelimit';
import { getBlogRetrieval } from '@/lib/rag';
import { BLOG_SYSTEM_PROMPT } from '@/lib/prompts';
import type { CustomChatMessage } from '@/lib/chat-types';
import type { RagTrace } from '@leslie/search-core/rag';
import {
	convertToModelMessages,
	createUIMessageStream,
	createUIMessageStreamResponse,
	safeValidateUIMessages,
	generateText,
	streamText,
	type UIMessage
} from 'ai';

export const maxDuration = 30;

const MAX_MESSAGES = 30;
const MAX_MESSAGE_LENGTH = 2000;

function getTextLength(messages: UIMessage[]) {
	return messages.reduce(
		(total, message) =>
			total +
			message.parts.reduce(
				(partTotal, part) =>
					part.type === 'text' ? partTotal + part.text.length : partTotal,
				0
			),
		0
	);
}

export async function POST(request: Request) {
	try {
		const body = (await request.json()) as { messages?: unknown };
		const validation = await safeValidateUIMessages<UIMessage>({
			messages: body.messages
		});

		if (!validation.success || validation.data.length === 0) {
			return Response.json({ error: '消息不能为空' }, { status: 400 });
		}

		const messages = validation.data;
		const hasOversizedMessage = messages.some((message) =>
			message.parts.some(
				(part) => part.type === 'text' && part.text.length > MAX_MESSAGE_LENGTH
			)
		);

		if (
			messages.length > MAX_MESSAGES ||
			hasOversizedMessage ||
			getTextLength(messages) > MAX_MESSAGES * MAX_MESSAGE_LENGTH
		) {
			return Response.json(
				{ error: '对话内容过长，请清空后重试' },
				{ status: 400 }
			);
		}

		const forwardedFor =
			request.headers.get('x-vercel-forwarded-for') ??
			request.headers.get('x-forwarded-for');
		const ip =
			forwardedFor?.split(',')[0]?.trim() ||
			request.headers.get('x-real-ip')?.trim();
		await checkIpRateLimit(ip);

		const provider = getChatProvider();
		const modelId = getChatModelId();
		const modelMessages = await convertToModelMessages(messages);
		const stream = createUIMessageStream<CustomChatMessage>({
			execute: async ({ writer }) => {
				writer.write({ type: 'start' });
				const startedAt = Date.now();
				writer.write({
					type: 'data-article-retrieval',
					id: 'article-retrieval',
					data: { status: 'searching', sources: [] }
				});
				let retrieval;
				let trace: RagTrace | undefined;
				try {
					request.signal.throwIfAborted();
					retrieval = await getBlogRetrieval(messages, {
						signal: request.signal,
						generateQueryPlan:
							process.env.AI_QUERY_PLANNING === 'false'
								? undefined
								: async ({ system, prompt, signal }) => {
										const result = await generateText({
											model: provider(process.env.AI_QUERY_MODEL ?? modelId),
											system,
											prompt,
											abortSignal: signal,
											maxOutputTokens: 400,
											maxRetries: 0
										});
										return result.text;
									},
						onEvent: (event) => {
							trace = event;
							writer.write({
								type: 'data-article-retrieval',
								id: 'article-retrieval',
								data: {
									status: 'searching',
									sources: [],
									trace: event,
									durationMs: Date.now() - startedAt
								}
							});
						}
					});
					writer.write({
						type: 'data-article-retrieval',
						id: 'article-retrieval',
						data: {
							status: 'complete',
							sources: retrieval.sources,
							trace,
							durationMs: Date.now() - startedAt
						}
					});
				} catch (error) {
					writer.write({
						type: 'data-article-retrieval',
						id: 'article-retrieval',
						data: {
							status: 'error',
							sources: [],
							trace,
							durationMs: Date.now() - startedAt
						}
					});
					throw error;
				}
				const result = streamText({
					model: provider(modelId),
					system: [BLOG_SYSTEM_PROMPT, retrieval.context].join('\n'),
					messages: modelMessages,
					abortSignal: request.signal,
					maxOutputTokens: 1200
				});
				writer.merge(
					result.toUIMessageStream({
						sendStart: false,
						onError: () => '回答生成失败，请稍后重试。'
					})
				);
			},
			onError: (error) => {
				console.error('Chat stream error:', error);
				return 'AI 服务暂时不可用，请稍后再试';
			}
		});

		return createUIMessageStreamResponse({ stream });
	} catch (error) {
		if (error instanceof ChatbotError) {
			return error.toResponse();
		}

		console.error('Chat API error:', error);
		return Response.json(
			{ error: 'AI 服务暂时不可用，请稍后再试' },
			{ status: 500 }
		);
	}
}
