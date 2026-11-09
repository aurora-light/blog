import type { Post } from 'contentlayer2/generated';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export function ArticleNavigation({
	previous,
	next
}: {
	previous?: Post;
	next?: Post;
}) {
	return (
		<footer className="mt-14 min-w-0 border-t border-zinc-200 pt-6 dark:border-white/10 lg:col-start-1">
			<p className="mb-4 text-[10px] tracking-[0.16em] text-zinc-400">
				继续阅读
			</p>
			<nav aria-label="相邻文章" className="grid gap-4 sm:grid-cols-2">
				{previous ? (
					<Link
						rel="prev"
						href={`/posts/${encodeURIComponent(previous.slug)}`}
						className="group min-w-0 rounded-xl border border-zinc-200/80 px-4 py-4 transition-colors hover:border-rose-200 hover:bg-white/70 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-rose-400 dark:border-white/10 dark:hover:border-rose-400/30 dark:hover:bg-white/[0.03]"
					>
						<span className="mb-2 inline-flex items-center gap-2 text-[10px] text-zinc-400">
							<ArrowLeft className="size-3" aria-hidden="true" />
							上一篇
						</span>
						<span className="line-clamp-2 block text-sm leading-6 text-zinc-700 transition-colors group-hover:text-rose-500 dark:text-zinc-300">
							{previous.title}
						</span>
					</Link>
				) : (
					<div className="rounded-xl border border-dashed border-zinc-200/80 px-4 py-4 dark:border-white/10">
						<p className="text-[10px] text-zinc-400">上一篇</p>
						<p className="mt-2 text-sm text-zinc-500">已经是最新的一篇</p>
					</div>
				)}
				{next ? (
					<Link
						rel="next"
						href={`/posts/${encodeURIComponent(next.slug)}`}
						className="group min-w-0 rounded-xl border border-zinc-200/80 px-4 py-4 transition-colors hover:border-rose-200 hover:bg-white/70 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-rose-400 dark:border-white/10 dark:hover:border-rose-400/30 dark:hover:bg-white/[0.03]"
					>
						<span className="mb-2 inline-flex items-center gap-2 text-[10px] text-zinc-400">
							下一篇
							<ArrowRight className="size-3" aria-hidden="true" />
						</span>
						<span className="line-clamp-2 block text-sm leading-6 text-zinc-700 transition-colors group-hover:text-rose-500 dark:text-zinc-300">
							{next.title}
						</span>
					</Link>
				) : (
					<div className="rounded-xl border border-dashed border-zinc-200/80 px-4 py-4 dark:border-white/10">
						<p className="text-[10px] text-zinc-400">下一篇</p>
						<p className="mt-2 text-sm text-zinc-500">已经读到最后一篇</p>
					</div>
				)}
			</nav>
		</footer>
	);
}
