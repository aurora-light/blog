'use client';

import type { SearchArticle } from '@/lib/article-categories';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

async function fetchFromApi(query: string, signal: AbortSignal) {
	const params = new URLSearchParams({ limit: query ? '24' : '8' });
	if (query) params.set('q', query);
	const response = await fetch(`/api/search/docs?${params}`, {
		signal,
		cache: 'no-store'
	});
	if (!response.ok) throw new Error('搜索请求失败');
	const data = (await response.json()) as { results: SearchArticle[] };
	if (!Array.isArray(data.results)) throw new Error('搜索响应格式不正确');
	return data.results;
}

export function useArticleSearch() {
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState('');
	const [cache, setCache] = useState(() => new Map<string, SearchArticle[]>());
	const [lastResults, setLastResults] = useState<SearchArticle[]>([]);
	const [failedQuery, setFailedQuery] = useState<string | null>(null);
	const normalized = query
		.normalize('NFKC')
		.trim()
		.replace(/\s+/g, ' ')
		.toLowerCase();
	const cached = cache.get(normalized);
	const error = cached === undefined && failedQuery === normalized;
	const loading = open && cached === undefined && !error;

	const resetQuery = useCallback(() => {
		setQuery('');
		setFailedQuery(null);
	}, []);

	const handleQueryChange = useCallback((value: string) => {
		setFailedQuery(null);
		setQuery(value);
	}, []);

	const handleOpenChange = useCallback(
		(next: boolean) => {
			setOpen(next);
			if (!next) resetQuery();
		},
		[resetQuery]
	);

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (
				event.defaultPrevented ||
				event.repeat ||
				event.isComposing ||
				event.key.toLowerCase() !== 'k' ||
				!(event.metaKey || event.ctrlKey) ||
				event.altKey ||
				event.shiftKey ||
				(!open &&
					event.target instanceof HTMLElement &&
					(event.target.isContentEditable ||
						event.target.closest('input, textarea, [role="dialog"]')))
			) {
				return;
			}
			event.preventDefault();
			handleOpenChange(!open);
		};
		window.addEventListener('keydown', onKeyDown);
		return () => window.removeEventListener('keydown', onKeyDown);
	}, [handleOpenChange, open]);

	useEffect(() => {
		if (!open || error) return;
		if (cached) {
			setLastResults(cached);
			return;
		}

		const controller = new AbortController();
		const timer = window.setTimeout(
			async () => {
				try {
					const results = await fetchFromApi(normalized, controller.signal);
					if (controller.signal.aborted) return;
					setCache((previous) => {
						const next = new Map(previous);
						next.set(normalized, results);
						const oldest = next.keys().next();
						if (next.size > 32 && !oldest.done) next.delete(oldest.value);
						return next;
					});
					setLastResults(results);
				} catch {
					if (!controller.signal.aborted) {
						setFailedQuery(normalized);
						toast.error('搜索暂时不可用，请稍后重试。');
					}
				}
			},
			normalized ? 120 : 0
		);

		return () => {
			window.clearTimeout(timer);
			controller.abort();
		};
	}, [cached, error, normalized, open]);

	return {
		open,
		query,
		results: cached ?? (loading ? lastResults : []),
		loading,
		handleOpenChange,
		handleQueryChange,
		resetQuery
	};
}
