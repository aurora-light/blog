import { useMessages } from '@/hooks/use-messages';
import { ArrowDownIcon } from '@radix-ui/react-icons';
import type { ChatStatus, UIMessage } from 'ai';
import { ChatMessage, ThinkingMessage } from './ChatMessage';
import { Greeting } from './Greeting';
import { SuggestedQuestions } from './SuggestedQuestions';
import type { SuggestionsState } from './suggestions-request';
import { Fragment } from 'react';

const suggestedQuestions = [
	'介绍一下这个博客',
	'最近有哪些技术文章？',
	'你能回答哪些问题？'
];

type ChatMessagesProps = {
	suggestions?: SuggestionsState & { messageId: string };
	messages: UIMessage[];
	status: ChatStatus;
	error: Error | undefined;
	onRegenerate: () => void;
	onReuse: (message: UIMessage) => void;
	onSubmitSuggestion: (question: string) => void;
};

function EmptyChat({ onSubmit }: { onSubmit: (question: string) => void }) {
	return (
		<div className="flex h-full flex-col justify-end">
			<div className="mb-auto pt-8">
				<Greeting />
			</div>
			<div className="space-y-2">
				{suggestedQuestions.map((question) => (
					<button
						key={question}
						type="button"
						onClick={() => onSubmit(question)}
						className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-left text-xs text-zinc-600 transition hover:-translate-y-0.5 hover:border-amber-300 hover:bg-amber-50 hover:text-zinc-900 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-400 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-300 dark:hover:border-amber-400/30 dark:hover:bg-amber-400/10"
					>
						{question}
					</button>
				))}
			</div>
		</div>
	);
}

export function ChatMessages({
	suggestions,
	messages,
	status,
	error,
	onRegenerate,
	onReuse,
	onSubmitSuggestion
}: ChatMessagesProps) {
	const isGenerating = status === 'submitted' || status === 'streaming';
	const {
		containerRef: messagesContainerRef,
		endRef: messagesEndRef,
		isAtBottom,
		scrollToBottom
	} = useMessages({
		status
	});

	return (
		<div className="relative flex-1 overflow-hidden" aria-live="polite">
			<div
				className="absolute inset-0 space-y-4 touch-pan-y overflow-y-auto px-4 py-5"
				ref={messagesContainerRef}
				style={{ scrollbarWidth: 'none' }}
			>
				{messages.length === 0 ? (
					<EmptyChat onSubmit={onSubmitSuggestion} />
				) : (
					messages.map((message, index) => (
						<Fragment key={message.id}>
							<ChatMessage
								message={message}
								isLoading={isGenerating && index === messages.length - 1}
								hasError={Boolean(error) && index === messages.length - 1}
								onReuse={onReuse}
							/>
							{suggestions?.messageId === message.id &&
								message.role === 'assistant' &&
								index === messages.length - 1 &&
								!isGenerating &&
								!error && (
									<SuggestedQuestions
										data={suggestions}
										onSelect={onSubmitSuggestion}
									/>
								)}
						</Fragment>
					))
				)}

				{status === 'submitted' && messages.at(-1)?.role !== 'assistant' && (
					<ThinkingMessage />
				)}
				{error && (
					<p
						role="alert"
						className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive"
					>
						回答生成失败，请稍后重试。如已有检索结果，可展开查看。
						<button
							type="button"
							onClick={onRegenerate}
							className="ml-2 rounded-sm font-medium underline underline-offset-2 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
						>
							重试
						</button>
					</p>
				)}
				<div
					className="min-h-[24px] min-w-[24px] shrink-0"
					ref={messagesEndRef}
				/>
			</div>

			<button
				aria-label="Scroll to bottom"
				className={`absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center rounded-full border border-border/50 bg-card/90 px-3.5 shadow-[var(--shadow-float)] backdrop-blur-lg transition-all duration-200 h-7 text-[10px] ${
					isAtBottom
						? 'pointer-events-none scale-90 opacity-0'
						: 'pointer-events-auto scale-100 opacity-100'
				}`}
				onClick={() => scrollToBottom()}
				type="button"
			>
				<ArrowDownIcon className="size-3 text-muted-foreground" />
			</button>
		</div>
	);
}
