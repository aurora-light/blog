import articleIndex from '@/generated/article-index.json';
import {
	getArticleCategory,
	type SearchArticle
} from '@/lib/article-categories';
import {
	createSearchIndex,
	searchDocuments,
	matchesSearchText
} from '@leslie/search-core';
import { allPosts } from 'contentlayer2/generated';

const contentBySlug = new Map(
	articleIndex.documents
		.filter((document) => document.sourceType !== 'pdf')
		.map((document) => [document.slug, document.content])
);
const documents = allPosts
	.filter((post) => post.slug !== 'about')
	.sort((a, b) => b.date.localeCompare(a.date))
	.map((post) => ({
		id: post.slug,
		slug: post.slug,
		title: post.title,
		url: `/posts/${encodeURIComponent(post.slug)}`,
		cover: post.cover,
		category: getArticleCategory(post),
		description: post.description ?? '',
		tags: (post.tags ?? []).map(String),
		date: post.date,
		content: contentBySlug.get(post.slug) ?? ''
	}));
const index = createSearchIndex(documents);

export function GET(request: Request) {
	const { searchParams } = new URL(request.url);
	const query = (searchParams.get('q') ?? '')
		.normalize('NFKC')
		.trim()
		.replace(/\s+/g, ' ')
		.toLowerCase()
		.slice(0, 200);
	const defaultLimit = query ? 24 : 8;
	const requestedLimit = Number(searchParams.get('limit') ?? defaultLimit);
	const limit = Number.isFinite(requestedLimit)
		? Math.max(1, Math.min(50, Math.floor(requestedLimit)))
		: defaultLimit;

	let matches = documents.slice(0, limit);
	if (query) {
		const titleMatches = index
			.filter((item) => matchesSearchText(item.normalizedTitle, query))
			.map((item) => item.document);
		const ranked = searchDocuments(index, query, { limit });
		const unique = new Map(titleMatches.map((doc) => [doc.id, doc]));
		for (const { document } of ranked) unique.set(document.id, document);
		matches = [...unique.values()].slice(0, limit);
	}

	const results: SearchArticle[] = matches.map(
		({ slug, title, url, cover, category }) => ({
			slug,
			title,
			url,
			cover,
			category
		})
	);
	return Response.json({ results });
}
