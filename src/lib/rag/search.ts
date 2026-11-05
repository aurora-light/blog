import {
	createSearchIndex,
	searchDocuments,
	type IndexedDocument
} from '@leslie/search-core';

export { getSearchTerms } from '@leslie/search-core';
export { buildRetrievalQuery } from '@leslie/search-core/rag';
import { buildRagContext } from '@leslie/search-core/rag';

export type ArticleDocument = {
	slug: string;
	title: string;
	url: string;
	description: string;
	tags: string[];
	date: string;
	content: string;
	// JSON imports widen string literals; only the explicit "pdf" marker opts in.
	sourceType?: string;
	page?: number;
};

type SearchArticle = ArticleDocument & { id: string };
export type ArticleHit = {
	article: ArticleDocument;
	score: number;
	excerpt: string;
};

export function buildSearchIndex(documents: ArticleDocument[]) {
	return createSearchIndex(
		documents.map((article) => ({ ...article, id: article.slug }))
	);
}

export function searchArticles(
	index: IndexedDocument<SearchArticle>[],
	query: string,
	limit = 4
): ArticleHit[] {
	if (limit <= 0) return [];
	return searchDocuments(index, query, {
		limit: Math.min(limit, 4),
		deduplicateBy: (article) =>
			article.sourceType === 'pdf' ? article.url : undefined
	}).map(({ document, score, excerpt }) => ({
		article: document,
		score,
		excerpt
	}));
}

export function buildArticleContext(hits: ArticleHit[]): string {
	return buildRagContext(
		hits.slice(0, 4).map(({ article, score, excerpt }) => ({
			document: { ...article, id: article.slug },
			score,
			excerpt,
			matchedTerms: []
		}))
	);
}
