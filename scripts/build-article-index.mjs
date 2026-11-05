import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import matter from 'gray-matter';
import { buildPdfDocuments } from './build-pdf-index.mjs';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
export const CONTENT_LIMIT = 4000;

// Text extraction only: never evaluate MDX/JSX. Keep code text searchable.
export function stripMarkdown(content) {
	return content
		.replace(/<!--[\s\S]*?-->/g, '')
		.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
		.replace(/^\s*(?:import|export)\s.+$/gm, '')
		.replace(/^\s*(?:`{3,}|~{3,})[^\n]*$/gm, '')
		.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
		.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
		.replace(/<[^>\n]+>/g, '')
		.replace(/^\s{0,3}#{1,6}\s+/gm, '')
		.replace(/[*_`]+/g, '')
		.replace(/&nbsp;/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

async function collectFiles(directory) {
	let entries;
	try {
		entries = await readdir(directory, { withFileTypes: true });
	} catch (error) {
		if (error.code === 'ENOENT') return [];
		throw error;
	}
	const files = await Promise.all(
		entries.map((entry) => {
			const file = path.join(directory, entry.name);
			if (entry.isDirectory()) return collectFiles(file);
			return entry.isFile() && file.endsWith('.mdx') ? [file] : [];
		})
	);
	return files.flat().sort();
}

export async function buildArticleIndex(root = projectRoot) {
	const files = (
		await Promise.all(
			['posts', 'data/blog'].map((directory) =>
				collectFiles(path.join(root, directory))
			)
		)
	).flat();
	const documents = await Promise.all(
		files.map(async (file) => {
			const { data, content } = matter(await readFile(file, 'utf8'));
			for (const field of ['title', 'slug', 'author']) {
				if (typeof data[field] !== 'string' || !data[field].trim()) {
					throw new Error(`Invalid ${field}: ${path.relative(root, file)}`);
				}
			}
			if (
				!Array.isArray(data.tags) ||
				!data.tags.every(
					(tag) => typeof tag === 'string' || typeof tag === 'number'
				) ||
				!data.date ||
				Number.isNaN(new Date(data.date).getTime()) ||
				(data.description !== undefined && typeof data.description !== 'string')
			) {
				throw new Error(`Invalid metadata: ${path.relative(root, file)}`);
			}
			if (/[\s/#?\\]/.test(data.slug) || ['.', '..'].includes(data.slug)) {
				throw new Error(`Invalid slug: ${path.relative(root, file)}`);
			}
			return {
				slug: data.slug,
				title: data.title,
				url: `/posts/${encodeURIComponent(data.slug)}`,
				description: stripMarkdown(data.description ?? '').slice(0, 500),
				tags: data.tags.map(String),
				date: new Date(data.date).toISOString(),
				content: stripMarkdown(content).slice(0, CONTENT_LIMIT)
			};
		})
	);
	documents.push(...(await buildPdfDocuments(root)));
	const slugs = new Set();
	for (const document of documents) {
		if (slugs.has(document.slug)) {
			throw new Error(`Duplicate article slug: ${document.slug}`);
		}
		slugs.add(document.slug);
	}
	documents.sort((a, b) => a.slug.localeCompare(b.slug, 'en'));
	const version = createHash('sha256')
		.update(JSON.stringify(documents))
		.digest('hex');
	return { schemaVersion: 1, version, documents };
}

export async function writeArticleIndex(root = projectRoot) {
	const index = await buildArticleIndex(root);
	const directory = path.join(root, 'src/generated');
	await mkdir(directory, { recursive: true });
	const file = path.join(directory, 'article-index.json');
	const temporary = `${file}.${process.pid}.tmp`;
	await writeFile(temporary, `${JSON.stringify(index)}\n`, 'utf8');
	await rename(temporary, file);
	console.log(
		`Article index: ${index.documents.length} documents, ${index.version.slice(0, 12)}`
	);
	return index;
}

if (
	process.argv[1] &&
	import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
	await writeArticleIndex();
}
