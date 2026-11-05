'use client';

import { useSyncExternalStore } from 'react';
import {
	getArticleCategoryFromHash,
	getArticleCategoryHref,
	type ArticleCategoryFilter
} from '@/lib/article-categories';

function subscribe(listener: () => void) {
	window.addEventListener('hashchange', listener);
	window.addEventListener('popstate', listener);
	return () => {
		window.removeEventListener('hashchange', listener);
		window.removeEventListener('popstate', listener);
	};
}
const getSnapshot = () => getArticleCategoryFromHash(window.location.hash);
const getServerSnapshot = (): ArticleCategoryFilter => 'all';

export function useArticleCategory() {
	const category = useSyncExternalStore(
		subscribe,
		getSnapshot,
		getServerSnapshot
	);
	const select = (next: ArticleCategoryFilter) => {
		const hash = getArticleCategoryHref(next).slice(1);
		window.history.replaceState(
			window.history.state,
			'',
			`${window.location.pathname}${window.location.search}${hash}`
		);
		window.dispatchEvent(new Event('hashchange'));
	};
	return [category, select] as const;
}
