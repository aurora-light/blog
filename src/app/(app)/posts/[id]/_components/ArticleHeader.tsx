import { getProxiedImage } from '@/lib/image-proxy';
import siteMetadata from '@/config/site';
import { ArticleShare } from '@/components/ArticleShare';
import {
	articleCategories,
	getArticleCategoryHref,
	type ArticleCategory
} from '@/lib/article-categories';
import type { Post } from 'contentlayer2/generated';
import { ArrowLeft, Clock } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

const dateFormat = new Intl.DateTimeFormat('zh-CN', {
	timeZone: 'Asia/Shanghai',
	year: 'numeric',
	month: '2-digit',
	day: '2-digit'
});

export function ArticleHeader({
	post,
	category
}: {
	post: Post;
	category: ArticleCategory;
}) {
	const categoryLabel = articleCategories.find(
		(item) => item.id === category
	)!.label;
	const tags = Array.from(new Set(post.tags.map((tag) => String(tag).trim())));
	return (
		<header className="min-w-0 lg:col-start-1">
			<nav
				aria-label="当前位置"
				className="mb-7 flex flex-wrap items-center gap-2 text-[11px] text-zinc-400"
			>
				<Link
					href="/"
					className="inline-flex items-center gap-1.5 rounded-sm transition-colors hover:text-rose-500 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-rose-400"
				>
					<ArrowLeft className="size-3" aria-hidden="true" />
					全部文章
				</Link>
				<span aria-hidden="true">/</span>
				<Link
					href={getArticleCategoryHref(category)}
					className="rounded-sm text-rose-500 hover:text-rose-600 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-rose-400 dark:text-rose-400"
				>
					{categoryLabel}
				</Link>
			</nav>
			<h1 className="text-pretty wrap-break-word font-serif text-[27px] font-semibold leading-normal tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-[34px]">
				{post.title}
			</h1>
			<div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] text-zinc-400">
				<time dateTime={post.date} className="tabular-nums">
					{dateFormat.format(new Date(post.date)).replaceAll('/', '.')}
				</time>
				<span aria-hidden="true">·</span>
				<span>{siteMetadata.authorsCN}</span>
				<span aria-hidden="true">·</span>
				<span className="inline-flex items-center gap-1.5">
					<Clock className="size-3" aria-hidden="true" />约{' '}
					{Math.max(1, Math.ceil(post.readingTime?.minutes ?? 1))} 分钟阅读
				</span>
				<ArticleShare
					slug={post.slug}
					title={post.title}
					articleUrl={
						new URL(`/posts/${encodeURIComponent(post.slug)}`, siteMetadata.url)
							.href
					}
				/>
			</div>
			<div className="mt-4 flex flex-wrap gap-x-3 gap-y-1.5 text-[11px] text-zinc-400">
				{tags.map((tag) => (
					<span key={tag}>#{tag}</span>
				))}
			</div>
			{post.description && (
				<p className="mt-6 border-l-2 border-rose-200 pl-4 text-sm leading-7 text-zinc-500 dark:border-rose-400/30 dark:text-zinc-400">
					{post.description}
				</p>
			)}
			{post.cover && (
				<div className="relative mt-8 aspect-[16/8] overflow-hidden rounded-xl">
					<Image
						src={getProxiedImage(post.cover, { width: 1600 })}
						alt=""
						fill
						unoptimized
						sizes="(max-width: 1023px) 100vw, 760px"
						className="object-cover"
					/>
				</div>
			)}
			<div className="mb-8 mt-8 border-t border-zinc-200/80 dark:border-white/10" />
		</header>
	);
}
