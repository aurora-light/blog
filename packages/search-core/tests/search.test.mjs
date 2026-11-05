import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	createSearchEngine,
	createSearchIndex,
	searchDocuments,
	getSearchTerms,
	defaultSearchFields
} from '../dist/index.js';
const document = (id, overrides = {}) => ({
	id,
	title: '',
	description: '',
	content: '',
	tags: [],
	...overrides
});

test('Default weights, coverage, stable ordering and multilingual tokens', () => {
	const docs = [
		document('body', { content: 'Redis cache' }),
		document('title', { title: 'Redis cache' }),
		document('new', { title: 'Redis cache', date: '2026-11-04' })
	];
	const engine = createSearchEngine(docs);
	const hits = engine.search('Redis cache');
	assert.deepEqual(
		hits.map((h) => h.document.id),
		['new', 'title', 'body']
	);
	assert.equal(hits[0].score, 20);
	assert.equal(hits[2].score, 2);
	assert.deepEqual(hits[0].matchedTerms, ['redis', 'cache']);
	assert.equal(engine.search('Redis 飞船 轨道 参数').length, 0);
	assert.equal(engine.search('的 什么').length, 0);
	assert.equal(engine.search('').length, 0);
	for (const word of ['next.js', 'c++', 'scope/package'])
		assert.ok(getSearchTerms(word).includes(word));
});

test('Custom fields can index summaries and key points, and change ranking', () => {
	const docs = [
		document('title', { title: 'SSR' }),
		document('points', { keyPoints: ['SSR'] })
	];
	const original = JSON.stringify(docs);
	const fields = [
		...defaultSearchFields(),
		{
			name: 'keyPoints',
			weight: 30,
			getText: (doc) => (doc.keyPoints ?? []).join(' ')
		}
	];
	const engine = createSearchEngine(docs, { fields });
	assert.equal(engine.search('SSR')[0].document.id, 'points');
	assert.equal(engine.search('SSR')[0].score, 30);
	assert.equal(JSON.stringify(docs), original);
	assert.equal(createSearchEngine(docs).search('SSR')[0].document.id, 'title');
});

test('Custom tokenizer supports domain vocabulary, with tunable coverage and term normalization', () => {
	const engine = createSearchEngine(
		[document('ssr', { content: 'SSR 渲染' })],
		{
			tokenize: (query) =>
				query.includes('服务端') ? ['SSR', 'ssr', ''] : getSearchTerms(query)
		}
	);
	const hit = engine.search('如何服务端渲染')[0];
	assert.equal(hit.document.id, 'ssr');
	assert.deepEqual(hit.matchedTerms, ['ssr']);
	const index = createSearchIndex([document('one', { content: 'Redis' })]);
	assert.equal(searchDocuments(index, 'Redis cache').length, 0);
	assert.equal(
		searchDocuments(index, 'Redis cache', {
			minimumMatchedTerms: 1,
			minimumMatchRatio: 0
		}).length,
		1
	);
});

test('Custom reranking and deduplication run before the result limit', () => {
	const docs = [
		document('a', { title: 'React', url: '/same' }),
		document('b', { title: 'React', url: '/same' }),
		document('c', { content: 'React', url: '/other' })
	];
	const engine = createSearchEngine(docs, {
		deduplicateBy: (doc) => doc.url,
		limit: 2
	});
	assert.deepEqual(
		engine.search('React').map((h) => h.document.id),
		['a', 'c']
	);
	assert.deepEqual(
		engine
			.search('React', { rerank: (hits) => [...hits].reverse(), limit: 1 })
			.map((h) => h.document.id),
		['c']
	);
	assert.deepEqual(engine.search('React', { limit: 0 }), []);
	assert.equal(
		createSearchEngine(docs).search('React', { limit: 10 }).length,
		3
	);
});

test('Excerpts find late evidence without changing original text or exceeding the budget', () => {
	const content =
		'普通正文。'.repeat(500) + 'Redis cache。' + '后续正文。'.repeat(100);
	const [hit] = createSearchEngine([document('late', { content })]).search(
		'Redis cache',
		{ excerptLength: 120, excerptContext: 20 }
	);
	assert.ok(hit.excerpt.includes('Redis cache'));
	assert.ok(hit.excerpt.length <= 122);
	assert.equal(hit.document.content, content);
});

test('Invalid weights and query budgets are rejected instead of silently misbehaving', () => {
	assert.throws(
		() =>
			createSearchIndex([], [{ name: 'bad', weight: -1, getText: () => '' }]),
		RangeError
	);
	const engine = createSearchEngine([]);
	for (const options of [
		{ limit: -1 },
		{ limit: NaN },
		{ limit: 1.5 },
		{ minimumMatchRatio: 2 },
		{ minimumMatchedTerms: 0 },
		{ excerptLength: 0 },
		{ excerptLength: 100, excerptContext: 100 }
	]) {
		assert.throws(() => engine.search('React', options), RangeError);
	}
});
