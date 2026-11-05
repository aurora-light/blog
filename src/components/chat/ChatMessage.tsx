'use client';

import { MessageResponse } from '@/components/ai-elements/message';
import { Shimmer } from '@/components/ai-elements/shimmer';
import { sanitizeText } from '@/lib/utils';
import { articleRetrievalSchema } from '@/lib/chat-types';
import type { FileUIPart, UIMessage } from 'ai';
import { Copy, FileText, Pencil } from 'lucide-react';
import Image from 'next/image';
import { memo } from 'react';
import { toast } from 'sonner';
import { ImageAttachmentPreview } from './ImageAttachmentPreview';
import { MessageReasoning } from './message-reasoning';
import { getMessageText } from './message-utils';
import { ArticleRetrievalTrace } from './ArticleRetrievalTrace';

type ChatMessageProps = {
	message: UIMessage;
	isLoading: boolean;
	hasError?: boolean;
	onReuse: (message: UIMessage) => void;
};

async function copyMessage(text: string) {
	if (!text) {
		toast.error('没有可复制的内容');
		return;
	}

	try {
		await navigator.clipboard.writeText(text);
		toast.success('已复制到剪贴板');
	} catch (error) {
		console.error('Failed to copy chat message:', error);
		toast.error('复制失败，请重试');
	}
}

function WaitingText() {
	return (
		<Shimmer as="span" className="text-xs" duration={1.8} spread={1.5}>
			正在思考…
		</Shimmer>
	);
}

function AssistantAvatar() {
	return (
		<Image
			src="/logo.webp"
			alt=""
			width={28}
			height={28}
			unoptimized
			className="size-7 shrink-0 rounded-lg object-cover"
		/>
	);
}

function ChatFile({ part }: { part: FileUIPart }) {
	const filename = part.filename ?? '附件';

	if (part.mediaType.startsWith('image/')) {
		return (
			<ImageAttachmentPreview
				attachment={{
					id: part.url,
					name: filename,
					url: part.url,
					status: 'ready'
				}}
				variant="message"
			/>
		);
	}

	return (
		<a
			href={part.url}
			target="_blank"
			rel="noreferrer"
			className="flex max-w-full items-center gap-2 rounded-xl border border-zinc-200 bg-white/70 px-3 py-2 text-xs text-zinc-600 transition hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-zinc-300 dark:hover:bg-white/10"
		>
			<FileText className="h-4 w-4 shrink-0" aria-hidden="true" />
			<span className="truncate">{filename}</span>
		</a>
	);
}

function PureChatMessage({
	message,
	isLoading,
	hasError,
	onReuse
}: ChatMessageProps) {
	const isUser = message.role === 'user';
	const messageText = getMessageText(message);
	const retrievalPart = message.parts.find(
		(part) => part.type === 'data-article-retrieval'
	);
	const retrieval =
		!isUser && retrievalPart && 'data' in retrievalPart
			? articleRetrievalSchema.safeParse(retrievalPart.data)
			: undefined;

	const attachmentParts = message.parts.filter(
		(part): part is FileUIPart => part.type === 'file'
	);
	const hasVisibleContent = message.parts.some((part) => {
		if (part.type === 'data-article-retrieval' && retrieval?.success)
			return true;
		if (part.type === 'text' || part.type === 'reasoning') {
			return part.text.trim().length > 0;
		}

		return part.type === 'file';
	});
	const isThinking = !isUser && isLoading && !hasVisibleContent;
	const bubbleClassName = isUser
		? 'max-w-[84%] rounded-[20px] rounded-br-md bg-zinc-900 px-4 py-2.5 text-sm leading-6 text-white shadow-xs dark:bg-zinc-100 dark:text-zinc-900'
		: 'max-w-full rounded-[20px] rounded-bl-md border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm leading-6 text-zinc-700 dark:border-white/10 dark:bg-white/[0.05] dark:text-zinc-200';

	const attachments = attachmentParts.length ? (
		<div className="flex flex-wrap gap-2">
			{attachmentParts.map((part, index) => (
				<ChatFile key={`${part.url}-${index}`} part={part} />
			))}
		</div>
	) : null;

	const mergedReasoning = message.parts?.reduce(
		(acc, part) => {
			if (part.type === 'reasoning' && part.text?.trim().length > 0) {
				return {
					isStreaming: 'state' in part ? part.state === 'streaming' : false,

					rendered: false,

					text: acc.text ? `${acc.text}\n\n${part.text}` : part.text
				};
			}
			return acc;
		},
		{
			isStreaming: false,
			rendered: false,
			text: ''
		}
	);
	const parts = message.parts?.map((part, index) => {
		const { type } = part;
		const key = `message-${message.id}-part-${index}`;

		if (type === 'text') {
			if (!part.text.trim()) return null;

			return (
				<MessageResponse key={key} mode={isLoading ? 'streaming' : 'static'}>
					{sanitizeText(part.text)}
				</MessageResponse>
			);
		}

		if (type === 'reasoning') {
			if (!mergedReasoning.rendered && mergedReasoning.text) {
				mergedReasoning.rendered = true;
				return (
					<MessageReasoning
						isLoading={isLoading || mergedReasoning.isStreaming}
						key={key}
						reasoning={mergedReasoning.text}
					/>
				);
			}
			return null;
		}

		// File parts are rendered together in the attachments section above.
		return null;
	});

	const actions =
		!isLoading && messageText ? (
			<div className="mt-1 flex items-center gap-0.5 opacity-70 transition-opacity sm:opacity-0 sm:group-hover/message:opacity-100 sm:group-focus-within/message:opacity-100">
				{isUser ? (
					<button
						type="button"
						onClick={() => onReuse(message)}
						className="inline-flex h-7 w-7 items-center justify-center rounded-full text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-400 dark:hover:bg-white/10 dark:hover:text-zinc-100"
						aria-label="放入输入框"
						title="编辑并重新发送"
					>
						<Pencil className="h-3.5 w-3.5" aria-hidden="true" />
					</button>
				) : null}
				<button
					type="button"
					onClick={() => void copyMessage(messageText)}
					className="inline-flex h-7 w-7 items-center justify-center rounded-full text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-400 dark:hover:bg-white/10 dark:hover:text-zinc-100"
					aria-label="复制消息"
					title="复制消息"
				>
					<Copy className="h-3.5 w-3.5" aria-hidden="true" />
				</button>
			</div>
		) : null;

	const content = isThinking ? (
		<div className={bubbleClassName}>
			<WaitingText />
		</div>
	) : (
		<>
			<div className={bubbleClassName}>
				<div className="space-y-2">
					{retrieval?.success && (
						<ArticleRetrievalTrace
							data={retrieval.data}
							isLoading={isLoading}
							hasAnswer={Boolean(messageText.trim())}
							hasError={hasError}
						/>
					)}
					{retrieval?.success &&
						isLoading &&
						!messageText.trim() &&
						!mergedReasoning.text && <WaitingText />}
					{attachments}
					{parts}
				</div>
			</div>
			{actions}
		</>
	);

	return isUser ? (
		<div className="group/message flex flex-col items-end">{content}</div>
	) : (
		<div className="group/message flex items-start gap-2">
			<AssistantAvatar />
			<div className="flex min-w-0 flex-1 flex-col items-start">{content}</div>
		</div>
	);
}

export const ChatMessage = memo(PureChatMessage);

export const ThinkingMessage = () => (
	<div
		className="group/message w-full"
		data-role="assistant"
		data-testid="message-assistant-loading"
	>
		<div className="flex items-center gap-2">
			<AssistantAvatar />
			<WaitingText />
		</div>
	</div>
);
