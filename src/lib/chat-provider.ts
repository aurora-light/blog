import { createOpenAI } from '@ai-sdk/openai';

export function getChatProvider() {
	const apiKey =
		process.env.AI_API_KEY ??
		process.env.OPENAI_API_KEY ??
		process.env.LLM_API_KEY;
	if (!apiKey)
		throw new Error('缺少 AI_API_KEY、OPENAI_API_KEY 或 LLM_API_KEY 环境变量');
	const baseURL = process.env.AI_BASE_URL ?? process.env.LLM_BASE_URL;
	return createOpenAI({ apiKey, ...(baseURL ? { baseURL } : {}) });
}
export function getChatModelId() {
	return (
		process.env.AI_MODEL ??
		process.env.LLM_MODEL_ID ??
		process.env.MODEL_ID ??
		'gpt-4o-mini'
	);
}
