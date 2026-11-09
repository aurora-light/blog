import { getChatModelId, getChatProvider } from '@/lib/chat-provider';
import type { CustomChatMessage } from '@/lib/chat-types';
import { healthTimeChecker } from '@/lib/health-time-checker';
import { BLOG_SYSTEM_PROMPT } from '@/lib/prompts';
import { getBlogRetrieval } from '@/lib/rag';
import type { RagTrace } from '@leslie/search-core/rag';
import {
	convertToModelMessages,
	createUIMessageStream,
	createUIMessageStreamResponse,
	generateText,
	streamText,
	type UIMessage
} from 'ai';

function isModelStreamActivity(chunk: { type: string }) {
	return !['start', 'start-step', 'finish-step', 'finish', 'raw'].includes(
		chunk.type
	);
}

export async function createBlogChatResponse(
	messages: UIMessage[],
	signal: AbortSignal
) {
	const provider = getChatProvider();
	const modelId = getChatModelId();
	const modelMessages = await convertToModelMessages(messages);
	const stream = createUIMessageStream<CustomChatMessage>({
		execute: async ({ writer: dataStream }) => {
			dataStream.write({ type: 'start' });
			const startedAt = Date.now();
			dataStream.write({
				type: 'data-article-retrieval',
				id: 'article-retrieval',
				data: { status: 'searching', sources: [] }
			});
			let retrieval;
			let trace: RagTrace | undefined;
			try {
				signal.throwIfAborted();
				retrieval = await getBlogRetrieval(messages, {
					signal: signal,
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
						dataStream.write({
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
				dataStream.write({
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
				if (signal.aborted) throw error;
				dataStream.write({
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
			signal.throwIfAborted();
			let waitingStopped = false;
			const writeWaitingStatus = (
				phase: 'waiting' | 'still-waiting' | 'thinking' | 'health',
				message: string
			) => {
				if (signal.aborted) return;
				dataStream.write({
					type: 'data-waiting-status',
					transient: true,
					data: { phase, message, modelId, modelName: modelId }
				});
			};
			writeWaitingStatus('waiting', '正在等待模型响应…');
			const timer = setTimeout(() => {
				if (waitingStopped || signal.aborted) return;
				writeWaitingStatus('still-waiting', '模型响应较慢，请稍候…');
				void healthTimeChecker(modelId).then((availability) => {
					if (waitingStopped || signal.aborted) return;
					if (availability === 'impacted') {
						writeWaitingStatus(
							'health',
							'供应商报告服务异常，当前响应可能较慢或暂时不可用…'
						);
					}
				});
			}, 9000);
			const cleanup = () => {
				waitingStopped = true;
				clearTimeout(timer);
				signal.removeEventListener('abort', cleanup);
			};
			signal.addEventListener('abort', cleanup, { once: true });
			const markModelActive = () => {
				if (waitingStopped || signal.aborted) return;
				cleanup();
				writeWaitingStatus('thinking', '正在生成回答…');
			};
			try {
				const result = streamText({
					onChunk: ({ chunk }) => {
						if (isModelStreamActivity(chunk)) markModelActive();
					},
					onEnd: cleanup,
					onAbort: cleanup,
					onError: cleanup,
					model: provider(modelId),
					system: [BLOG_SYSTEM_PROMPT, retrieval.context].join('\n'),
					messages: modelMessages,
					abortSignal: signal,
					maxOutputTokens: 1200
				});
				dataStream.merge(
					result.toUIMessageStream({
						sendStart: false,
						onError: () => '回答生成失败，请稍后重试。'
					})
				);
			} catch (error) {
				cleanup();
				throw error;
			}
		},
		onError: (error) => {
			console.error('Chat stream error:', error);
			return 'AI 服务暂时不可用，请稍后再试';
		}
	});

	return createUIMessageStreamResponse({ stream });
}
