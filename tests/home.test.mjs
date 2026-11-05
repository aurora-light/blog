import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import { allPosts } from '../.contentlayer/generated/index.mjs';
const compiledModule = { exports: {} };
const source = await fs.readFile(
	new URL('../src/lib/article-categories.ts', import.meta.url),
	'utf8'
);
vm.runInNewContext(
	ts.transpileModule(source, {
		compilerOptions: {
			module: ts.ModuleKind.CommonJS,
			target: ts.ScriptTarget.ES2022
		}
	}).outputText,
	{ module: compiledModule, exports: compiledModule.exports }
);
const {
	getArticleCategory,
	filterHomeArticles,
	articleCategories,
	getArticleCategoryHref,
	getArticleCategoryFromHash,
	getAdjacentArticles
} = compiledModule.exports;

test('Category links restore the homepage filter and reject unknown categories', () => {
	for (const { id } of articleCategories) {
		const href = getArticleCategoryHref(id);
		assert.equal(getArticleCategoryFromHash(href.slice(1)), id);
	}
	for (const hash of ['', '#unknown', '#category=invalid']) {
		assert.equal(getArticleCategoryFromHash(hash), 'all');
	}
});

test('Adjacent articles use date order, exclude about and preserve the source order', () => {
	const articles = [
		{ slug: 'old', date: '2024-01-01' },
		{ slug: 'about', date: '2026-01-01' },
		{ slug: 'new', date: '2025-01-01' },
		{ slug: 'middle', date: '2024-06-01' }
	];
	const original = articles.map((article) => article.slug).join(',');
	const middle = getAdjacentArticles(articles, 'middle');
	assert.equal(middle.previous.slug, 'new');
	assert.equal(middle.next.slug, 'old');
	assert.equal(getAdjacentArticles(articles, 'new').previous, undefined);
	assert.equal(getAdjacentArticles(articles, 'old').next, undefined);
	assert.equal(getAdjacentArticles(articles, 'missing').next, undefined);
	assert.equal(articles.map((article) => article.slug).join(','), original);
});

test('Article classification prefers actual tags and keeps AI, backend, web and journals distinct', () => {
	assert.equal(
		getArticleCategory({ title: 'Next.js RAG', tags: ['AI', 'Next.js'] }),
		'ai'
	);
	assert.equal(
		getArticleCategory({ title: '前端学习 Redis', tags: ['redis', '笔记'] }),
		'backend'
	);
	assert.equal(
		getArticleCategory({ title: 'React 框架新闻', tags: ['Vue', 'Vite'] }),
		'engineering'
	);
	assert.equal(
		getArticleCategory({ title: 'React Ref', tags: ['react'] }),
		'web'
	);
	assert.equal(
		getArticleCategory({ title: '2024 碎碎念', tags: ['年度总结\r', 2024] }),
		'life'
	);
	assert.equal(getArticleCategory({ title: '新文章', tags: [] }), 'reading');
});

test('Every real published post has exactly one visible category and no article is lost', () => {
	const posts = allPosts.filter((post) => post.slug !== 'about');
	const categories = new Set(
		articleCategories
			.filter((category) => category.id !== 'all')
			.map((category) => category.id)
	);
	const counts = new Map();
	for (const post of posts) {
		const category = getArticleCategory(post);
		assert.ok(categories.has(category), post.slug);
		counts.set(category, (counts.get(category) ?? 0) + 1);
	}
	assert.equal(
		[...counts.values()].reduce((a, b) => a + b, 0),
		posts.length
	);
	assert.equal(counts.size, 6);
});

test('Category and search filters combine, normalize numeric tags and return empty on no matches', () => {
	const articles = allPosts
		.filter((post) => post.slug !== 'about')
		.map((post) => ({
			...post,
			description: post.description ?? '',
			tags: (post.tags ?? []).map((tag) => String(tag).trim()),
			category: getArticleCategory(post)
		}));
	assert.equal(filterHomeArticles(articles, 'all', '').length, articles.length);
	assert.ok(
		filterHomeArticles(articles, 'backend', 'redis').every(
			(post) => post.category === 'backend'
		)
	);
	assert.ok(
		filterHomeArticles(articles, 'backend', 'redis').some(
			(post) => post.slug === 'java-redis-sms-rate-limit'
		)
	);
	assert.equal(
		filterHomeArticles(articles, 'web', 'ＲＥＡＣＴ').length,
		filterHomeArticles(articles, 'web', 'react').length
	);
	assert.equal(filterHomeArticles(articles, 'ai', '火星探测器xyz').length, 0);
});
