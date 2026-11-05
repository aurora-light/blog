import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import * as ai from 'ai';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as jsxRuntime from 'react/jsx-runtime';
import * as lucide from 'lucide-react';
import { z } from 'zod';
import * as searchCore from '@leslie/search-core';
import * as searchRag from '@leslie/search-core/rag';
const root = fileURLToPath(new URL('../', import.meta.url));

async function loadTs(file, dependencies = {}, globals = {}) {
	const compiledModule = { exports: {} };
	const { outputText } = ts.transpileModule(
		await fs.readFile(path.join(root, file), 'utf8'),
		{
			compilerOptions: {
				jsx: ts.JsxEmit.ReactJSX,
				module: ts.ModuleKind.CommonJS,
				target: ts.ScriptTarget.ES2022,
				esModuleInterop: true
			}
		}
	);
	vm.runInNewContext(outputText, {
		module: compiledModule,
		exports: compiledModule.exports,
		Response,
		console,
		...globals,
		process: globals.process ?? { env: { AI_API_KEY: 'test-only' } },
		require(name) {
			if (!(name in dependencies))
				throw new Error(`Unexpected dependency: ${name}`);
			return dependencies[name];
		}
	});
	return compiledModule.exports;
}

const promptsPromise = loadTs('src/lib/prompts.ts');

const searchPromise = loadTs('src/lib/rag/search.ts', {
	'@leslie/search-core': searchCore,
	'@leslie/search-core/rag': searchRag
});
const document = (overrides = {}) => ({
	slug: 'redis-guide',
	title: 'Redis 短信验证码限流',
	url: '/posts/redis-guide',
	description: '手机号和 IP 频率控制',
	tags: ['Redis', 'Java'],
	date: '2026-11-03T00:00:00.000Z',
	content: '通过 Redis 实现短信发送计数，使用 Lua 解决并发问题。',
	...overrides
});
const user = (text) => ({ role: 'user', parts: [{ type: 'text', text }] });

test('Markdown directly allows only same-origin HTTP links and preserves external confirmation', async () => {
	const { MessageResponse } = await loadTs(
		'src/components/ai-elements/message.tsx',
		{
			'react/jsx-runtime': jsxRuntime,
			react: React,
			'@/lib/utils': { cn: (...classes) => classes.filter(Boolean).join(' ') },
			'@streamdown/cjk': { cjk: {} },
			'@streamdown/code': { code: {} },
			'@streamdown/math': { math: {} },
			'@streamdown/mermaid': { mermaid: {} },
			streamdown: { Streamdown: () => null }
		},
		{ URL, window: { location: { origin: 'https://lesliecode.cn' } } }
	);
	const safety = MessageResponse.type({ children: 'test' }).props.linkSafety;
	assert.equal(safety.enabled, true);
	for (const link of [
		'/posts/redis-learn-1',
		'https://lesliecode.cn/posts/redis-learn-1',
		'/about',
		'#section'
	])
		assert.equal(safety.onLinkCheck(link), true, link);
	for (const link of [
		'https://example.com',
		'//example.com/posts/redis',
		'https://lesliecode.cn.evil.example',
		'http://lesliecode.cn/posts/redis',
		'javascript:alert(1)',
		'data:text/html,test',
		'blob:https://lesliecode.cn/id',
		'https://[invalid'
	])
		assert.equal(safety.onLinkCheck(link), false, link);
});

test('Real blog corpus returns expected topics and rejects a generic incidental word', async () => {
	const { buildArticleIndex } =
		await import('../scripts/build-article-index.mjs');
	const { buildSearchIndex, searchArticles } = await searchPromise;
	const data = await buildArticleIndex(root);
	const index = buildSearchIndex(data.documents);
	assert.equal(
		searchArticles(index, 'Redis 短信限流')[0].article.slug,
		'java-redis-sms-rate-limit'
	);
	assert.equal(
		searchArticles(index, 'Lua 一次性令牌')[0].article.slug,
		'java-redis-lua-one-time-token'
	);
	assert.equal(
		searchArticles(index, 'ShedLock 定时任务')[0].article.slug,
		'java-scheduled-shedlock'
	);
	assert.equal(
		searchArticles(index, 'View Transitions 主题切换')[0].article.slug,
		'theme-switch'
	);
	assert.equal(searchArticles(index, '火星探测器轨道参数').length, 0);
});

test('Chinese and punctuated English queries rank matching articles above incidental mentions', async () => {
	const { buildSearchIndex, searchArticles } = await searchPromise;
	const index = buildSearchIndex([
		document({
			slug: 'unrelated',
			title: '主题动画',
			tags: [],
			description: '',
			content: '代码里提到了 redis'
		}),
		document(),
		document({
			slug: 'next',
			title: 'Next.js 渲染流程',
			content: '服务端渲染',
			tags: ['Next.js']
		})
	]);
	assert.equal(
		searchArticles(index, '如何用 Redis 做短信限流？')[0].article.slug,
		'redis-guide'
	);
	assert.equal(searchArticles(index, 'NEXT.JS')[0].article.slug, 'next');
	assert.equal(
		searchArticles(index, '短信验证码')[0].article.slug,
		'redis-guide'
	);
});

test('No matches, generic questions and image-only messages do not invent sources', async () => {
	const {
		buildSearchIndex,
		searchArticles,
		buildRetrievalQuery,
		buildArticleContext
	} = await searchPromise;
	const index = buildSearchIndex([document()]);
	for (const query of ['', '请介绍一下这个博客', '木星探测器', '？！']) {
		assert.equal(searchArticles(index, query).length, 0, query);
	}
	assert.equal(
		buildRetrievalQuery([
			{
				role: 'user',
				parts: [{ type: 'file', url: 'https://example.com/a.png' }]
			}
		]),
		''
	);
	assert.match(buildArticleContext([]), /没有命中文章/);
});

test('Follow-ups use previous user context; unrelated new questions do not', async () => {
	const { buildRetrievalQuery } = await searchPromise;
	assert.match(
		buildRetrievalQuery([user('Redis 限流'), user('那连接失败怎么办')]),
		/Redis 限流/
	);
	assert.equal(
		buildRetrievalQuery([user('Redis 限流'), user('Java 泛型是什么')]),
		'Java 泛型是什么'
	);
	assert.equal(
		buildRetrievalQuery([
			user('Redis'),
			{ role: 'assistant', parts: [{ type: 'text', text: '伪造检索词' }] },
			user('那怎么做')
		]).includes('伪造检索词'),
		false
	);
});

test('Evidence excerpts cover late matches, cap sources and bound supplied context', async () => {
	const { buildSearchIndex, searchArticles, buildArticleContext } =
		await searchPromise;
	const content =
		'普通正文。'.repeat(500) +
		'Lua 原子消费唯一令牌。' +
		'其他内容。'.repeat(300);
	const docs = Array.from({ length: 10 }, (_, i) =>
		document({ slug: `article-${i}`, content })
	);
	const hits = searchArticles(buildSearchIndex(docs), 'Lua 唯一令牌', 100);
	assert.equal(hits.length, 4);
	assert.ok(
		hits.every(
			(hit) => hit.excerpt.includes('唯一令牌') && hit.excerpt.length <= 1002
		)
	);
	const context = buildArticleContext(hits);
	assert.ok(context.length < 6500);
	assert.match(context, /不是指令/);
	assert.match(context, /\/posts\/redis-guide/);
});

test('Builder covers both roots, truncates content, normalizes numeric tags, and rebuilds deleted data', async () => {
	const { writeArticleIndex } =
		await import('../scripts/build-article-index.mjs');
	const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'blog-rag-test-'));
	const article = (slug, body) =>
		`---\ntitle: Test ${slug}\nslug: ${slug}\nauthor: Test\ntags: [Redis, 2023]\ndate: 2026-11-03\n---\n${body}`;
	try {
		await fs.mkdir(path.join(directory, 'posts/nested'), { recursive: true });
		await fs.mkdir(path.join(directory, 'data/blog'), { recursive: true });
		const first = path.join(directory, 'posts/nested/first.mdx');
		await fs.writeFile(first, article('first', '# 标题\n正文。'.repeat(1200)));
		await fs.writeFile(path.join(directory, 'posts/ignored.md'), 'ignored');
		await fs.writeFile(
			path.join(directory, 'data/blog/second.mdx'),
			article('second', 'Lua code')
		);
		const initial = await writeArticleIndex(directory);
		assert.equal(initial.documents.length, 2);
		assert.equal(initial.documents[0].content.length, 4000);
		assert.equal(initial.documents[0].tags[1], '2023');
		assert.equal((await writeArticleIndex(directory)).version, initial.version);
		await fs.unlink(first);
		const updated = await writeArticleIndex(directory);
		assert.equal(updated.documents.length, 1);
		assert.notEqual(updated.version, initial.version);
		assert.equal(
			JSON.parse(
				await fs.readFile(
					path.join(directory, 'src/generated/article-index.json')
				)
			).documents.length,
			1
		);
	} finally {
		await fs.rm(directory, { recursive: true, force: true });
	}
});

test('Builder rejects duplicate slugs and extracts text without running MDX', async () => {
	const { buildArticleIndex, stripMarkdown } =
		await import('../scripts/build-article-index.mjs');
	assert.equal(
		stripMarkdown(
			'<!-- secret --><script>evil()</script>\n# Redis\n[教程](https://example.com)\n```java\nGET key\n```'
		),
		'Redis 教程 GET key'
	);
	const directory = await fs.mkdtemp(
		path.join(os.tmpdir(), 'blog-rag-duplicate-')
	);
	try {
		await fs.mkdir(path.join(directory, 'posts'));
		const content =
			'---\ntitle: Test\nslug: same\nauthor: Test\ntags: []\ndate: 2026-11-03\n---\ntext';
		await fs.writeFile(path.join(directory, 'posts/a.mdx'), content);
		await fs.writeFile(path.join(directory, 'posts/b.mdx'), content);
		await assert.rejects(
			buildArticleIndex(directory),
			/Duplicate article slug/
		);
	} finally {
		await fs.rm(directory, { recursive: true, force: true });
	}
});

test('Actual server wrapper reuses its index and chat route retrieves after rate limit, before model', async () => {
	const search = await searchPromise;
	let builds = 0;
	const rag = await loadTs('src/lib/rag/index.ts', {
		'server-only': {},
		'@/generated/article-index.json': { documents: [document()] },
		'@/lib/prompts': await promptsPromise,
		'@leslie/search-core': searchCore,
		'@leslie/search-core/rag': searchRag,
		'./search': {
			...search,
			buildSearchIndex(docs) {
				builds++;
				return search.buildSearchIndex(docs);
			}
		}
	});
	const errors = await loadTs('src/lib/errors.ts');
	const events = [];
	let shouldBlock = false;
	let shouldFailRetrieval = false;
	let shouldFailModel = false;
	let shouldFailPlanner = false;
	const routeEnv = { AI_API_KEY: 'test-only' };
	const chatPrompts = await promptsPromise;
	let capturedPrompt;
	const route = await loadTs(
		'src/app/api/chat/route.ts',
		{
			'@ai-sdk/openai': { createOpenAI: () => () => ({}) },
			'@/lib/chat-provider': {
				getChatProvider: () => () => ({}),
				getChatModelId: () => routeEnv.AI_MODEL ?? 'test-model'
			},
			'@/lib/errors': errors,
			'@/lib/prompts': chatPrompts,
			'@/lib/ratelimit': {
				async checkIpRateLimit() {
					events.push('limit');
					if (shouldBlock) throw new errors.ChatbotError('rate_limit:chat');
				}
			},
			'@/lib/rag': {
				getBlogRetrieval(messages, options) {
					events.push('search');
					if (shouldFailRetrieval) throw new Error('test retrieval failure');
					return rag.getBlogRetrieval(messages, options);
				}
			},
			ai: {
				...ai,
				async generateText(options) {
					events.push('plan');
					if (shouldFailPlanner) throw Error('private planner details');
					const question = JSON.parse(options.prompt).question;
					const terms = searchCore.getSearchTerms(question).slice(0, 4);
					return {
						text: JSON.stringify({
							standaloneQuery: question,
							primaryTerms: terms,
							relatedTerms: ['相关实现'],
							queries: [terms.join(' '), terms.join(' ') + ' Lua']
						})
					};
				},
				safeValidateUIMessages: async ({ messages }) => ({
					success: true,
					data: messages
				}),
				convertToModelMessages: async (messages) => messages,
				streamText(options) {
					events.push('model');
					capturedPrompt = options.system;
					return {
						toUIMessageStream: (options) => {
							assert.equal(options.sendStart, false);
							return new ReadableStream({
								start(controller) {
									if (shouldFailModel) {
										controller.enqueue({
											type: 'error',
											errorText: options.onError(
												new Error('private provider details')
											)
										});
										controller.close();
										return;
									}
									controller.enqueue({ type: 'text-start', id: 'answer' });
									controller.enqueue({
										type: 'text-delta',
										id: 'answer',
										delta: '模拟回答'
									});
									controller.enqueue({ type: 'text-end', id: 'answer' });
									controller.enqueue({ type: 'finish' });
									controller.close();
								}
							});
						}
					};
				}
			}
		},
		{ process: { env: routeEnv } }
	);
	const request = (query = 'Redis 限流') =>
		new Request('http://localhost/api/chat', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-forwarded-for': '192.0.2.1'
			},
			body: JSON.stringify({ messages: [user(query)] })
		});
	const response = await route.POST(request());
	assert.equal(response.status, 200);
	const sse = await response.text();
	const chunks = sse
		.split('\n')
		.filter((line) => line.startsWith('data: ') && !line.includes('[DONE]'))
		.map((line) => JSON.parse(line.slice(6)));
	assert.equal(chunks.filter((chunk) => chunk.type === 'start').length, 1);
	const traces = chunks.filter(
		(chunk) => chunk.type === 'data-article-retrieval'
	);
	assert.equal(traces[0].data.status, 'searching');
	assert.equal(traces.at(-1).data.status, 'complete');
	assert.ok(traces.some((chunk) => chunk.data.trace?.phase === 'planning'));
	assert.ok(
		traces.some((chunk) =>
			chunk.data.trace?.routes.some((route) => route.status === 'running')
		)
	);
	assert.equal(traces.at(-1).data.trace.routes.length, 2);
	const { articleRetrievalSchema } = await loadTs('src/lib/chat-types.ts', {
		zod: { z }
	});
	for (const trace of traces)
		assert.equal(articleRetrievalSchema.safeParse(trace.data).success, true);
	assert.equal(traces[0].id, traces.at(-1).id);
	assert.equal(traces.at(-1).data.sources[0].url, '/posts/redis-guide');
	assert.equal('content' in traces.at(-1).data.sources[0], false);
	assert.equal('excerpt' in traces.at(-1).data.sources[0], false);
	let finalMessage;
	for await (const message of ai.readUIMessageStream({
		stream: new ReadableStream({
			start(controller) {
				chunks.forEach((chunk) => controller.enqueue(chunk));
				controller.close();
			}
		})
	}))
		finalMessage = message;
	assert.equal(
		finalMessage.parts.filter((part) => part.type === 'data-article-retrieval')
			.length,
		1
	);
	assert.equal(
		finalMessage.parts.find((part) => part.type === 'data-article-retrieval')
			.data.status,
		'complete'
	);
	assert.equal(
		finalMessage.parts.find((part) => part.type === 'text').text,
		'模拟回答'
	);
	assert.equal(
		(await ai.safeValidateUIMessages({ messages: [finalMessage] })).success,
		true
	);
	const modelHistory = await ai.convertToModelMessages([finalMessage]);
	assert.equal(
		modelHistory[0].content.some(
			(part) => part.type === 'data-article-retrieval'
		),
		false
	);
	assert.deepEqual(events, ['limit', 'search', 'plan', 'model']);
	assert.match(capturedPrompt, /Redis 短信验证码限流/);
	assert.match(capturedPrompt, /\/posts\/redis-guide/);
	await (await route.POST(request())).text();
	assert.equal(builds, 1);
	const noResults = await (
		await route.POST(request('火星探测器轨道参数'))
	).text();
	assert.match(noResults, /"status":"complete","sources":\[\]/);
	shouldFailPlanner = true;
	const fallbackResponse = await (await route.POST(request())).text();
	assert.match(fallbackResponse, /planner-error/);
	assert.match(fallbackResponse, /模拟回答/);
	assert.ok(!fallbackResponse.includes('private planner details'));
	shouldFailPlanner = false;
	routeEnv.AI_QUERY_PLANNING = 'false';
	events.length = 0;
	const disabledResponse = await (await route.POST(request())).text();
	assert.match(disabledResponse, /"fallback":"disabled"/);
	assert.ok(!events.includes('plan'));
	delete routeEnv.AI_QUERY_PLANNING;
	shouldFailModel = true;
	const modelFailure = await (await route.POST(request())).text();
	assert.match(modelFailure, /回答生成失败/);
	assert.ok(!modelFailure.includes('private provider details'));
	assert.match(modelFailure, /\/posts\/redis-guide/);
	shouldFailModel = false;
	shouldFailRetrieval = true;
	events.length = 0;
	const retrievalFailure = await (await route.POST(request())).text();
	assert.match(retrievalFailure, /"status":"error"/);
	assert.match(retrievalFailure, /"type":"error"/);
	assert.deepEqual(events, ['limit', 'search']);
	shouldFailRetrieval = false;
	events.length = 0;
	shouldBlock = true;
	assert.equal((await route.POST(request())).status, 429);
	assert.deepEqual(events, ['limit']);
});

test('Trace renders real sources, explicit states, accessible links and schema rejects unsafe URLs', async () => {
	const types = await loadTs('src/lib/chat-types.ts', { zod: { z } });
	const radix = await import('radix-ui');
	const primitives = await loadTs('src/components/ui/collapsible.tsx', {
		'react/jsx-runtime': jsxRuntime,
		'radix-ui': radix
	});
	const trace = await loadTs('src/components/ui/trace.tsx', {
		react: React,
		'react/jsx-runtime': jsxRuntime,
		'lucide-react': lucide,
		'@/lib/utils': { cn: (...classes) => classes.filter(Boolean).join(' ') },
		'@/components/ui/collapsible': primitives
	});
	const { ArticleRetrievalTrace } = await loadTs(
		'src/components/chat/ArticleRetrievalTrace.tsx',
		{
			'react/jsx-runtime': jsxRuntime,
			react: React,
			'lucide-react': lucide,
			'@/lib/chat-types': types,
			'@/components/ui/trace': trace
		}
	);
	const source = {
		slug: 'redis',
		title: 'Redis 限流教程',
		url: '/posts/redis',
		description: '手机号与 IP 频率限制'
	};
	const render = (data, extra = {}) =>
		renderToStaticMarkup(
			React.createElement(ArticleRetrievalTrace, {
				data,
				isLoading: true,
				hasAnswer: false,
				...extra
			})
		);
	const running = render({ status: 'searching', sources: [] });
	assert.match(running, /正在检索文章与 PDF/);
	assert.match(running, /aria-expanded="true"/);
	const complete = render({
		status: 'complete',
		durationMs: 3,
		sources: [source]
	});
	assert.match(complete, /已检索博客/);
	assert.match(complete, /href="\/posts\/redis"/);
	assert.match(complete, /target="_blank"/);
	assert.match(complete, /noopener noreferrer/);
	assert.match(complete, /在新标签页打开/);
	assert.match(complete, /正在生成回答/);
	const multiTrace = {
		phase: 'complete',
		standaloneQuery: '电商项目用了哪些技术',
		primaryTerms: ['电商项目', '技术栈'],
		relatedTerms: ['技术选型'],
		routes: [
			{
				id: 'q1',
				query: '电商项目 技术栈',
				status: 'complete',
				hitCount: 3,
				durationMs: 4
			},
			{
				id: 'q2',
				query: '电商项目 技术选型',
				status: 'error',
				hitCount: 0,
				durationMs: 10
			}
		],
		fusion: { candidateCount: 3, uniqueCount: 2, selectedCount: 1 }
	};
	const multi = render({
		status: 'complete',
		sources: [source],
		trace: multiTrace
	});
	assert.match(multi, /2 路查询/);
	assert.match(multi, /核心词：/);
	assert.match(multi, /技术选型/);
	assert.match(multi, /检索失败，已跳过/);
	assert.match(multi, /去重后 2 条/);
	assert.match(
		render({
			status: 'searching',
			sources: [],
			trace: { phase: 'planning', routes: [] }
		}),
		/正在理解问题与对话/
	);
	assert.match(
		render({
			status: 'complete',
			sources: [source],
			trace: { ...multiTrace, fallback: 'planner-timeout' }
		}),
		/查询改写超时/
	);
	assert.match(
		render(
			{
				status: 'searching',
				sources: [],
				trace: {
					...multiTrace,
					phase: 'retrieving',
					routes: [{ id: 'q1', query: 'Redis', status: 'running' }]
				}
			},
			{ isLoading: false }
		),
		/已中断/
	);
	const pdfSource = {
		...source,
		slug: 'pdf-resume-p2-c1',
		title: '个人简历 · 第 2 页',
		url: '/resume/leslie-frontend.pdf#page=2'
	};
	const pdfData = { status: 'complete', sources: [pdfSource] };
	assert.equal(types.articleRetrievalSchema.safeParse(pdfData).success, true);
	assert.match(render(pdfData), /href="\/resume\/leslie-frontend\.pdf#page=2"/);
	assert.match(render(pdfData), /个人简历 · 第 2 页/);
	for (const url of [
		'https://example.com/resume/a.pdf#page=1',
		'//example.com/a.pdf#page=1',
		'/resume/../secret.pdf#page=1',
		'/resume/%2e%2e.pdf#page=1',
		'/resume/a.pdf#page=0',
		'/resume/a.pdf?redirect=evil#page=1'
	]) {
		assert.equal(types.retrievalSourceUrlSchema.safeParse(url).success, false);
		assert.doesNotMatch(
			render({ status: 'complete', sources: [{ ...pdfSource, url }] }),
			/<a /
		);
	}
	assert.match(render({ status: 'complete', sources: [] }), /未找到相关资料/);
	assert.match(render({ status: 'error', sources: [] }), /资料检索失败/);
	assert.match(
		render({ status: 'searching', sources: [] }, { isLoading: false }),
		/资料检索已中断/
	);
	assert.match(
		render({ status: 'complete', sources: [source] }, { hasError: true }),
		/回答生成失败/
	);
	assert.match(
		render(
			{ status: 'complete', sources: [source] },
			{ isLoading: false, hasAnswer: true }
		),
		/aria-expanded="false"/
	);
	assert.equal(
		types.articleRetrievalSchema.safeParse({
			status: 'complete',
			sources: [{ ...source, url: 'javascript:alert(1)' }]
		}).success,
		false
	);
	assert.equal(
		types.articleRetrievalSchema.safeParse({
			status: 'complete',
			sources: Array(5).fill(source)
		}).success,
		false
	);
});

test('Public resume PDF is extracted, chunked, searchable, page-cited and stable across rebuilds', async () => {
	const { buildArticleIndex } =
		await import('../scripts/build-article-index.mjs');
	const { PDF_CHUNK_SIZE } = await import('../scripts/build-pdf-index.mjs');
	const { buildSearchIndex, searchArticles, buildArticleContext } =
		await searchPromise;
	const first = await buildArticleIndex(root);
	const pdfs = first.documents.filter((doc) => doc.sourceType === 'pdf');
	assert.ok(pdfs.length >= 2);
	assert.ok(pdfs.some((doc) => doc.page === 2));
	for (const doc of pdfs) {
		assert.ok(doc.content.length > 0 && doc.content.length <= PDF_CHUNK_SIZE);
		assert.match(doc.url, /^\/resume\/leslie-frontend\.pdf#page=[1-9]\d*$/);
		assert.ok(doc.title.includes(`第 ${doc.page} 页`));
	}
	const pageOne = pdfs.filter((doc) => doc.page === 1);
	if (pageOne.length > 1)
		assert.equal(
			pageOne[0].content.slice(-180),
			pageOne[1].content.slice(0, 180)
		);
	assert.equal(first.version, (await buildArticleIndex(root)).version);
	const index = buildSearchIndex(first.documents);
	for (const query of [
		'简历',
		'简历里的技术栈',
		'简历中的项目经验',
		'作者的工作经历'
	]) {
		const hits = searchArticles(index, query);
		assert.ok(
			hits.some((hit) => hit.article.sourceType === 'pdf'),
			query
		);
		assert.equal(new Set(hits.map((hit) => hit.article.url)).size, hits.length);
		assert.match(buildArticleContext(hits), /\.pdf#page=/);
	}
});

test('PDF allowlist handles removal, corrupt files, traversal and symlinks without stale documents', async () => {
	const { buildPdfDocuments } = await import('../scripts/build-pdf-index.mjs');
	const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'blog-pdf-test-'));
	try {
		await fs.mkdir(path.join(directory, 'data'));
		await fs.mkdir(path.join(directory, 'public/resume'), { recursive: true });
		const manifest = path.join(directory, 'data/retrieval-pdfs.json');
		const entry = {
			id: 'resume',
			file: 'resume/test.pdf',
			title: '测试简历',
			description: '测试',
			tags: ['简历']
		};
		assert.deepEqual(await buildPdfDocuments(directory), []);
		await fs.copyFile(
			path.join(root, 'public/resume/leslie-frontend.pdf'),
			path.join(directory, 'public/resume/test.pdf')
		);
		await fs.writeFile(manifest, JSON.stringify([entry]));
		assert.ok((await buildPdfDocuments(directory)).length > 0);
		await fs.writeFile(manifest, '[]');
		assert.deepEqual(await buildPdfDocuments(directory), []);
		await fs.writeFile(
			manifest,
			JSON.stringify([{ ...entry, file: '../secret.pdf' }])
		);
		await assert.rejects(buildPdfDocuments(directory), /Invalid/);
		await fs.writeFile(manifest, JSON.stringify([entry, entry]));
		await assert.rejects(buildPdfDocuments(directory), /duplicate/);
		await fs.writeFile(manifest, JSON.stringify([entry]));
		await fs.writeFile(
			path.join(directory, 'public/resume/test.pdf'),
			'corrupt PDF'
		);
		await assert.rejects(buildPdfDocuments(directory));
		await fs.unlink(path.join(directory, 'public/resume/test.pdf'));
		await fs.writeFile(path.join(directory, 'outside.pdf'), 'secret');
		await fs.symlink(
			path.join(directory, 'outside.pdf'),
			path.join(directory, 'public/resume/test.pdf')
		);
		await assert.rejects(buildPdfDocuments(directory), /inside public/);
	} finally {
		await fs.rm(directory, { recursive: true, force: true });
	}
});

test('Suggestions API validates, limits independently, uses server evidence and structured output, and degrades safely', async () => {
	const types = await loadTs('src/lib/chat-types.ts', { zod: { z } });
	const errors = await loadTs('src/lib/errors.ts');
	const env = {};
	let blocked = false,
		hasEvidence = true,
		failModel = false,
		calls = 0,
		lookupCalls = 0;
	let captured;
	const scopes = [];
	const route = await loadTs(
		'src/app/api/chat/suggestions/route.ts',
		{
			zod: { z },
			ai: {
				Output: ai.Output,
				generateText: async (options) => {
					calls++;
					captured = options;
					if (failModel) throw Error('private provider error');
					return {
						output: {
							questions: ['Lua 如何保证原子性？', 'TTL 应该如何设置？']
						}
					};
				}
			},
			'@leslie/search-core/rag': searchRag,
			'@/lib/chat-provider': {
				getChatProvider: () => () => ({}),
				getChatModelId: () => 'mock-model'
			},
			'@/lib/chat-types': types,
			'@/lib/ratelimit': {
				checkIpRateLimit: async (ip, scope) => {
					scopes.push(scope);
					if (blocked) throw new errors.ChatbotError('rate_limit:suggestions');
				}
			},
			'@/lib/errors': errors,
			'@/lib/rag': {
				getBlogRetrieval: async () => ({
					sources: hasEvidence ? [{ slug: 'redis' }] : [],
					context: 'server-only evidence: Redis Lua TTL'
				}),
				getBlogSuggestionKnowledge: (question, ids) => {
					lookupCalls++;
					return {
						context: 'server-only evidence: Redis Lua TTL',
						hasEvidence: hasEvidence && ids.includes('redis')
					};
				}
			}
		},
		{ process: { env } }
	);
	const request = (
		body = {
			question: 'Redis 限流',
			reply: '使用计数器',
			sourceSlugs: ['redis']
		}
	) =>
		new Request('http://localhost/api/chat/suggestions', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-forwarded-for': '192.0.2.1'
			},
			body: JSON.stringify(body)
		});
	assert.equal((await route.POST(request({ reply: 'x' }))).status, 400);
	assert.equal(calls, 0);
	const response = await route.POST(request());
	assert.equal(response.status, 200);
	assert.equal(response.headers.get('Cache-Control'), 'no-store');
	assert.equal((await response.json()).questions.length, 2);
	assert.equal(lookupCalls, 1);
	assert.ok(captured.output);
	const payload = JSON.parse(captured.prompt);
	assert.equal(payload.question, 'Redis 限流');
	assert.equal(payload.reply, '使用计数器');
	assert.match(payload.knowledgeBase, /server-only evidence/);
	assert.deepEqual(scopes, ['suggestions']);
	await route.POST(
		request({
			question: 'Redis',
			reply: 'x',
			sourceSlugs: ['nonexistent'],
			knowledgeBase: 'untrusted secret'
		})
	);
	assert.equal(calls, 1);
	hasEvidence = false;
	assert.deepEqual(await (await route.POST(request())).json(), {
		questions: []
	});
	assert.equal(calls, 1);
	hasEvidence = true;
	env.AI_SUGGESTIONS = 'false';
	assert.deepEqual(await (await route.POST(request())).json(), {
		questions: []
	});
	assert.equal(calls, 1);
	delete env.AI_SUGGESTIONS;
	failModel = true;
	const failed = await route.POST(request());
	assert.equal(failed.status, 200);
	assert.deepEqual(await failed.json(), { questions: [] });
	blocked = true;
	assert.equal((await route.POST(request())).status, 429);
});

test('Suggestion evidence resolves only registered public source IDs, including contextual follow-ups', async () => {
	const rag = await loadTs('src/lib/rag/index.ts', {
		'server-only': {},
		'@/generated/article-index.json': { documents: [document()] },
		'@/lib/prompts': await promptsPromise,
		'@leslie/search-core': searchCore,
		'@leslie/search-core/rag': searchRag,
		'./search': await searchPromise
	});
	assert.equal(
		rag.getBlogSuggestionKnowledge('它还有哪些细节？', ['unknown']).hasEvidence,
		false
	);
	const knowledge = rag.getBlogSuggestionKnowledge('它还有哪些细节？', [
		'redis-guide'
	]);
	assert.equal(knowledge.hasEvidence, true);
	assert.match(knowledge.context, /Redis/);
});

test('Late suggestion responses cannot overwrite a new turn or a cleared chat', async () => {
	const types = await loadTs('src/lib/chat-types.ts', { zod: { z } });
	const { createSuggestionsClient } = await loadTs(
		'src/components/chat/suggestions-request.ts',
		{ '@/lib/chat-types': types },
		{ AbortController }
	);
	const responses = [];
	const client = createSuggestionsClient(
		(url, options) =>
			new Promise((resolve) =>
				responses.push({
					resolve,
					signal: options.signal,
					body: JSON.parse(options.body)
				})
			)
	);
	const oldStates = [],
		newStates = [];
	const old = client.load(
		{ question: 'old', reply: 'answer', sourceSlugs: [] },
		(state) => oldStates.push(state)
	);
	const next = client.load(
		{ question: 'new', reply: 'answer', sourceSlugs: [] },
		(state) => newStates.push(state)
	);
	assert.equal(responses[0].signal.aborted, true);
	responses[1].resolve(Response.json({ questions: ['新的追问？'] }));
	await next;
	responses[0].resolve(Response.json({ questions: ['旧的追问？'] }));
	await old;
	assert.equal(oldStates.length, 1);
	assert.equal(newStates.at(-1).questions[0], '新的追问？');
	const cleared = [];
	const pending = client.load(
		{ question: 'clear', reply: 'answer', sourceSlugs: [] },
		(state) => cleared.push(state)
	);
	client.cancel();
	responses[2].resolve(Response.json({ questions: ['不该显示？'] }));
	await pending;
	assert.equal(cleared.length, 1);
	const broken = createSuggestionsClient(async () =>
		Response.json({ questions: ['x'.repeat(61)] })
	);
	const states = [];
	await broken.load({ question: 'x', reply: 'y', sourceSlugs: [] }, (state) =>
		states.push(state)
	);
	assert.equal(states.at(-1).questions.length, 0);
});

test('Suggestions UI renders safe question buttons, forwards selection and handles empty/loading states', async () => {
	const { SuggestedQuestions } = await loadTs(
		'src/components/chat/SuggestedQuestions.tsx',
		{ 'react/jsx-runtime': jsxRuntime, 'lucide-react': lucide }
	);
	let selected;
	const props = {
		data: { status: 'complete', questions: ['Redis 如何限流？'] },
		onSelect: (question) => (selected = question)
	};
	const html = renderToStaticMarkup(
		React.createElement(SuggestedQuestions, props)
	);
	assert.match(html, /你还可以问/);
	assert.match(html, /<button/);
	assert.match(html, /Redis 如何限流/);
	const tree = SuggestedQuestions(props);
	tree.props.children[1].props.children[0].props.onClick();
	assert.equal(selected, props.data.questions[0]);
	assert.equal(
		SuggestedQuestions({
			...props,
			data: { status: 'complete', questions: [] }
		}),
		null
	);
	assert.match(
		renderToStaticMarkup(
			React.createElement(SuggestedQuestions, {
				...props,
				data: { status: 'generating', questions: [] }
			})
		),
		/role="status"/
	);
});

test('Chat and suggestions use separate Redis quotas while preserving the existing chat key', async () => {
	const errors = await loadTs('src/lib/errors.ts');
	const counts = new Map();
	const keys = [];
	const redis = {
		multi() {
			let key;
			return {
				incr(value) {
					key = value;
					keys.push(value);
					return this;
				},
				expire() {
					return this;
				},
				async exec() {
					const count = (counts.get(key) ?? 0) + 1;
					counts.set(key, count);
					return [count, 1];
				}
			};
		}
	};
	const { checkIpRateLimit } = await loadTs('src/lib/ratelimit.ts', {
		'@/lib/constants': { isProductionEnvironment: true },
		'@/lib/errors': errors,
		'@/lib/redis': { getRedisClient: async () => redis }
	});
	for (let i = 0; i < 10; i++) await checkIpRateLimit('192.0.2.1');
	await checkIpRateLimit('192.0.2.1', 'suggestions');
	await assert.rejects(
		checkIpRateLimit('192.0.2.1'),
		(error) => error.statusCode === 429
	);
	assert.equal(keys[0], 'ip-rate-limit:192.0.2.1');
	assert.ok(keys.includes('ip-rate-limit:suggestions:192.0.2.1'));
});
