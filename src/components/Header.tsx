import siteMetadata from '@/config/site';
import { GitHubIcon } from '@/assets/icons/GitHubIcon';
import { Rss, Search } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { NavigationBar } from './NavigationBar';
import ThemeToggle from './ThemeToggle';

export function Header() {
	return (
		<header
			className="fixed inset-x-0 top-0 z-40 border-b border-zinc-200/70 bg-[#fafaf8]/95 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/95"
			data-site-header
		>
			<a
				href="#main-content"
				className="sr-only rounded-md bg-background px-4 py-2 focus:not-sr-only focus:absolute focus:left-4 focus:top-16"
			>
				跳到正文
			</a>
			<div className="mx-auto flex h-16 max-w-[1360px] items-center justify-between gap-2 px-4 sm:px-8 lg:px-12">
				<Link
					href="/"
					aria-label={`${siteMetadata.authorsCN}的博客`}
					className="flex min-w-0 shrink items-center gap-2.5 rounded-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-violet-400"
				>
					<Image
						src="/logo.webp"
						alt=""
						width={30}
						height={30}
						unoptimized
						className="size-[30px] shrink-0 rounded-md object-cover"
					/>
					<span className="truncate font-serif text-sm font-semibold tracking-wide text-zinc-900 dark:text-zinc-100 sm:text-base">
						{siteMetadata.authorsCN}
						<span className="hidden lg:inline">的博客</span>
					</span>
				</Link>
				<div className="flex shrink-0 items-center gap-1 sm:gap-3">
					<NavigationBar />
					<div className="hidden items-center gap-1 border-l border-zinc-200 pl-2 dark:border-white/10 sm:flex">
						<a
							href="/feed.xml"
							target="_blank"
							rel="noopener noreferrer"
							aria-label="RSS 订阅"
							title="RSS 订阅"
							className="grid size-8 place-items-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-violet-400 dark:hover:bg-white/10 dark:hover:text-white"
						>
							<Rss className="size-4" />
						</a>
						<a
							href={siteMetadata.authorsUrl}
							target="_blank"
							rel="noopener noreferrer"
							aria-label="GitHub"
							title="GitHub"
							className="grid size-8 place-items-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-violet-400 dark:hover:bg-white/10 dark:hover:text-white"
						>
							<GitHubIcon className="size-4" />
						</a>
					</div>
					<ThemeToggle />
					<Link
						href="/#article-search"
						aria-label="搜索文章"
						className="grid size-8 place-items-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-violet-400 dark:hover:bg-white/10 dark:hover:text-white"
					>
						<Search className="size-4" />
					</Link>
				</div>
			</div>
		</header>
	);
}
