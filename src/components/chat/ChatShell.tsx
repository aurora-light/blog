'use client';

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useActiveChat } from '@/hooks/use-active-chat';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChatHeader } from './ChatHeader';
import { ChatMessages } from './ChatMessages';
import { MultimodalInput } from './MultimodalInput';

export function ChatShell({ children }: { children: ReactNode }) {
	const [isOpen, setIsOpen] = useState(false);
	const inputRef = useRef<HTMLTextAreaElement>(null);
	const {
		messages,
		input,
		setInput,
		suggestions,
		status,
		error,
		isGenerating,
		submitMessage,
		reuseMessage,
		clearChat,
		stop,
		regenerate
	} = useActiveChat();
	useEffect(() => {
		if (!isOpen) return;
		const frame = window.requestAnimationFrame(() => inputRef.current?.focus());
		return () => window.cancelAnimationFrame(frame);
	}, [isOpen]);

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			{children}
			<DialogContent
				showCloseButton={false}
				overlayClassName="bg-zinc-950/55 backdrop-blur-md dark:bg-black/70"
				className="flex h-[min(860px,90dvh)] w-[min(1120px,94vw)] max-w-none flex-col gap-0 overflow-hidden rounded-[28px] border border-white/60 bg-white/95 p-0 shadow-[0_32px_120px_-28px_rgba(0,0,0,0.65)] backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/95 sm:rounded-[32px]"
			>
				<DialogTitle className="sr-only">阿轩的 AI 助手</DialogTitle>
				<ChatHeader
					hasMessages={messages.length > 0}
					onClear={() => void clearChat()}
					onClose={() => setIsOpen(false)}
				/>
				<ChatMessages
					messages={messages}
					suggestions={suggestions}
					status={status}
					error={error}
					onRegenerate={() => void regenerate()}
					onReuse={(message) => {
						reuseMessage(message);
						window.requestAnimationFrame(() => inputRef.current?.focus());
					}}
					onSubmitSuggestion={(question) => void submitMessage(question)}
				/>
				<MultimodalInput
					input={input}
					inputRef={inputRef}
					isGenerating={isGenerating}
					onInputChange={setInput}
					onSubmit={submitMessage}
					onStop={() => void stop()}
				/>
			</DialogContent>
		</Dialog>
	);
}
