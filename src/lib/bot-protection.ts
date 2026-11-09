import { checkBotId } from 'botid/server';

/** Return a rejection response, or null when the request may proceed. */
export async function checkBotProtection(): Promise<Response | null> {
	try {
		const result = await checkBotId();
		if (result.isBot) {
			return Response.json(
				{ error: '请求未通过安全验证，请使用浏览器重试。' },
				{ status: 403, headers: { 'Cache-Control': 'no-store' } }
			);
		}
		return null;
	} catch (error) {
		console.error('BotID verification failed:', error);
		return Response.json(
			{ error: '安全验证暂时不可用，请稍后重试。' },
			{ status: 503, headers: { 'Cache-Control': 'no-store' } }
		);
	}
}
