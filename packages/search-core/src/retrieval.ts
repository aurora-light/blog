import type { SearchDocument, SearchHit } from './index.js';

export interface RetrievalRoute<T extends SearchDocument> {
	id: string;
	weight: number;
	hits: readonly SearchHit<T>[];
}
export interface FusedHit<T extends SearchDocument> extends SearchHit<T> {
	fusionScore: number;
	routes: string[];
}

/** Weighted RRF: a source contributes at most once per route. */
export function fuseSearchResults<T extends SearchDocument>(
	routes: readonly RetrievalRoute<T>[],
	options: {
		getSourceKey?: (document: T) => string;
		limit?: number;
		k?: number;
	} = {}
): FusedHit<T>[] {
	const { getSourceKey = (doc) => doc.id, limit = 4, k = 60 } = options;
	if (!Number.isInteger(limit) || limit < 0 || !Number.isFinite(k) || k <= 0)
		throw new RangeError('Invalid fusion options');
	const merged = new Map<string, FusedHit<T>>();
	const routeIds = new Set<string>();
	for (const route of routes) {
		if (routeIds.has(route.id)) throw new Error('Duplicate route id');
		routeIds.add(route.id);
		if (!Number.isFinite(route.weight) || route.weight <= 0)
			throw new RangeError('Invalid route weight');
		const seen = new Set<string>();
		let rank = 0;
		for (const hit of route.hits) {
			const key = getSourceKey(hit.document);
			if (seen.has(key)) continue;
			seen.add(key);
			rank++;
			const contribution = route.weight / (k + rank);
			const existing = merged.get(key);
			if (existing) {
				existing.fusionScore += contribution;
				existing.routes.push(route.id);
				existing.matchedTerms = Array.from(
					new Set([...existing.matchedTerms, ...hit.matchedTerms])
				);
			} else
				merged.set(key, {
					...hit,
					matchedTerms: [...hit.matchedTerms],
					fusionScore: contribution,
					routes: [route.id]
				});
		}
	}
	return [...merged.values()]
		.sort((a, b) => b.fusionScore - a.fusionScore)
		.slice(0, limit);
}
