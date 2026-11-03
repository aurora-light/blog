import { createOpenAI } from '@ai-sdk/openai';
import { ChatbotError } from '@/lib/errors';
import { checkIpRateLimit } from '@/lib/ratelimit';
import {
	convertToModelMessages,
	safeValidateUIMessages,
	streamText,
	type UIMessage
} from 'ai';

export const maxDuration = 30;

const MAX_MESSAGES = 30;
const MAX_MESSAGE_LENGTH = 2000;

function getProvider() {
	const apiKey =
		process.env.AI_API_KEY ??
		process.env.OPENAI_API_KEY ??
		process.env.LLM_API_KEY;

	if (!apiKey) {
		throw new Error('缺少 AI_API_KEY、OPENAI_API_KEY 或 LLM_API_KEY 环境变量');
	}
	const baseURL = process.env.AI_BASE_URL ?? process.env.LLM_BASE_URL;

	return createOpenAI({
		apiKey,
		...(baseURL ? { baseURL } : {})
	});
}

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

		const provider = getProvider();
		const modelId =
			process.env.AI_MODEL ??
			process.env.LLM_MODEL_ID ??
			process.env.MODEL_ID ??
			'gpt-4o-mini';
		const result = streamText({
			model: provider(modelId),
			system: [
				'你是“睡不醒的啊轩”的博客 AI 助手。',
				'请使用简洁、友好、准确的中文回答。',
				'你擅长前端开发、Next.js、Python、FastAPI 和 AI 应用开发。',
				'如果不知道答案，请直接说明，不要捏造博客或作者的信息。'
			].join('\n'),
			messages: await convertToModelMessages(messages),
			maxOutputTokens: 1200
		});

		return result.toUIMessageStreamResponse();
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
