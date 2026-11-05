'use client';

import { ArrowUpRight } from 'lucide-react';
import type { SuggestionsState } from './suggestions-request';

export function SuggestedQuestions({
	data,
	onSelect,
	disabled = false
}: {
	data: SuggestionsState;
	onSelect: (question: string) => void;
	disabled?: boolean;
}) {
	if (data.status === 'generating')
		return (
			<p className="mt-2 text-xs text-muted-foreground" role="status">
				正在整理推荐追问…
			</p>
		);
	if (!data.questions.length) return null;
	return (
		<div className="mt-3 max-w-[88%] space-y-2" aria-label="推荐追问">
			<p className="text-[11px] text-muted-foreground">你还可以问</p>
			<div className="flex flex-row items-start gap-2">
				{data.questions.map((question) => (
					<button
						key={question}
						type="button"
						disabled={disabled}
						onClick={() => onSelect(question)}
						className="group inline-flex max-w-full items-center gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-left text-xs leading-5 text-zinc-600 transition-colors hover:border-amber-300 hover:bg-amber-50 hover:text-zinc-900 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-300 dark:hover:border-amber-400/30 dark:hover:bg-amber-400/10"
					>
						<span className="min-w-0 break-words">{question}</span>
						<ArrowUpRight
							className="size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transform-none"
							aria-hidden="true"
						/>
					</button>
				))}
			</div>
		</div>
	);
}
