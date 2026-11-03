import { Bot, Trash2, X } from 'lucide-react';

type ChatHeaderProps = {
	hasMessages: boolean;
	onClear: () => void;
	onClose: () => void;
};

export function ChatHeader({ hasMessages, onClear, onClose }: ChatHeaderProps) {
	return (
		<header className="relative overflow-hidden border-b border-zinc-200/70 px-5 py-4 dark:border-white/10">
			<div className="absolute -right-10 -top-14 h-32 w-32 rounded-full bg-amber-300/30 blur-3xl dark:bg-amber-500/15" />
			<div className="relative flex items-center justify-between gap-3">
				<div className="flex min-w-0 items-center gap-3">
					<div className="relative grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-zinc-900 text-amber-300 shadow-xs dark:bg-zinc-100 dark:text-zinc-900">
						<Bot className="h-5 w-5" aria-hidden="true" />
						<span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500 dark:border-zinc-950" />
					</div>
					<div className="min-w-0">
						<h2 className="truncate text-sm font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
							阿轩的 AI 助手
						</h2>
						<p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
							在线 · 和我聊聊博客与技术
						</p>
					</div>
				</div>
				<div className="flex items-center gap-1">
					{hasMessages ? (
						<button
							type="button"
							onClick={onClear}
							className="rounded-full p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-400 dark:hover:bg-white/10 dark:hover:text-zinc-100"
							aria-label="清空对话"
						>
							<Trash2 className="h-4 w-4" />
						</button>
					) : null}
					<button
						type="button"
						onClick={onClose}
						className="rounded-full p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-400 dark:hover:bg-white/10 dark:hover:text-zinc-100"
						aria-label="关闭对话"
					>
						<X className="h-4 w-4" />
					</button>
				</div>
			</div>
		</header>
	);
}
