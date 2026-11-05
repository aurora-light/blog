'use client';

import { useState, type ReactNode } from 'react';
import {
	ArrowUpRight,
	BookOpen,
	Check,
	CircleAlert,
	FileText,
	LoaderCircle,
	Search
} from 'lucide-react';
import {
	retrievalSourceUrlSchema,
	type ArticleRetrievalData
} from '@/lib/chat-types';
import {
	Trace,
	TraceCollapsible,
	TraceCollapsibleContent,
	TraceCollapsibleTrigger,
	TraceDescription,
	TraceIcon,
	TraceLine,
	TraceTitle
} from '@/components/ui/trace';

export function ArticleRetrievalTrace({
	data,
	isLoading,
	hasAnswer,
	hasError = false
}: {
	data: ArticleRetrievalData;
	isLoading: boolean;
	hasAnswer: boolean;
	hasError?: boolean;
}) {
	const [open, setOpen] = useState<boolean>();
	const interrupted = data.status === 'searching' && !isLoading;
	const searching = data.status === 'searching' && isLoading;
	const failed = data.status === 'error';
	const trace = data.trace;
	const summary = searching
		? trace?.phase === 'planning'
			? '正在理解问题与对话'
			: '正在检索文章与 PDF'
		: interrupted
			? '资料检索已中断'
			: failed
				? '资料检索失败'
				: data.sources.length
					? `已检索博客资料 · ${trace?.routes.length ? `${trace.routes.length} 路查询 · ` : ''}${data.sources.length} 条相关来源`
					: '未找到相关资料';
	const status = searching ? 'running' : failed ? 'error' : undefined;
	const Icon = searching
		? LoaderCircle
		: failed || interrupted
			? CircleAlert
			: Search;
	const answering = isLoading && data.status === 'complete';
	const answerLabel = hasError
		? '回答生成失败，可重试'
		: answering
			? '正在生成回答'
			: hasAnswer
				? '回答已结束'
				: '回答未完成';
	return (
		<Trace
			className="mb-3 border-b border-border/60 pb-2"
			data-testid="article-retrieval-trace"
		>
			<TraceCollapsible
				open={open ?? (isLoading && !hasAnswer)}
				onOpenChange={setOpen}
			>
				<TraceCollapsibleTrigger>
					<TraceLine status={status}>
						<TraceIcon>
							<Icon
								className={
									searching ? 'animate-spin motion-reduce:animate-none' : ''
								}
							/>
						</TraceIcon>
						<TraceTitle>{summary}</TraceTitle>
						{data.durationMs !== undefined && (
							<TraceDescription>{data.durationMs} ms</TraceDescription>
						)}
					</TraceLine>
				</TraceCollapsibleTrigger>
				<TraceCollapsibleContent>
					<Trace>
						{trace && (
							<>
								<RetrievalStep
									status={
										trace.phase === 'planning'
											? interrupted || failed
												? 'error'
												: 'running'
											: 'complete'
									}
								>
									{trace.phase === 'planning'
										? interrupted || failed
											? '问题理解未完成'
											: '正在理解问题与对话指代'
										: trace.fallback === 'disabled'
											? '使用原问题检索'
											: trace.fallback === 'planner-timeout'
												? '查询改写超时，已回退到原问题'
												: trace.fallback
													? '查询改写不可用，已回退到原问题'
													: '已理解问题，生成检索查询'}
								</RetrievalStep>
								{trace.standaloneQuery && (
									<p className="ml-6 break-words whitespace-normal text-xs leading-5 text-muted-foreground">
										{trace.standaloneQuery}
									</p>
								)}
								{!!trace.primaryTerms?.length && (
									<p className="ml-6 text-xs leading-5 text-muted-foreground">
										核心词：{trace.primaryTerms.join('、')}
									</p>
								)}
								{!!trace.relatedTerms?.length && (
									<p className="ml-6 text-xs leading-5 text-muted-foreground">
										扩展词：{trace.relatedTerms.join('、')}
									</p>
								)}
								{trace.routes.map((route, index) => (
									<RetrievalStep
										key={route.id}
										status={
											(interrupted || failed) &&
											['running', 'pending'].includes(route.status)
												? 'error'
												: route.status
										}
										description={
											route.durationMs !== undefined
												? `${route.durationMs} ms`
												: undefined
										}
									>
										<span className="block break-words whitespace-normal">
											{index + 1}. {route.query}
										</span>
										<span className="block text-muted-foreground">
											{route.status === 'complete'
												? `命中 ${route.hitCount ?? 0} 条`
												: route.status === 'error'
													? '检索失败，已跳过'
													: interrupted || failed
														? '已中断'
														: route.status === 'running'
															? '检索中'
															: '等待检索'}
										</span>
									</RetrievalStep>
								))}
								{trace.fusion ? (
									<RetrievalStep status="complete">
										合并 {trace.fusion.candidateCount} 条候选 → 去重后{' '}
										{trace.fusion.uniqueCount} 条 → 选取{' '}
										{trace.fusion.selectedCount} 条来源
									</RetrievalStep>
								) : (
									trace.phase === 'fusing' && (
										<RetrievalStep
											status={interrupted || failed ? 'error' : 'running'}
										>
											正在合并与排序检索结果
										</RetrievalStep>
									)
								)}
							</>
						)}
						{!trace && (
							<TraceLine status={status}>
								<TraceIcon>
									{searching ? (
										<LoaderCircle className="animate-spin motion-reduce:animate-none" />
									) : failed || interrupted ? (
										<CircleAlert />
									) : (
										<Check />
									)}
								</TraceIcon>
								<TraceTitle>
									{searching
										? '正在匹配文章与 PDF 文本'
										: failed
											? '未能获取检索资料，请重试'
											: interrupted
												? '本次检索未完成'
												: data.sources.length
													? '检索结果，供回答参考'
													: '本次关键词检索没有命中，回答将说明资料限制'}
								</TraceTitle>
							</TraceLine>
						)}
						{data.sources
							.filter(
								(source) =>
									retrievalSourceUrlSchema.safeParse(source.url).success
							)
							.map((source) => (
								<a
									key={source.slug}
									href={source.url}
									target="_blank"
									rel="noopener noreferrer"
									className="block rounded-md px-1 transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
								>
									<TraceLine>
										<TraceIcon>
											{source.url.includes('.pdf#page=') ? (
												<FileText />
											) : (
												<BookOpen />
											)}
										</TraceIcon>
										<TraceTitle className="flex-1 whitespace-normal">
											<span className="block break-words font-medium text-foreground/90">
												{source.title}
											</span>
											{source.description && (
												<span className="mt-0.5 line-clamp-2 block font-normal text-muted-foreground">
													{source.description}
												</span>
											)}
											<span className="sr-only">（在新标签页打开）</span>
										</TraceTitle>
										<TraceIcon>
											<ArrowUpRight />
										</TraceIcon>
									</TraceLine>
								</a>
							))}
						{data.status === 'complete' && (
							<TraceLine
								status={hasError ? 'error' : answering ? 'running' : undefined}
							>
								<TraceIcon>
									{hasError || (!isLoading && !hasAnswer) ? (
										<CircleAlert />
									) : answering ? (
										<LoaderCircle className="animate-spin motion-reduce:animate-none" />
									) : (
										<Check />
									)}
								</TraceIcon>
								<TraceTitle>{answerLabel}</TraceTitle>
							</TraceLine>
						)}
					</Trace>
				</TraceCollapsibleContent>
			</TraceCollapsible>
		</Trace>
	);
}

function RetrievalStep({
	status,
	description,
	children
}: {
	status: 'pending' | 'running' | 'complete' | 'error';
	description?: string;
	children: ReactNode;
}) {
	return (
		<TraceLine status={status === 'complete' ? undefined : status}>
			<TraceIcon>
				{status === 'running' ? (
					<LoaderCircle className="animate-spin motion-reduce:animate-none" />
				) : status === 'error' ? (
					<CircleAlert />
				) : status === 'pending' ? (
					<Search />
				) : (
					<Check />
				)}
			</TraceIcon>
			<TraceTitle className="min-w-0 whitespace-normal">{children}</TraceTitle>
			{description && <TraceDescription>{description}</TraceDescription>}
		</TraceLine>
	);
}
