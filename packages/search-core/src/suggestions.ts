import { SUGGESTIONS_SYSTEM_PROMPT } from './lib/prompts/index.js';

export interface Suggestions {
	questions: string[];
}
export interface SuggestionsInput {
	question: string;
	reply: string;
	knowledgeBase: string;
	signal?: AbortSignal;
}
export interface SuggestionsRequest {
	system: string;
	prompt: string;
	signal: AbortSignal;
}

export function buildSuggestionsPrompt(
	input: Omit<SuggestionsInput, 'signal'>
) {
	return {
		system: SUGGESTIONS_SYSTEM_PROMPT,
		prompt: JSON.stringify({
			knowledgeBase: input.knowledgeBase.slice(0, 6500),
			question: input.question.slice(0, 2000),
			reply: input.reply.slice(0, 8000)
		})
	};
}

export function parseSuggestions(value: unknown, question = ''): Suggestions {
	if (typeof value === 'string') {
		if (value.length > 4000) throw new Error('Suggestions too large');
		value = JSON.parse(value);
	}
	if (
		!value ||
		typeof value !== 'object' ||
		!('questions' in value) ||
		!Array.isArray(value.questions) ||
		value.questions.length > 3
	)
		throw new Error('Invalid suggestions');
	const normalize = (text: string) =>
		text
			.normalize('NFKC')
			.toLowerCase()
			.replace(/[\s?？。.!！]/g, '');
	const seen = new Set([normalize(question)]);
	const questions: string[] = [];
	for (const item of value.questions) {
		if (typeof item !== 'string' || !item.trim() || item.length > 60)
			throw new Error('Invalid suggestion');
		const text = item.trim();
		const key = normalize(text);
		if (!key || seen.has(key)) continue;
		seen.add(key);
		questions.push(text);
	}
	return { questions };
}

export async function generateSuggestions(
	input: SuggestionsInput,
	options: {
		generate: (request: SuggestionsRequest) => Promise<unknown>;
		timeoutMs?: number;
	}
): Promise<Suggestions> {
	input.signal?.throwIfAborted();
	if (!input.reply.trim() || !input.knowledgeBase.trim())
		return { questions: [] };
	const timeoutMs = options.timeoutMs ?? 2500;
	if (!Number.isFinite(timeoutMs) || timeoutMs <= 0)
		throw new RangeError('Invalid suggestions timeout');
	const controller = new AbortController();
	let timer: ReturnType<typeof setTimeout> | undefined;
	let onAbort: () => void = () => {};
	const interrupted = new Promise<never>((_, reject) => {
		onAbort = () => {
			controller.abort(input.signal?.reason);
			reject(input.signal?.reason ?? new Error('Aborted'));
		};
		input.signal?.addEventListener('abort', onAbort, { once: true });
		timer = setTimeout(() => {
			const error = new Error('Suggestions timed out');
			controller.abort(error);
			reject(error);
		}, timeoutMs);
	});
	try {
		const output = await Promise.race([
			Promise.resolve().then(() => {
				controller.signal.throwIfAborted();
				return options.generate({
					...buildSuggestionsPrompt(input),
					signal: controller.signal
				});
			}),
			interrupted
		]);
		input.signal?.throwIfAborted();
		return parseSuggestions(output, input.question);
	} catch {
		input.signal?.throwIfAborted();
		return { questions: [] };
	} finally {
		clearTimeout(timer);
		input.signal?.removeEventListener('abort', onAbort);
	}
}
