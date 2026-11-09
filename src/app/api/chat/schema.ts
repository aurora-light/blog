import { safeValidateUIMessages, type UIMessage } from 'ai';
import { z } from 'zod';

const MAX_MESSAGES = 30;
const MAX_MESSAGE_LENGTH = 2000;

const postRequestBodySchema = z.object({
	messages: z.array(z.unknown()).min(1).max(MAX_MESSAGES)
});

type ParsedChatRequest =
	| { messages: UIMessage[]; response?: never }
	| { response: Response; messages?: never };

export async function parseChatRequest(
	request: Request
): Promise<ParsedChatRequest> {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return {
			response: Response.json({ error: '请求格式不正确' }, { status: 400 })
		};
	}
	const parsed = postRequestBodySchema.safeParse(body);
	if (!parsed.success) {
		return {
			response: Response.json(
				{ error: '请提供 1 至 30 条有效消息' },
				{ status: 400 }
			)
		};
	}
	const validation = await safeValidateUIMessages<UIMessage>({
		messages: parsed.data.messages
	});
	if (!validation.success) {
		return {
			response: Response.json({ error: '消息格式不正确' }, { status: 400 })
		};
	}
	const messages = validation.data;
	if (messages.some((message) => message.role === 'system')) {
		return {
			response: Response.json(
				{ error: '不支持客户端系统消息' },
				{ status: 400 }
			)
		};
	}
	const textLength = messages.reduce(
		(total, message) =>
			total +
			message.parts.reduce(
				(length, part) =>
					length + (part.type === 'text' ? part.text.length : 0),
				0
			),
		0
	);
	if (textLength > MAX_MESSAGES * MAX_MESSAGE_LENGTH) {
		return {
			response: Response.json(
				{ error: '对话内容过长，请清空后重试' },
				{ status: 400 }
			)
		};
	}

	if (
		messages.some((message) =>
			message.parts.some(
				(part) => part.type === 'text' && part.text.length > MAX_MESSAGE_LENGTH
			)
		)
	) {
		return {
			response: Response.json(
				{ error: '对话内容过长，请清空后重试' },
				{ status: 400 }
			)
		};
	}
	return { messages };
}
