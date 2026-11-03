'use client';

import { useChat } from '@ai-sdk/react';
import {
	type DataUIPart,
	DefaultChatTransport,
	type FileUIPart,
	type UIMessage
} from 'ai';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { ChatHeader } from './ChatHeader';
import { ChatLauncher } from './ChatLauncher';
import { ChatMessages } from './ChatMessages';
import { MultimodalInput } from './MultimodalInput';
import {
	type CustomChatMessage,
	type CustomUIDataTypes,
	useDataStream
} from './data-stream-provider';
import { getMessageText } from './message-utils';

const chatTransport = new DefaultChatTransport({
	api: '/api/chat'
});

export function ChatShell() {
	const [isOpen, setIsOpen] = useState(false);
	const [input, setInput] = useState('');
	const inputRef = useRef<HTMLTextAreaElement>(null);
	const { setDataStream, setWaitingStatus } = useDataStream();
	const handleData = useCallback(
		(part: DataUIPart<CustomUIDataTypes>) => {
			setDataStream((current) => [...current, part]);

			if (part.type === 'data-waiting-status') {
				setWaitingStatus(part.data);
			}
		},
		[setDataStream, setWaitingStatus]
	);
	const {
		messages,
		sendMessage,
		status,
		stop,
		regenerate,
		setMessages,
		error,
		clearError
	} = useChat<CustomChatMessage>({
		transport: chatTransport,
		throttle: 50,
		onData: handleData
	});

	const isGenerating = status === 'submitted' || status === 'streaming';

	useEffect(() => {
		if (isOpen) {
			window.requestAnimationFrame(() => inputRef.current?.focus());
		}
	}, [isOpen]);

	const submitMessage = useCallback(
		async (text: string, files: FileUIPart[] = []) => {
			const nextMessage = text.trim();
			if ((!nextMessage && files.length === 0) || isGenerating) return;

			clearError();
			setInput('');
			await sendMessage({
				files,
				text: nextMessage || '请分析这些图片。'
			});
		},
		[clearError, isGenerating, sendMessage]
	);

	const reuseMessage = useCallback((message: UIMessage) => {
		const text = getMessageText(message);

		if (!text) {
			toast.error('没有可编辑的内容');
			return;
		}

		setInput(text);
		window.requestAnimationFrame(() => inputRef.current?.focus());
	}, []);

	return (
		<>
			<div className="fixed bottom-4 right-4 z-40 sm:bottom-6 sm:right-6">
				{!isOpen ? <ChatLauncher onOpen={() => setIsOpen(true)} /> : null}
			</div>

			<Dialog open={isOpen} onOpenChange={setIsOpen}>
				<DialogContent
					showCloseButton={false}
					overlayClassName="bg-zinc-950/55 backdrop-blur-md dark:bg-black/70"
					className="flex h-[min(860px,90dvh)] w-[min(1120px,94vw)] max-w-none flex-col gap-0 overflow-hidden rounded-[28px] border border-white/60 bg-white/95 p-0 shadow-[0_32px_120px_-28px_rgba(0,0,0,0.65)] backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/95 sm:rounded-[32px]"
				>
					<DialogTitle className="sr-only">阿轩的 AI 助手</DialogTitle>
					<ChatHeader
						hasMessages={messages.length > 0}
						onClear={() => setMessages([])}
						onClose={() => setIsOpen(false)}
					/>
					<ChatMessages
						messages={messages}
						status={status}
						error={error}
						onRegenerate={() => void regenerate()}
						onReuse={reuseMessage}
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
		</>
	);
}
