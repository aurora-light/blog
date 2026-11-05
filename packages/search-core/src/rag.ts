import {
	QUERY_SYSTEM_PROMPT,
	RETRIEVAL_RULES,
	RETRIEVAL_DATA_LABEL,
	EMPTY_RETRIEVAL_NOTICE
} from './lib/prompts/index.js';
import type { SearchDocument, SearchHit } from './index.js';
import { fuseSearchResults } from './retrieval.js';

export interface RagMessage {
	role: string;
	parts: readonly { type: string; text?: string }[];
}
export interface HistoryMessage {
	role: 'user' | 'assistant';
	text: string;
}
export interface QueryPlan {
	standaloneQuery: string;
	primaryTerms: string[];
	relatedTerms: string[];
	queries: string[];
}
export interface QueryPlannerRequest {
	system: string;
	prompt: string;
	signal: AbortSignal;
}
export type QueryPlanner = (request: QueryPlannerRequest) => Promise<string>;
export interface RagRouteTrace {
	id: string;
	query: string;
	status: 'pending' | 'running' | 'complete' | 'error';
	hitCount?: number;
	durationMs?: number;
}
export interface RagTrace {
	phase: 'planning' | 'retrieving' | 'fusing' | 'complete';
	standaloneQuery?: string;
	primaryTerms?: string[];
	relatedTerms?: string[];
	fallback?:
		'disabled' | 'planner-timeout' | 'planner-invalid' | 'planner-error';
	routes: RagRouteTrace[];
	fusion?: {
		candidateCount: number;
		uniqueCount: number;
		selectedCount: number;
	};
}
export interface RagDocument extends SearchDocument {
	url: string;
	sourceType?: string;
	page?: number;
}
export interface RagSource {
	slug: string;
	title: string;
	url: string;
	description: string;
}
export interface RagOptions<T extends RagDocument> {
	retrieve: (
		query: string,
		options: { limit: number; signal: AbortSignal }
	) => readonly SearchHit<T>[] | Promise<readonly SearchHit<T>[]>;
	getSourceKey?: (document: T) => string;
	generateQueryPlan?: QueryPlanner;
	plannerTimeoutMs?: number;
	retrievalTimeoutMs?: number;
	maxQueries?: number;
	candidatesPerQuery?: number;
	maxSources?: number;
	maxContextChars?: number;
	contextRules?: readonly string[];
}
export interface RagInput {
	question: string;
	history?: readonly HistoryMessage[];
	signal?: AbortSignal;
	onEvent?: (trace: RagTrace) => void;
}

const textOf = (message: RagMessage | undefined) =>
	message?.parts
		.filter((part) => part.type === 'text')
		.map((part) => part.text ?? '')
		.join(' ')
		.trim() ?? '';

export function createRagInput(
	messages: readonly RagMessage[]
): Pick<RagInput, 'question' | 'history'> {
	const lastUser = messages.findLastIndex((message) => message.role === 'user');
	if (lastUser < 0) return { question: '', history: [] };
	return {
		question: textOf(messages[lastUser]).slice(0, 1000),
		history: messages
			.slice(0, lastUser)
			.filter(
				(message) => message.role === 'user' || message.role === 'assistant'
			)
			.slice(-4)
			.map((message) => ({
				role: message.role as HistoryMessage['role'],
				text: textOf(message).slice(0, 600)
			}))
	};
}

export function buildRetrievalQuery(messages: readonly RagMessage[]): string {
	const { question, history = [] } = createRagInput(messages);
	const previous =
		history.findLast((message) => message.role === 'user')?.text ?? '';
	return /^(那|那么|它|这个|这种|该|还有|继续|上面|刚才)/.test(question)
		? `${question} ${previous.slice(0, 500)}`.trim()
		: question;
}

export function buildQueryPlannerRequest(
	question: string,
	history: readonly HistoryMessage[] = []
) {
	return {
		system: QUERY_SYSTEM_PROMPT,
		prompt: JSON.stringify({
			history: history
				.filter((item) => item.role === 'user' || item.role === 'assistant')
				.slice(-4)
				.map((item) => ({ role: item.role, text: item.text.slice(0, 600) })),
			question: question.slice(0, 1000)
		})
	};
}
class InvalidPlanError extends Error {}
class DeadlineError extends Error {}

export function parseQueryPlan(text: string, maxQueries = 3): QueryPlan {
	if (!Number.isInteger(maxQueries) || maxQueries < 1 || maxQueries > 3)
		throw new RangeError('Invalid maxQueries');
	if (text.length > 12000) throw new InvalidPlanError('Query plan too large');
	let value: unknown;
	try {
		value = JSON.parse(
			text
				.trim()
				.replace(/^```(?:json)?\s*/, '')
				.replace(/\s*```$/, '')
		);
	} catch {
		throw new InvalidPlanError('Invalid query JSON');
	}
	if (!value || typeof value !== 'object')
		throw new InvalidPlanError('Invalid query plan');
	const plan = value as Record<string, unknown>;
	const string = (input: unknown, max: number) => {
		if (typeof input !== 'string' || !input.trim() || input.length > max)
			throw new InvalidPlanError('Invalid query text');
		return input.trim();
	};
	const list = (input: unknown, min: number, max: number, length: number) => {
		if (!Array.isArray(input) || input.length < min || input.length > max)
			throw new InvalidPlanError('Invalid query terms');
		return [...new Set(input.map((term) => string(term, length)))];
	};
	const standaloneQuery = string(plan.standaloneQuery, 1000);
	const primaryTerms = list(plan.primaryTerms, 1, 4, 80);
	const relatedTerms = list(plan.relatedTerms, 0, 6, 80);
	const queries = list(plan.queries, 1, 3, 300);
	// Core terms are always searched first; alternatives do not dilute their coverage.
	const seen = new Set<string>();
	const selected = [primaryTerms.join(' '), ...queries]
		.filter((query) => {
			const key = query
				.normalize('NFKC')
				.toLowerCase()
				.replace(/\s+/g, ' ')
				.trim();
			if (seen.has(key)) return false;
			seen.add(key);
			return true;
		})
		.slice(0, maxQueries);
	return { standaloneQuery, primaryTerms, relatedTerms, queries: selected };
}

async function withDeadline<T>(
	action: (signal: AbortSignal) => Promise<T> | T,
	milliseconds: number,
	parent?: AbortSignal
): Promise<T> {
	parent?.throwIfAborted();
	const controller = new AbortController();
	let timer: ReturnType<typeof setTimeout> | undefined;
	let onAbort: () => void = () => {};
	const interrupted = new Promise<never>((_, reject) => {
		onAbort = () => {
			controller.abort(parent?.reason);
			reject(parent?.reason ?? new Error('Aborted'));
		};
		parent?.addEventListener('abort', onAbort, { once: true });
		timer = setTimeout(() => {
			const error = new DeadlineError('Operation timed out');
			controller.abort(error);
			reject(error);
		}, milliseconds);
	});
	try {
		return await Promise.race([
			Promise.resolve().then(() => {
				controller.signal.throwIfAborted();
				return action(controller.signal);
			}),
			interrupted
		]);
	} finally {
		clearTimeout(timer);
		parent?.removeEventListener('abort', onAbort);
	}
}

function assembleRagContext<T extends RagDocument>(
	hits: readonly SearchHit<T>[],
	options: { maxChars?: number; rules?: readonly string[] } = {}
) {
	const { maxChars = 6500, rules = [] } = options;
	if (!Number.isInteger(maxChars) || maxChars < 1024)
		throw new RangeError('Context budget must be at least 1024 characters');
	const policy = [...RETRIEVAL_RULES, ...rules].join('\n');
	const header = `${policy}\n${RETRIEVAL_DATA_LABEL}\n`;
	if (header.length > maxChars - 100)
		throw new RangeError('Context rules exceed budget');
	if (!hits.length)
		return {
			context: `${header}[]\n${EMPTY_RETRIEVAL_NOTICE}`,
			includedCount: 0
		};
	const sources: Array<{
		id: number;
		title: string;
		url: string;
		description: string;
		sourceType: string;
		page?: number;
		date?: string;
		excerpt: string;
	}> = [];
	for (const { document, excerpt } of hits) {
		const source = {
			id: sources.length + 1,
			title: document.title.slice(0, 180),
			url: document.url,
			description: document.description.slice(0, 250),
			sourceType: document.sourceType ?? 'article',
			page: document.page,
			date: document.date || undefined,
			excerpt: excerpt.slice(0, 1002)
		};
		// Binary search the serialized budget; escaping can use multiple characters.
		const fits = (length: number) =>
			header.length +
				JSON.stringify([
					...sources,
					{ ...source, excerpt: source.excerpt.slice(0, length) }
				]).length <=
			maxChars;
		if (!fits(0)) break;
		let low = 0,
			high = source.excerpt.length;
		while (low < high) {
			const middle = Math.ceil((low + high) / 2);
			if (fits(middle)) low = middle;
			else high = middle - 1;
		}
		if (source.excerpt.length && !low) break;
		source.excerpt = source.excerpt.slice(0, low);
		sources.push(source);
	}
	return {
		context: header + JSON.stringify(sources),
		includedCount: sources.length
	};
}

export function buildRagContext<T extends RagDocument>(
	hits: readonly SearchHit<T>[],
	options: { maxChars?: number; rules?: readonly string[] } = {}
): string {
	return assembleRagContext(hits, options).context;
}

export function createRagPipeline<T extends RagDocument>(
	options: RagOptions<T>
) {
	const {
		retrieve,
		getSourceKey = (doc) => doc.id,
		generateQueryPlan,
		plannerTimeoutMs = 3500,
		retrievalTimeoutMs = 1500,
		maxQueries = 3,
		candidatesPerQuery = 8,
		maxSources = 4,
		maxContextChars = 6500,
		contextRules = []
	} = options;
	for (const [name, value, max] of [
		['maxQueries', maxQueries, 3],
		['candidatesPerQuery', candidatesPerQuery, 30],
		['maxSources', maxSources, 10]
	] as const) {
		if (!Number.isInteger(value) || value < 1 || value > max)
			throw new RangeError(`Invalid ${name}`);
	}
	if (
		!Number.isFinite(plannerTimeoutMs) ||
		plannerTimeoutMs <= 0 ||
		!Number.isFinite(retrievalTimeoutMs) ||
		retrievalTimeoutMs <= 0
	)
		throw new RangeError('Invalid timeout');
	return {
		async retrieve(input: RagInput) {
			input.signal?.throwIfAborted();
			const question = input.question.trim().slice(0, 1000);
			const history = (input.history ?? [])
				.filter(
					(message) => message.role === 'user' || message.role === 'assistant'
				)
				.slice(-4)
				.map((message) => ({ ...message, text: message.text.slice(0, 600) }));
			const trace: RagTrace = { phase: 'planning', routes: [] };
			const emit = () =>
				input.onEvent?.({
					...trace,
					primaryTerms: trace.primaryTerms
						? [...trace.primaryTerms]
						: undefined,
					relatedTerms: trace.relatedTerms
						? [...trace.relatedTerms]
						: undefined,
					routes: trace.routes.map((route) => ({ ...route })),
					fusion: trace.fusion ? { ...trace.fusion } : undefined
				});
			emit();
			const previous =
				history.findLast((message) => message.role === 'user')?.text ?? '';
			const fallbackQuery =
				/^(那|那么|它|这个|这种|该|还有|继续|上面|刚才)/.test(question)
					? `${question} ${previous.slice(0, 500)}`.trim()
					: question;
			let plan: QueryPlan = {
				standaloneQuery: fallbackQuery,
				primaryTerms: [],
				relatedTerms: [],
				queries: question ? [fallbackQuery] : []
			};
			if (generateQueryPlan && question) {
				try {
					const response = await withDeadline(
						(signal) =>
							generateQueryPlan({
								...buildQueryPlannerRequest(question, history),
								signal
							}),
						plannerTimeoutMs,
						input.signal
					);
					plan = parseQueryPlan(response, maxQueries);
				} catch (error) {
					input.signal?.throwIfAborted();
					trace.fallback =
						error instanceof DeadlineError
							? 'planner-timeout'
							: error instanceof InvalidPlanError
								? 'planner-invalid'
								: 'planner-error';
				}
			} else trace.fallback = 'disabled';
			trace.standaloneQuery = plan.standaloneQuery;
			trace.primaryTerms = plan.primaryTerms;
			trace.relatedTerms = plan.relatedTerms;
			trace.phase = 'retrieving';
			trace.routes = plan.queries.map((query, index) => ({
				id: `query-${index + 1}`,
				query,
				status: 'pending'
			}));
			emit();
			const routes = await Promise.all(
				trace.routes.map(async (route) => {
					const start = Date.now();
					route.status = 'running';
					emit();
					try {
						const hits = await withDeadline(
							(signal) =>
								retrieve(route.query, { limit: candidatesPerQuery, signal }),
							retrievalTimeoutMs,
							input.signal
						);
						const bounded = hits.slice(0, candidatesPerQuery);
						route.status = 'complete';
						route.hitCount = bounded.length;
						return {
							id: route.id,
							weight: route.id === 'query-1' ? 1 : 0.7,
							hits: bounded
						};
					} catch {
						input.signal?.throwIfAborted();
						route.status = 'error';
						route.hitCount = 0;
						return {
							id: route.id,
							weight: route.id === 'query-1' ? 1 : 0.7,
							hits: []
						};
					} finally {
						route.durationMs = Date.now() - start;
						if (!input.signal?.aborted) emit();
					}
				})
			);
			input.signal?.throwIfAborted();
			if (
				trace.routes.length &&
				trace.routes.every((route) => route.status === 'error')
			)
				throw new Error('All retrieval routes failed');
			trace.phase = 'fusing';
			emit();
			const candidateHits = fuseSearchResults(routes, {
				getSourceKey,
				limit: maxSources
			});
			const evidence = assembleRagContext(candidateHits, {
				maxChars: maxContextChars,
				rules: contextRules
			});
			const hits = candidateHits.slice(0, evidence.includedCount);
			trace.fusion = {
				candidateCount: routes.reduce(
					(total, route) => total + route.hits.length,
					0
				),
				uniqueCount: new Set(
					routes.flatMap((route) =>
						route.hits.map((hit) => getSourceKey(hit.document))
					)
				).size,
				selectedCount: hits.length
			};
			const context = evidence.context;
			const sources: RagSource[] = hits.map(({ document }) => ({
				slug: document.id,
				title: document.title.slice(0, 180),
				url: document.url,
				description: document.description.slice(0, 160)
			}));
			trace.phase = 'complete';
			emit();
			return { hits, sources, context, trace };
		}
	};
}

export {
	generateSuggestions,
	buildSuggestionsPrompt,
	parseSuggestions,
	type Suggestions,
	type SuggestionsInput,
	type SuggestionsRequest
} from './suggestions.js';
