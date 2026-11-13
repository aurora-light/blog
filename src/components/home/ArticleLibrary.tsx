'use client';

import {
	articleCategories,
	filterHomeArticles,
	type HomeArticle
} from '@/lib/article-categories';
import { ArticleCategoryNav } from '@/components/ArticleCategoryNav';
import { useArticleCategory } from '@/hooks/use-article-category';
import { ArrowDown, ArrowUpRight, Search, X } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { ArticleCover } from './ArticleCover';

const dateFormat = new Intl.DateTimeFormat('zh-CN', {
	timeZone: 'Asia/Shanghai',
	year: 'numeric',
	month: '2-digit',
	day: '2-digit'
});
const PAGE_SIZE = 12;

export function ArticleLibrary({ articles }: { articles: HomeArticle[] }) {
	const [category, setCategory] = useArticleCategory();
	const [query, setQuery] = useState('');
	const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
	const filtered = filterHomeArticles(articles, category, query);
	const selected = articleCategories.find((item) => item.id === category)!;
	const counts = Object.fromEntries(
		articleCategories.map((item) => [
			item.id,
			item.id === 'all'
				? articles.length
				: articles.filter((article) => article.category === item.id).length
		])
	);
	const reset = () => {
		setQuery('');
		setCategory('all');
		setVisibleCount(PAGE_SIZE);
	};
	return (
		<div className="mx-auto max-w-[1360px] px-4 pb-8 sm:px-8 lg:px-12">
			<ArticleCategoryNav
				active={category}
				counts={counts}
				onSelect={(next) => {
					setCategory(next);
					setVisibleCount(PAGE_SIZE);
				}}
			/>
			<section aria-label="文章列表" className="pt-7 sm:pt-9">
				<div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end sm:gap-6">
					<div>
						<p className="mb-1.5 text-[10px] tracking-[0.2em] text-zinc-400 dark:text-zinc-500">
							学习 · 实践 · 记录
						</p>
						<div className="flex items-baseline gap-3">
							<h1 className="font-serif text-xl font-semibold tracking-wide text-zinc-900 dark:text-zinc-100">
								{category === 'all' ? '最新文章' : selected.label}
							</h1>
							<p className="text-xs text-zinc-400" role="status">
								{query
									? `找到 ${filtered.length} 篇`
									: `${filtered.length} 篇文章`}
							</p>
						</div>
					</div>
					<div className="relative w-full sm:max-w-[260px]">
						<Search
							className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-zinc-400"
							aria-hidden="true"
						/>
						<input
							id="article-search"
							type="search"
							value={query}
							onChange={(event) => {
								setQuery(event.target.value);
								setVisibleCount(PAGE_SIZE);
							}}
							aria-label="搜索文章标题、标签或简介"
							placeholder="搜索标题、标签或简介…"
							className="h-9 w-full scroll-mt-48 rounded-lg border border-zinc-200 bg-white/60 pl-9 pr-8 text-xs text-zinc-800 placeholder:text-zinc-400 focus:border-rose-300 focus:outline-hidden focus:ring-2 focus:ring-rose-100 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-200 dark:focus:ring-rose-400/20"
						/>
						{query && (
							<button
								type="button"
								onClick={() => {
									setQuery('');
									setVisibleCount(PAGE_SIZE);
								}}
								aria-label="清除搜索"
								className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1 text-zinc-400 hover:text-zinc-700 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-rose-400"
							>
								<X className="size-3" />
							</button>
						)}
					</div>
				</div>
				{filtered.length ? (
					<>
						<div className="grid grid-cols-1 gap-x-6 gap-y-10 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
							{filtered.slice(0, visibleCount).map((article, index) => (
								<article key={article.slug} data-category={article.category}>
									<Link
										href={`/posts/${encodeURIComponent(article.slug)}`}
										className="group block h-full rounded-xl focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-4 dark:focus-visible:ring-offset-zinc-950"
									>
										<ArticleCover
											category={article.category}
											slug={article.slug}
											cover={article.cover}
											loading={index === 0 ? 'eager' : 'lazy'}
										/>
										<div className="pt-4">
											<div className="mb-2 flex items-center justify-between gap-2 text-[10px] text-zinc-400">
												<span className="tracking-wide text-zinc-500 dark:text-zinc-400">
													{
														articleCategories.find(
															(item) => item.id === article.category
														)?.label
													}
												</span>
												<time dateTime={article.date} className="tabular-nums">
													{dateFormat
														.format(new Date(article.date))
														.replaceAll('/', '.')}
												</time>
											</div>
											<h2 className="line-clamp-2 text-[15px] font-semibold leading-6 tracking-[0.01em] text-zinc-800 transition-colors group-hover:text-rose-500 dark:text-zinc-100 dark:group-hover:text-rose-400">
												{article.title}
											</h2>
											{article.description && (
												<p className="mt-2 line-clamp-2 text-xs leading-[1.8] text-zinc-500 dark:text-zinc-400">
													{article.description}
												</p>
											)}
											<div className="mt-3 flex items-center justify-between gap-3">
												<span className="truncate text-[10px] text-zinc-400">
													{article.tags
														.slice(0, 2)
														.map((tag) => `#${tag}`)
														.join('  ')}
												</span>
												<ArrowUpRight
													className="size-3.5 shrink-0 text-zinc-300 transition-colors group-hover:text-rose-400 dark:text-zinc-600"
													aria-hidden="true"
												/>
											</div>
										</div>
									</Link>
								</article>
							))}
						</div>
						<div className="mt-12 flex flex-col items-center gap-4 border-t border-zinc-200/70 pt-8 dark:border-white/10">
							<p className="text-[11px] text-zinc-400">
								已展示 {Math.min(visibleCount, filtered.length)} /{' '}
								{filtered.length} 篇
							</p>
							{visibleCount < filtered.length && (
								<button
									type="button"
									onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
									className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white/50 px-6 py-2.5 text-xs text-zinc-600 transition-colors hover:border-zinc-400 hover:text-zinc-950 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-rose-400 dark:border-white/15 dark:bg-white/[0.03] dark:text-zinc-300 dark:hover:border-white/40"
								>
									继续阅读
									<ArrowDown className="size-3" aria-hidden="true" />
								</button>
							)}
						</div>
					</>
				) : (
					<div className="flex min-h-72 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-200 text-center dark:border-white/10">
						<Search className="mb-1 size-5 text-zinc-300" aria-hidden="true" />
						<h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
							没有找到相关的文章
						</h2>
						<p className="max-w-xs px-4 text-xs leading-5 text-zinc-400">
							试试其他关键词，或回到全部文章继续浏览。
						</p>
						<button
							type="button"
							onClick={reset}
							className="mt-1 rounded-full border border-zinc-200 px-4 py-2 text-xs text-zinc-600 transition-colors hover:bg-white focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-rose-400 dark:border-white/15 dark:text-zinc-300 dark:hover:bg-white/5"
						>
							查看全部文章
						</button>
					</div>
				)}
			</section>
		</div>
	);
}
