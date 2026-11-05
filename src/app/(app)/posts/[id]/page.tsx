import { ArticleCategoryNav } from '@/components/ArticleCategoryNav';
import MDXComponents from '@/components/MDXComponents';
import siteMetadata from '@/config/site';
import {
	articleCategories,
	getArticleCategory,
	getArticleCategoryHref,
	getAdjacentArticles
} from '@/lib/article-categories';
import { allPosts } from 'contentlayer2/generated';
import { ArrowLeft, ArrowRight, Clock } from 'lucide-react';
import { getMDXComponent } from 'next-contentlayer2/hooks';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Toc from '../Toc';

interface TypeParams {
	id: string;
}
const dateFormat = new Intl.DateTimeFormat('zh-CN', {
	timeZone: 'Asia/Shanghai',
	year: 'numeric',
	month: '2-digit',
	day: '2-digit'
});

export async function generateStaticParams() {
	return allPosts.map((post) => ({ id: post.slug }));
}
export async function generateMetadata({
	params
}: {
	params: Promise<TypeParams>;
}) {
	const { id } = await params;
	const post = allPosts.find((post) => post.slug === id);
	if (!post) notFound();
	const title = post.title;
	const description = post.description ?? `${title} - ${siteMetadata.authors}`;
	return {
		title,
		description,
		openGraph: { title, description },
		twitter: { title, description },
		keywords: post.tags?.map(String).join(',')
	};
}

export default async function Page({
	params
}: {
	params: Promise<TypeParams>;
}) {
	const { id } = await params;
	const post = allPosts.find((post) => post.slug === id);
	if (!post) notFound();
	const publishedPosts = allPosts.filter((post) => post.slug !== 'about');
	const category = getArticleCategory(post);
	const categoryLabel = articleCategories.find(
		(item) => item.id === category
	)!.label;
	const counts = Object.fromEntries(
		articleCategories.map((item) => [
			item.id,
			item.id === 'all'
				? publishedPosts.length
				: publishedPosts.filter((post) => getArticleCategory(post) === item.id)
						.length
		])
	);
	const { previous, next } = getAdjacentArticles(publishedPosts, id);
	const MDXContent = getMDXComponent(post.body.code);
	const tags = Array.from(new Set(post.tags.map((tag) => String(tag).trim())));
	return (
		<div className="mx-auto max-w-[1360px] px-4 pb-12 sm:px-8 lg:px-12">
			<ArticleCategoryNav active={category} counts={counts} />
			<article
				data-postid={post._id}
				className="mx-auto grid min-w-0 max-w-[1080px] gap-x-12 pb-8 pt-8 lg:grid-cols-[minmax(0,760px)_200px] lg:pt-12 xl:gap-x-20"
			>
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
					<h1 className="text-pretty break-words font-serif text-[27px] font-semibold leading-[1.5] tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-[34px]">
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
								src={post.cover}
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
				<aside
					aria-label="文章目录"
					className="min-w-0 lg:col-start-2 lg:row-start-1 lg:row-span-3"
				>
					<div className="lg:sticky lg:top-44">
						<Toc key={post.slug} />
					</div>
				</aside>
				<div className="rich-text-viewer article-body js-toc-content min-w-0 lg:col-start-1">
					<MDXContent components={MDXComponents} />
				</div>
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
			</article>
		</div>
	);
}
