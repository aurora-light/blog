'use client';

import { ArticleCover } from '@/components/home/ArticleCover';
import {
	Command,
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList
} from '@/components/ui/command';
import {
	DialogClose,
	DialogDescription,
	DialogTitle
} from '@/components/ui/dialog';
import { useArticleSearch } from '@/hooks/use-article-search';
import { ArrowUpRight, Search, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef } from 'react';

export function ArticleSearch() {
	const router = useRouter();
	const triggerRef = useRef<HTMLButtonElement>(null);
	const { open, handleOpenChange, query, handleQueryChange, results, loading } =
		useArticleSearch();

	return (
		<>
			<button
				ref={triggerRef}
				type="button"
				onClick={() => handleOpenChange(true)}
				aria-label="搜索文章"
				aria-haspopup="dialog"
				aria-expanded={open}
				title="搜索文章（⌘K / Ctrl+K）"
				className="grid size-8 place-items-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-violet-400 dark:hover:bg-white/10 dark:hover:text-white"
			>
				<Search className="size-4" aria-hidden="true" />
			</button>
			<CommandDialog
				open={open}
				onOpenChange={handleOpenChange}
				onCloseAutoFocus={(event) => {
					event.preventDefault();
					triggerRef.current?.focus();
				}}
			>
				<DialogTitle className="sr-only">搜索文章</DialogTitle>
				<DialogDescription className="sr-only">
					输入关键词搜索文章标题和正文，使用方向键选择，按回车打开文章。
				</DialogDescription>
				<Command
					shouldFilter={false}
					label="文章搜索"
					className="max-h-[84dvh]"
				>
					<CommandInput
						value={query}
						onValueChange={handleQueryChange}
						aria-label="文章搜索关键词"
						placeholder="搜索文章标题、标签或正文…"
						maxLength={200}
						// className="pr-8 text-base sm:text-sm"
					/>
					<p
						className="shrink-0 px-4 pb-1 pt-3 text-xs text-muted-foreground"
						role="status"
					>
						{loading
							? results.length
								? '正在搜索，暂时显示上一次结果…'
								: '正在搜索…'
							: query.trim()
								? `显示 ${results.length} 篇文章`
								: '最新文章'}
					</p>
					<CommandList
						aria-label="文章搜索结果"
						className="min-h-0 overscroll-contain"
					>
						{!loading && (
							<CommandEmpty>没有匹配的文章，试试缩短关键词。</CommandEmpty>
						)}
						{results.length > 0 && (
							<CommandGroup>
								{results.map((article) => (
									<CommandItem
										key={article.slug}
										value={article.slug}
										onSelect={() => {
											handleOpenChange(false);
											router.push(article.url);
										}}
										className="group min-w-0 gap-3 leading-5 dark:text-zinc-300"
									>
										<ArticleCover
											category={article.category}
											slug={article.slug}
											cover={article.cover}
											variant="thumbnail"
										/>
										<span className="min-w-0 flex-1 break-words">
											{article.title}
										</span>
										<ArrowUpRight
											className="size-3.5 shrink-0 text-zinc-400"
											aria-hidden="true"
										/>
									</CommandItem>
								))}
							</CommandGroup>
						)}
					</CommandList>
				</Command>
				<DialogClose asChild>
					<button
						type="button"
						aria-label="关闭搜索"
						className="absolute right-3 top-3 rounded p-1 text-zinc-500 hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-rose-400"
					>
						<X className="size-4" aria-hidden="true" />
					</button>
				</DialogClose>
			</CommandDialog>
		</>
	);
}
