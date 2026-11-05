import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	generateSuggestions,
	parseSuggestions,
	buildSuggestionsPrompt
} from '../dist/rag.js';
const input = {
	question: 'Redis 如何限流？',
	reply: '可以通过计数器实现。',
	knowledgeBase: 'Redis 限流支持 Lua 原子操作和过期时间。'
};

test('Recommendations use bounded knowledge, question and completed answer', async () => {
	let request;
	const output = await generateSuggestions(input, {
		generate: async (value) => {
			request = value;
			return { questions: ['如何保证操作的原子性？', '过期时间如何设置？'] };
		}
	});
	assert.equal(output.questions.length, 2);
	assert.deepEqual(JSON.parse(request.prompt), input);
	assert.match(request.system, /不凑数/);
	const prompt = JSON.parse(
		buildSuggestionsPrompt({
			question: 'q'.repeat(3000),
			reply: 'r'.repeat(9000),
			knowledgeBase: 'k'.repeat(7000)
		}).prompt
	);
	assert.deepEqual(
		[prompt.question.length, prompt.reply.length, prompt.knowledgeBase.length],
		[2000, 8000, 6500]
	);
});

test('Schema validation, deduplication and repetition checks allow fewer or no recommendations', () => {
	assert.deepEqual(
		parseSuggestions(
			{
				questions: [
					'Redis 如何限流？',
					'Redis如何限流?',
					'如何设置 TTL？',
					'如何设置TTL?'
				].slice(1)
			},
			'Redis如何限流?'
		),
		{ questions: ['如何设置 TTL？'] }
	);
	assert.deepEqual(parseSuggestions({ questions: [] }), { questions: [] });
	for (const value of [
		{ questions: ['x'.repeat(61)] },
		{ questions: [''] },
		{ questions: [1] },
		{ questions: ['a', 'b', 'c', 'd'] },
		{ bad: [] }
	])
		assert.throws(() => parseSuggestions(value));
});

test('Missing evidence skips model; timeout, malformed output and provider errors return empty', async () => {
	let called = false;
	const empty = await generateSuggestions(
		{ ...input, knowledgeBase: '' },
		{
			generate: async () => {
				called = true;
				return { questions: [] };
			}
		}
	);
	assert.equal(called, false);
	assert.deepEqual(empty, { questions: [] });
	for (const generate of [
		async () => {
			throw Error('secret');
		},
		async () => ({ bad: [] }),
		() => new Promise(() => {})
	]) {
		assert.deepEqual(
			await generateSuggestions(input, { generate, timeoutMs: 10 }),
			{ questions: [] }
		);
	}
});

test('Cancellation is propagated and stops the injected model call', async () => {
	const controller = new AbortController();
	let modelSignal;
	const promise = generateSuggestions(
		{ ...input, signal: controller.signal },
		{
			generate: ({ signal }) => {
				modelSignal = signal;
				return new Promise(() => {});
			}
		}
	);
	await Promise.resolve();
	controller.abort(new Error('cancelled'));
	await assert.rejects(promise, /cancelled/);
	assert.equal(modelSignal.aborted, true);
});
