import { BLOG_RETRIEVAL_RULES } from '@/lib/prompts';
import 'server-only';
import articleIndex from '@/generated/article-index.json';
import { searchDocuments } from '@leslie/search-core';
import {
	createRagInput,
	createRagPipeline,
	buildRagContext,
	type QueryPlanner,
	type RagMessage,
	type RagTrace
} from '@leslie/search-core/rag';
import { buildSearchIndex } from './search';

// Only the deployed corpus is cached. Plans, traces and history stay per request.
let cachedIndex: ReturnType<typeof buildSearchIndex> | undefined;

export async function getBlogContext(messages: readonly RagMessage[]) {
	return (await getBlogRetrieval(messages)).context;
}

export function getBlogSuggestionKnowledge(
	question: string,
	sourceSlugs: string[]
) {
	const selected = articleIndex.documents
		.filter((document) => sourceSlugs.includes(document.slug))
		.slice(0, 4);
	const documents = selected.map((document) => ({
		...document,
		id: document.slug
	}));
	const matches = searchDocuments(buildSearchIndex(selected), question, {
		limit: 4,
		minimumMatchedTerms: 1,
		minimumMatchRatio: 0
	});
	const hits = matches.length
		? matches
		: documents.map((document) => ({
				document,
				score: 0,
				matchedTerms: [],
				excerpt: document.content.slice(0, 1000)
			}));
	return { context: buildRagContext(hits), hasEvidence: hits.length > 0 };
}

export async function getBlogRetrieval(
	messages: readonly RagMessage[],
	options: {
		generateQueryPlan?: QueryPlanner;
		signal?: AbortSignal;
		onEvent?: (trace: RagTrace) => void;
	} = {}
) {
	cachedIndex ??= buildSearchIndex(articleIndex.documents);
	const index = cachedIndex;
	const pipeline = createRagPipeline({
		generateQueryPlan: options.generateQueryPlan,
		retrieve: (query, { limit }) =>
			searchDocuments(index, query, {
				limit,
				deduplicateBy: (document) =>
					document.sourceType === 'pdf' ? document.url : undefined
			}),
		getSourceKey: (document) =>
			document.sourceType === 'pdf' ? document.url : document.id,
		contextRules: BLOG_RETRIEVAL_RULES
	});
	return pipeline.retrieve({
		...createRagInput(messages),
		signal: options.signal,
		onEvent: options.onEvent
	});
}
