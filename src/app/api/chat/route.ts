import { checkBotProtection } from '@/lib/bot-protection';
import { createBlogChatResponse } from '@/lib/chat-stream';
import { ChatbotError } from '@/lib/errors';
import { checkIpRateLimit } from '@/lib/ratelimit';
import { parseChatRequest } from './schema';

export const maxDuration = 30;

export async function POST(request: Request) {
	const rejection = await checkBotProtection();
	if (rejection) return rejection;
	const parsed = await parseChatRequest(request);
	if (parsed.response) return parsed.response;

	try {
		const forwardedFor =
			request.headers.get('x-vercel-forwarded-for') ??
			request.headers.get('x-forwarded-for');
		const ip =
			forwardedFor?.split(',')[0]?.trim() ||
			request.headers.get('x-real-ip')?.trim();
		await checkIpRateLimit(ip);
		request.signal.throwIfAborted();
		return await createBlogChatResponse(parsed.messages, request.signal);
	} catch (error) {
		if (request.signal.aborted) return new Response(null, { status: 499 });
		if (error instanceof ChatbotError) return error.toResponse();
		console.error('Chat API error:', error, {
			requestId: request.headers.get('x-vercel-id')
		});
		return Response.json(
			{ error: 'AI 服务暂时不可用，请稍后再试' },
			{ status: 500 }
		);
	}
}
