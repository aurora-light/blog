import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';

const source = await fs.readFile(
	new URL('../src/lib/bot-protection.ts', import.meta.url),
	'utf8'
);
const compiled = ts.transpileModule(source, {
	compilerOptions: {
		module: ts.ModuleKind.CommonJS,
		target: ts.ScriptTarget.ES2022
	}
}).outputText;

function loadProtection(checkBotId) {
	const module = { exports: {} };
	vm.runInNewContext(compiled, {
		module,
		exports: module.exports,
		Response,
		console: { error() {} },
		require(name) {
			assert.equal(name, 'botid/server');
			return { checkBotId };
		}
	});
	return module.exports.checkBotProtection;
}

test('human requests can proceed', async () => {
	assert.equal(await loadProtection(async () => ({ isBot: false }))(), null);
});

test('bot requests are rejected without caching the response', async () => {
	const response = await loadProtection(async () => ({ isBot: true }))();
	assert.equal(response.status, 403);
	assert.equal(response.headers.get('Cache-Control'), 'no-store');
	assert.ok((await response.json()).error);
});

test('verification failures do not silently bypass protection', async () => {
	const response = await loadProtection(async () => {
		throw new Error('Unavailable');
	})();
	assert.equal(response.status, 503);
	assert.equal(response.headers.get('Cache-Control'), 'no-store');
});
