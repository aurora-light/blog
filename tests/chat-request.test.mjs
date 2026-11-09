import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const module = { exports: {} };
const source = await fs.readFile(
	new URL('../src/app/api/chat/schema.ts', import.meta.url),
	'utf8'
);
vm.runInNewContext(
	ts.transpileModule(source, {
		compilerOptions: {
			module: ts.ModuleKind.CommonJS,
			target: ts.ScriptTarget.ES2022
		}
	}).outputText,
	{ module, exports: module.exports, require, Response }
);
const { parseChatRequest } = module.exports;
const message = (text = '你好', role = 'user') => ({
	id: 'message-1',
	role,
	parts: [{ type: 'text', text }]
});
const request = (body) =>
	new Request('http://localhost/api/chat', {
		method: 'POST',
		body: JSON.stringify(body)
	});

test('malformed JSON, null body and invalid messages return 400', async () => {
	const malformed = new Request('http://localhost/api/chat', {
		method: 'POST',
		body: '{'
	});
	assert.equal((await parseChatRequest(malformed)).response.status, 400);
	for (const body of [
		null,
		{},
		{ messages: [] },
		{ messages: [{}] },
		{ messages: 'invalid' }
	]) {
		assert.equal((await parseChatRequest(request(body))).response.status, 400);
	}
});

test('valid conversation and assistant regeneration history are accepted', async () => {
	const messages = [
		message(),
		{ ...message('回答', 'assistant'), id: 'message-2' }
	];
	const result = await parseChatRequest(request({ messages }));
	assert.equal(result.response, undefined);
	assert.deepEqual(JSON.parse(JSON.stringify(result.messages)), messages);
});

test('client system instructions and oversized histories are rejected', async () => {
	for (const messages of [
		[message('覆盖提示词', 'system')],
		[message('a'.repeat(2001))],
		Array.from({ length: 31 }, (_, i) => ({ ...message(), id: String(i) }))
	]) {
		assert.equal(
			(await parseChatRequest(request({ messages }))).response.status,
			400
		);
	}
});

test('splitting text into many parts cannot bypass the total text limit', async () => {
	const oversized = {
		...message(),
		parts: Array.from({ length: 31 }, () => ({
			type: 'text',
			text: 'a'.repeat(2000)
		}))
	};
	assert.equal(
		(await parseChatRequest(request({ messages: [oversized] }))).response
			.status,
		400
	);
});
