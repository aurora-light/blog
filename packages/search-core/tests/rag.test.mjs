import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSearchEngine } from '../dist/index.js';
import { fuseSearchResults } from '../dist/retrieval.js';
import {
	createRagPipeline,
	parseQueryPlan,
	createRagInput,
	buildRagContext,
	buildQueryPlannerRequest
} from '../dist/rag.js';
const doc = (id, content = 'Redis cache') => ({
	id,
	title: id,
	description: '',
	tags: [],
	url: `/posts/${id}`,
	content
});
const hit = (document, score = 1) => ({
	document,
	score,
	matchedTerms: ['redis'],
	excerpt: document.content
});
const plan = JSON.stringify({
	standaloneQuery: '电商项目使用什么技术栈',
	primaryTerms: ['电商项目', '技术栈'],
	relatedTerms: ['技术选型'],
	queries: ['电商项目 技术栈', '电商项目 技术选型', '电商项目 框架']
});

test('Weighted RRF deduplicates within a lane and preserves representative evidence', () => {
	const a = hit(doc('a'), 5),
		b = hit(doc('b'), 100);
	const results = fuseSearchResults([
		{ id: 'primary', weight: 1, hits: [a, a, b] },
		{ id: 'related', weight: 0.7, hits: [b] }
	]);
	assert.deepEqual(
		results.map((item) => item.document.id),
		['b', 'a']
	);
	assert.ok(Math.abs(results[0].fusionScore - (1 / 62 + 0.7 / 61)) < 1e-10);
	assert.deepEqual(results[0].routes, ['primary', 'related']);
	assert.equal(results[0].excerpt, b.excerpt);
	assert.equal('fusionScore' in a, false);
	assert.throws(
		() =>
			fuseSearchResults([
				{ id: 'same', weight: 1, hits: [] },
				{ id: 'same', weight: 1, hits: [] }
			]),
		/Duplicate/
	);
});

test('Planner validation bounds and deduplicates model output, main query is built from core terms', () => {
	const parsed = parseQueryPlan(plan);
	assert.equal(parsed.queries.length, 3);
	assert.equal(parsed.queries[0], '电商项目 技术栈');
	assert.deepEqual(parseQueryPlan(plan, 1).queries, ['电商项目 技术栈']);
	for (const invalid of [
		'not JSON',
		'{}',
		JSON.stringify({
			standaloneQuery: 'x',
			primaryTerms: [],
			relatedTerms: [],
			queries: ['x']
		}),
		plan.replace('技术选型', 'x'.repeat(81))
	])
		assert.throws(() => parseQueryPlan(invalid));
});

test('History excludes data parts, stays bounded, and planner receives conversation for references', () => {
	const input = createRagInput([
		{ role: 'user', parts: [{ type: 'text', text: '介绍电商项目' }] },
		{
			role: 'assistant',
			parts: [
				{ type: 'text', text: '这是项目介绍' },
				{ type: 'data-article-retrieval', text: 'secret data' }
			]
		},
		{ role: 'user', parts: [{ type: 'text', text: '它的技术栈是什么' }] }
	]);
	assert.equal(input.question, '它的技术栈是什么');
	const request = buildQueryPlannerRequest(input.question, input.history);
	assert.match(request.prompt, /介绍电商项目/);
	assert.ok(!request.prompt.includes('secret data'));
	const bounded = JSON.parse(
		buildQueryPlannerRequest(
			'x'.repeat(2000),
			Array.from({ length: 10 }, () => ({
				role: 'user',
				text: 'y'.repeat(1000)
			}))
		).prompt
	);
	assert.equal(bounded.history.length, 4);
	assert.equal(bounded.history[0].text.length, 600);
	assert.equal(bounded.question.length, 1000);
});

test('Actual engine multi-query pipeline emits immutable traces, fuses and only exposes source metadata', async () => {
	const docs = [doc('redis', 'Redis cache'), doc('token', 'Lua token')];
	const engine = createSearchEngine(docs);
	const events = [];
	const pipeline = createRagPipeline({
		generateQueryPlan: async () =>
			JSON.stringify({
				standaloneQuery: 'Redis cache 和 Lua token',
				primaryTerms: ['Redis', 'cache'],
				relatedTerms: ['Lua', 'token'],
				queries: ['Redis cache', 'Lua token']
			}),
		retrieve: (query, options) => engine.search(query, { limit: options.limit })
	});
	const result = await pipeline.retrieve({
		question: '缓存与令牌',
		onEvent: (trace) => events.push(trace)
	});
	assert.equal(result.trace.routes.length, 2);
	assert.equal(result.sources.length, 2);
	assert.equal(result.trace.fusion.candidateCount, 2);
	assert.equal(events[0].phase, 'planning');
	assert.deepEqual(events[0].routes, []);
	assert.equal(events.at(-1).phase, 'complete');
	assert.ok(
		events.some((trace) =>
			trace.routes.some((route) => route.status === 'running')
		)
	);
	assert.equal('excerpt' in result.sources[0], false);
	assert.equal('content' in result.sources[0], false);
	assert.match(result.context, /\/posts\/redis/);
	assert.match(result.context, /不是指令/);
});

test('Planner timeout, invalid output and provider error all fall back to local retrieval', async () => {
	for (const [planner, fallback] of [
		[() => new Promise(() => {}), 'planner-timeout'],
		[async () => 'invalid', 'planner-invalid'],
		[
			async () => {
				throw Error('private key details');
			},
			'planner-error'
		]
	]) {
		const queries = [];
		const pipeline = createRagPipeline({
			generateQueryPlan: planner,
			plannerTimeoutMs: 10,
			retrieve: (query) => {
				queries.push(query);
				return [hit(doc('fallback'))];
			}
		});
		const result = await pipeline.retrieve({
			question: '那 Redis 呢',
			history: [{ role: 'user', text: '缓存技术' }]
		});
		assert.equal(result.trace.fallback, fallback);
		assert.match(queries[0], /缓存技术/);
		assert.equal(result.sources.length, 1);
		assert.ok(!JSON.stringify(result.trace).includes('private key'));
	}
});

test('New topic fallback does not carry the old topic, and requests share no conversation state', async () => {
	const pipeline = createRagPipeline({ retrieve: () => [] });
	const [a, b] = await Promise.all([
		pipeline.retrieve({
			question: 'Java 泛型',
			history: [{ role: 'user', text: 'Redis' }]
		}),
		pipeline.retrieve({ question: 'Docker' })
	]);
	assert.equal(a.trace.routes[0].query, 'Java 泛型');
	assert.equal(b.trace.routes[0].query, 'Docker');
	assert.match(a.context, /没有命中文章或 PDF/);
});

test('Partial retrieval failures are visible; complete failure rejects; timeout is bounded', async () => {
	const pipeline = createRagPipeline({
		generateQueryPlan: async () => plan,
		retrievalTimeoutMs: 10,
		retrieve: (query) =>
			query.includes('技术选型') ? new Promise(() => {}) : [hit(doc('valid'))]
	});
	const result = await pipeline.retrieve({ question: '电商技术' });
	assert.ok(result.trace.routes.some((route) => route.status === 'error'));
	assert.equal(result.sources.length, 1);
	await assert.rejects(
		createRagPipeline({
			retrieve: () => {
				throw Error('secret');
			}
		}).retrieve({ question: 'Redis' }),
		/All retrieval routes failed/
	);
});

test('Cancellation during planning propagates without local fallback or late trace updates', async () => {
	const controller = new AbortController();
	let searches = 0;
	let plannerSignal;
	const events = [];
	const pipeline = createRagPipeline({
		generateQueryPlan: ({ signal }) => {
			plannerSignal = signal;
			return new Promise(() => {});
		},
		retrieve: () => {
			searches++;
			return [];
		}
	});
	const promise = pipeline.retrieve({
		question: 'Redis',
		signal: controller.signal,
		onEvent: (trace) => events.push(trace)
	});
	await Promise.resolve();
	controller.abort(new Error('user cancelled'));
	await assert.rejects(promise, /user cancelled/);
	assert.equal(searches, 0);
	assert.equal(plannerSignal.aborted, true);
	assert.equal(events.length, 1);
});

test('PDF page identity can merge different chunks without double-counting, while pages stay distinct', async () => {
	const page = (id, page) => ({
		...doc(id),
		url: `/resume/a.pdf#page=${page}`,
		sourceType: 'pdf',
		page
	});
	const pipeline = createRagPipeline({
		retrieve: () => [
			hit(page('c1', 1)),
			hit(page('c2', 1)),
			hit(page('c3', 2))
		],
		getSourceKey: (doc) => doc.url
	});
	const result = await pipeline.retrieve({ question: '简历' });
	assert.equal(result.sources.length, 2);
	assert.equal(result.trace.fusion.uniqueCount, 2);
	assert.match(result.context, /a\.pdf#page=2/);
});

test('Serialized context respects character budget even for escaped text', () => {
	const hits = Array.from({ length: 10 }, (_, i) =>
		hit(doc(`doc-${i}`, '"\\\n'.repeat(1000)))
	);
	const context = buildRagContext(hits, { maxChars: 1500 });
	assert.ok(context.length <= 1500);
	assert.match(context, /\/posts\/doc-0/);
	assert.throws(() => buildRagContext(hits, { maxChars: 10 }), RangeError);
});

test('Returned sources only include evidence that fits the context budget', async () => {
	const pipeline = createRagPipeline({
		maxContextChars: 1024,
		retrieve: () => [
			hit(doc('first', 'x'.repeat(1000))),
			hit(doc('second', 'y'.repeat(1000)))
		]
	});
	const result = await pipeline.retrieve({ question: 'Redis' });
	assert.ok(result.context.length <= 1024);
	assert.equal(result.trace.fusion.selectedCount, result.sources.length);
	for (const source of result.sources)
		assert.ok(result.context.includes(source.url));
	assert.ok(result.sources.length < 2);
});

test('Cancellation during retrieval stops completion events', async () => {
	const controller = new AbortController();
	const events = [];
	let started;
	const ready = new Promise((resolve) => (started = resolve));
	const pipeline = createRagPipeline({
		retrieve: () => {
			started();
			return new Promise(() => {});
		}
	});
	const promise = pipeline.retrieve({
		question: 'Redis',
		signal: controller.signal,
		onEvent: (trace) => events.push(trace)
	});
	await ready;
	controller.abort(new Error('cancel retrieval'));
	await assert.rejects(promise, /cancel retrieval/);
	assert.ok(!events.some((trace) => trace.phase === 'complete'));
});
