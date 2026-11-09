export interface SearchDocument {
	id: string;
	title: string;
	description: string;
	content: string;
	tags: readonly string[];
	date?: string;
}

export interface SearchField<T> {
	name: string;
	weight: number;
	getText: (document: T) => string;
}

export interface IndexedDocument<T extends SearchDocument> {
	document: T;
	normalizedTitle: string;
	fields: readonly { text: string; weight: number }[];
}

export interface SearchHit<T extends SearchDocument> {
	document: T;
	score: number;
	matchedTerms: string[];
	excerpt: string;
}

export interface SearchOptions<T extends SearchDocument> {
	limit?: number;
	tokenize?: (query: string) => readonly string[];
	minimumMatchedTerms?: number;
	minimumMatchRatio?: number;
	titlePhraseBoost?: number;
	excerptLength?: number;
	excerptContext?: number;
	deduplicateBy?: (document: T) => string | undefined;
	// Application-specific ranking happens before deduplication and result limits.
	rerank?: (hits: readonly SearchHit<T>[], query: string) => SearchHit<T>[];
}

export function defaultSearchFields<
	T extends SearchDocument
>(): SearchField<T>[] {
	return [
		{ name: 'title', weight: 6, getText: (doc) => doc.title },
		{ name: 'description', weight: 3, getText: (doc) => doc.description },
		{ name: 'tags', weight: 4, getText: (doc) => doc.tags.join(' ') },
		{ name: 'content', weight: 1, getText: (doc) => doc.content }
	];
}
const segmenter = new Intl.Segmenter('zh-CN', { granularity: 'word' });
const stopWords = new Set([
	'的',
	'了',
	'是',
	'在',
	'和',
	'与',
	'有',
	'吗',
	'呢',
	'啊',
	'我',
	'你',
	'他',
	'它',
	'这个',
	'那个',
	'这些',
	'那些',
	'什么',
	'怎么',
	'如何',
	'为什么',
	'哪些',
	'有没有',
	'可以',
	'一下',
	'帮我',
	'请',
	'介绍',
	'介绍一下',
	'相关',
	'文章',
	'博客',
	'内容',
	'关于',
	'之前',
	'说说',
	'那么',
	'然后',
	'还有',
	'怎样'
]);

function normalize(text: string) {
	return text.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Inputs are normalized by the index/query pipeline. Latin identifiers must not match inside longer words. */
export function matchesSearchText(text: string, term: string): boolean {
	if (!term) return false;
	if (!/^[\x20-\x7e]+$/.test(term)) return text.includes(term);
	let position = text.indexOf(term);
	while (position !== -1) {
		const before = position > 0 ? (text[position - 1] ?? '') : '';
		const after = text[position + term.length] ?? '';
		if (!/[a-z0-9_]/i.test(before) && !/[a-z0-9_]/i.test(after)) return true;
		position = text.indexOf(term, position + 1);
	}
	return false;
}

export function getSearchTerms(query: string): string[] {
	const normalized = normalize(query).slice(0, 1000);
	const words = Array.from(segmenter.segment(normalized))
		.filter((part) => part.isWordLike)
		.map((part) => part.segment);
	// Keep punctuated identifiers such as Next.js, C++ and @scope/package.
	const identifiers = normalized.match(/[a-z][a-z0-9.+#/@_-]*/g) ?? [];
	return Array.from(new Set([...identifiers, ...words]))
		.filter((word) => word.length > 1 && !stopWords.has(word))
		.slice(0, 24);
}

export function createSearchIndex<T extends SearchDocument>(
	documents: readonly T[],
	fields: readonly SearchField<T>[] = defaultSearchFields<T>()
): IndexedDocument<T>[] {
	for (const field of fields) {
		if (!Number.isFinite(field.weight) || field.weight < 0)
			throw new RangeError('Field weights must be finite and nonnegative');
	}
	return documents.map((document) => ({
		document,
		normalizedTitle: normalize(document.title),
		fields: fields.map((field) => ({
			text: normalize(field.getText(document)),
			weight: field.weight
		}))
	}));
}

function getExcerpt(
	content: string,
	terms: readonly string[],
	length: number,
	context: number
) {
	const lower = content.toLowerCase();
	let bestStart = 0;
	let bestMatches = -1;
	for (const term of terms) {
		const position = lower.indexOf(term);
		if (position < 0) continue;
		const start = Math.max(0, position - context);
		const passage = lower.slice(start, start + length);
		const matches = terms.filter((word) => passage.includes(word)).length;
		if (matches > bestMatches) {
			bestStart = start;
			bestMatches = matches;
		}
	}
	const passage = content.slice(bestStart, bestStart + length);
	return `${bestStart > 0 ? '…' : ''}${passage}${bestStart + passage.length < content.length ? '…' : ''}`;
}

export function searchDocuments<T extends SearchDocument>(
	index: readonly IndexedDocument<T>[],
	query: string,
	options: SearchOptions<T> = {}
): SearchHit<T>[] {
	const {
		limit = 4,
		tokenize = getSearchTerms,
		minimumMatchedTerms = 2,
		minimumMatchRatio = 0.5,
		titlePhraseBoost = 8,
		excerptLength = 1000,
		excerptContext = Math.min(180, excerptLength - 1),
		deduplicateBy,
		rerank
	} = options;
	for (const [name, value] of Object.entries({
		limit,
		minimumMatchedTerms,
		titlePhraseBoost,
		excerptLength,
		excerptContext
	})) {
		if (!Number.isFinite(value) || value < 0)
			throw new RangeError(`${name} must be finite and nonnegative`);
	}
	if (
		!Number.isInteger(limit) ||
		!Number.isInteger(minimumMatchedTerms) ||
		minimumMatchedTerms < 1 ||
		!Number.isInteger(excerptLength) ||
		excerptLength < 1 ||
		!Number.isInteger(excerptContext) ||
		excerptContext >= excerptLength
	) {
		throw new RangeError('Invalid result limit, match count or excerpt bounds');
	}
	if (
		!Number.isFinite(minimumMatchRatio) ||
		minimumMatchRatio < 0 ||
		minimumMatchRatio > 1
	)
		throw new RangeError('minimumMatchRatio must be between 0 and 1');
	if (!limit || !query.trim()) return [];
	const boundedQuery = query.slice(0, 1000);
	const terms = Array.from(
		new Set(
			tokenize(boundedQuery)
				.map((term) => normalize(term).slice(0, 1000))
				.filter(Boolean)
		)
	).slice(0, 24);
	if (!terms.length) return [];
	const requiredMatches = Math.min(
		terms.length,
		Math.max(minimumMatchedTerms, Math.ceil(terms.length * minimumMatchRatio))
	);
	const phrase = normalize(boundedQuery);
	const hits: SearchHit<T>[] = [];
	for (const item of index) {
		let score = 0;
		const matchedTerms: string[] = [];
		for (const term of terms) {
			let matched = false;
			for (const field of item.fields) {
				if (field.weight > 0 && matchesSearchText(field.text, term)) {
					score += field.weight;
					matched = true;
				}
			}
			if (matched) matchedTerms.push(term);
		}
		if (matchedTerms.length < requiredMatches) continue;
		if (matchesSearchText(item.normalizedTitle, phrase))
			score += titlePhraseBoost;
		if (score > 0)
			hits.push({
				document: item.document,
				score,
				matchedTerms,
				excerpt: getExcerpt(
					item.document.content,
					terms,
					excerptLength,
					excerptContext
				)
			});
	}
	hits.sort(
		(a, b) =>
			b.score - a.score ||
			(b.document.date ?? '').localeCompare(a.document.date ?? '')
	);
	const ranked = rerank ? rerank(hits, query) : hits;
	const seen = new Set<string>();
	return ranked
		.filter((hit) => {
			const key = deduplicateBy?.(hit.document);
			if (key === undefined) return true;
			if (seen.has(key)) return false;
			seen.add(key);
			return true;
		})
		.slice(0, limit);
}

export function createSearchEngine<T extends SearchDocument>(
	documents: readonly T[],
	options: SearchOptions<T> & { fields?: readonly SearchField<T>[] } = {}
) {
	const { fields, ...searchOptions } = options;
	const index = createSearchIndex(documents, fields);
	return {
		search: (query: string, overrides: SearchOptions<T> = {}) =>
			searchDocuments(index, query, { ...searchOptions, ...overrides })
	};
}
