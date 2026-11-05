import { readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';

export const PDF_CHUNK_SIZE = 1200;
const OVERLAP = 180;
const MAX_BYTES = 20 * 1024 * 1024;
const MAX_PAGES = 100;

// Deliberately index only explicitly listed, public PDFs. Never scan uploads.
export async function buildPdfDocuments(root) {
	let entries;
	try {
		entries = JSON.parse(
			await readFile(path.join(root, 'data/retrieval-pdfs.json'), 'utf8')
		);
	} catch (error) {
		if (error.code === 'ENOENT') return [];
		throw error;
	}
	if (!Array.isArray(entries)) throw new Error('PDF manifest must be an array');
	const ids = new Set();
	const documents = [];
	for (const entry of entries) {
		if (
			!entry ||
			typeof entry.id !== 'string' ||
			!/^[a-z0-9-]+$/.test(entry.id) ||
			ids.has(entry.id) ||
			typeof entry.file !== 'string' ||
			!/^(?:resume|documents)\/[a-zA-Z0-9_-]+\.pdf$/.test(entry.file) ||
			typeof entry.title !== 'string' ||
			!entry.title.trim() ||
			entry.title.length > 140 ||
			typeof entry.description !== 'string' ||
			!Array.isArray(entry.tags) ||
			!entry.tags.every((tag) => typeof tag === 'string')
		)
			throw new Error('Invalid or duplicate PDF manifest entry');
		ids.add(entry.id);
		const publicRoot = await realpath(path.join(root, 'public'));
		const file = await realpath(path.join(publicRoot, entry.file));
		if (!file.startsWith(`${publicRoot}${path.sep}`))
			throw new Error('PDF must be inside public');
		if ((await stat(file)).size > MAX_BYTES)
			throw new Error(`PDF exceeds 20 MB: ${entry.id}`);
		const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
		const task = getDocument({
			data: new Uint8Array(await readFile(file)),
			isEvalSupported: false,
			useSystemFonts: true
		});
		try {
			const pdf = await task.promise;
			if (pdf.numPages > MAX_PAGES)
				throw new Error(`PDF exceeds 100 pages: ${entry.id}`);
			let textPages = 0;
			for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
				const page = await pdf.getPage(pageNumber);
				const { items } = await page.getTextContent();
				const text = items
					.filter((item) => 'str' in item)
					.map((item) => item.str + (item.hasEOL ? '\n' : ' '))
					.join('')
					.replace(/\s+/g, ' ')
					.trim();
				page.cleanup();
				if (!text) continue;
				textPages++;
				for (let start = 0, chunk = 1; start < text.length; chunk++) {
					let end = Math.min(start + PDF_CHUNK_SIZE, text.length);
					if (end < text.length) {
						const boundary = text.lastIndexOf('。', end - 1);
						if (boundary > start + PDF_CHUNK_SIZE / 2) end = boundary + 1;
					}
					documents.push({
						slug: `pdf-${entry.id}-p${pageNumber}-c${chunk}`,
						title: `${entry.title} · 第 ${pageNumber} 页`,
						url: `/${entry.file}#page=${pageNumber}`,
						description: entry.description.slice(0, 500),
						tags: entry.tags,
						date: '',
						sourceType: 'pdf',
						page: pageNumber,
						content: text.slice(start, end)
					});
					if (end === text.length) break;
					start = end - OVERLAP;
				}
			}
			if (!textPages)
				throw new Error(
					`PDF has no extractable text; OCR required: ${entry.id}`
				);
		} finally {
			await task.destroy();
		}
	}
	return documents;
}
