import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';

const source = await fs.readFile(
	new URL('../src/lib/health-time-checker.ts', import.meta.url),
	'utf8'
);
const compiled = ts.transpileModule(source, {
	compilerOptions: {
		module: ts.ModuleKind.CommonJS,
		target: ts.ScriptTarget.ES2022
	}
}).outputText;
function setup(
	env = {},
	fetcher = async () => {
		throw new Error('Unavailable');
	}
) {
	const module = { exports: {} };
	let now = 0;
	let calls = 0;
	vm.runInNewContext(compiled, {
		module,
		exports: module.exports,
		URL,
		AbortSignal,
		Date: { now: () => now },
		process: { env },
		fetch: (...args) => {
			calls++;
			return fetcher(...args);
		}
	});
	return {
		check: module.exports.healthTimeChecker,
		calls: () => calls,
		advance: (ms) => {
			now += ms;
		}
	};
}
const env = { AI_STATUS_URL: 'https://status.example/api/v2/summary.json' };
const json = (body) => async () => Response.json(body);

test('unconfigured status endpoint returns unknown without network requests', async () => {
	const s = setup();
	assert.equal(await s.check('model'), 'unknown');
	assert.equal(s.calls(), 0);
});
test('provider indicators map to available or impacted; malformed data is unknown', async () => {
	for (const [body, expected] of [
		[{ status: { indicator: 'none' } }, 'available'],
		[{ status: { indicator: 'major' } }, 'impacted'],
		[{}, 'unknown']
	]) {
		assert.equal(await setup(env, json(body)).check('model'), expected);
	}
});
test('component scope ignores unrelated incidents and never guesses missing components', async () => {
	const body = {
		status: { indicator: 'major' },
		components: [{ id: 'chat', status: 'operational' }]
	};
	assert.equal(
		await setup({ ...env, AI_STATUS_COMPONENT_ID: 'chat' }, json(body)).check(
			'model'
		),
		'available'
	);
	assert.equal(
		await setup(
			{ ...env, AI_STATUS_COMPONENT_ID: 'missing' },
			json(body)
		).check('model'),
		'unknown'
	);
});
test('model-specific endpoint does not confuse different models', async () => {
	const s = setup(
		env,
		json({ models: { slow: 'impacted', fast: 'available' } })
	);
	assert.equal(await s.check('slow'), 'impacted');
	assert.equal(await s.check('fast'), 'available');
	assert.equal(await s.check('other'), 'unknown');
});
test('concurrent queries reuse the request and cache expires after 30 seconds', async () => {
	const s = setup(env, json({ status: { indicator: 'none' } }));
	assert.deepEqual(await Promise.all([s.check('model'), s.check('model')]), [
		'available',
		'available'
	]);
	assert.equal(s.calls(), 1);
	await s.check('model');
	assert.equal(s.calls(), 1);
	s.advance(30001);
	await s.check('model');
	assert.equal(s.calls(), 2);
});
test('timeouts and non-OK responses are unknown and retry after the short cache expires', async () => {
	for (const fetcher of [
		async () => {
			throw new Error('Timeout');
		},
		async () => new Response('', { status: 503 })
	]) {
		const s = setup(env, fetcher);
		assert.equal(await s.check('model'), 'unknown');
		await s.check('model');
		assert.equal(s.calls(), 1);
		s.advance(5001);
		await s.check('model');
		assert.equal(s.calls(), 2);
	}
});
