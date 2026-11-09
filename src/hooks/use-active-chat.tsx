'use client';

import { useChat } from '@ai-sdk/react';
import {
	type DataUIPart,
	DefaultChatTransport,
	type FileUIPart,
	type UIMessage
} from 'ai';
import {
	createContext,
	useContext,
	useCallback,
	useEffect,
	useMemo,
	useState,
	type ReactNode
} from 'react';
import { toast } from 'sonner';
import { articleRetrievalSchema, waitingStatusSchema } from '@/lib/chat-types';
import {
	type CustomChatMessage,
	type CustomUIDataTypes,
	useDataStream
} from '@/components/chat/data-stream-provider';
import { getMessageText } from '@/components/chat/message-utils';
import {
	createSuggestionsClient,
	type SuggestionsState
} from '@/components/chat/suggestions-request';

const chatTransport = new DefaultChatTransport({ api: '/api/chat' });

function useChatSession() {
	const [input, setInput] = useState('');
	const [suggestionsClient] = useState(() => createSuggestionsClient());
	const [suggestions, setSuggestions] = useState<
		(SuggestionsState & { messageId: string }) | undefined
	>();
	const cancelSuggestions = useCallback(() => {
		suggestionsClient.cancel();
		setSuggestions(undefined);
	}, [suggestionsClient]);
	useEffect(() => () => suggestionsClient.cancel(), [suggestionsClient]);
	const { setDataStream, setWaitingStatus } = useDataStream();
	const handleData = useCallback(
		(part: DataUIPart<CustomUIDataTypes>) => {
			// Persistent retrieval events already live in their own message.parts.
			if (part.type === 'data-article-retrieval') return;
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
		onData: handleData,
		onFinish: ({
			message,
			messages: finishedMessages,
			isAbort,
			isDisconnect,
			isError
		}) => {
			if (isAbort || isDisconnect || isError) return;
			const reply = getMessageText(message).trim().slice(0, 8000);
			const userMessage = [...finishedMessages]
				.reverse()
				.find((item) => item.role === 'user');
			const question = userMessage
				? getMessageText(userMessage).trim().slice(0, 2000)
				: '';
			const part = message.parts.find(
				(part) => part.type === 'data-article-retrieval'
			);
			const retrieval =
				part && 'data' in part
					? articleRetrievalSchema.safeParse(part.data)
					: undefined;
			if (
				!reply ||
				!question ||
				!retrieval?.success ||
				!retrieval.data.sources.length
			)
				return;
			void suggestionsClient.load(
				{
					reply,
					question,
					sourceSlugs: retrieval.data.sources.map((source) => source.slug)
				},
				(data) => setSuggestions({ ...data, messageId: message.id })
			);
		},
		dataPartSchemas: {
			'article-retrieval': articleRetrievalSchema,
			'waiting-status': waitingStatusSchema
		}
	});

	const isGenerating = status === 'submitted' || status === 'streaming';
	useEffect(() => {
		if (status !== 'streaming') setWaitingStatus(undefined);
	}, [status, setWaitingStatus]);

	const submitMessage = useCallback(
		async (text: string, files: FileUIPart[] = []) => {
			const nextMessage = text.trim();
			if ((!nextMessage && files.length === 0) || isGenerating) return;

			cancelSuggestions();
			clearError();
			setInput('');
			await sendMessage({
				files,
				text: nextMessage || '请分析这些图片。'
			});
		},
		[clearError, isGenerating, sendMessage, cancelSuggestions]
	);

	const reuseMessage = useCallback((message: UIMessage) => {
		const text = getMessageText(message);

		if (!text) {
			toast.error('没有可编辑的内容');
			return;
		}

		setInput(text);
	}, []);

	const stopGeneration = useCallback(async () => {
		cancelSuggestions();
		await stop();
		setWaitingStatus(undefined);
	}, [cancelSuggestions, stop, setWaitingStatus]);
	const clearChat = useCallback(async () => {
		await stopGeneration();
		setMessages([]);
		setInput('');
		clearError();
		setDataStream([]);
	}, [stopGeneration, setMessages, clearError, setDataStream]);
	const regenerateMessage = useCallback(async () => {
		if (isGenerating) return;
		cancelSuggestions();
		clearError();
		await regenerate();
	}, [isGenerating, cancelSuggestions, clearError, regenerate]);
	return useMemo(
		() => ({
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
			stop: stopGeneration,
			regenerate: regenerateMessage
		}),
		[
			messages,
			input,
			suggestions,
			status,
			error,
			isGenerating,
			submitMessage,
			reuseMessage,
			clearChat,
			stopGeneration,
			regenerateMessage
		]
	);
}

const ActiveChatContext = createContext<ReturnType<
	typeof useChatSession
> | null>(null);

export function ActiveChatProvider({ children }: { children: ReactNode }) {
	const session = useChatSession();
	return (
		<ActiveChatContext.Provider value={session}>
			{children}
		</ActiveChatContext.Provider>
	);
}

export function useActiveChat() {
	const context = useContext(ActiveChatContext);
	if (!context)
		throw new Error('useActiveChat must be used within ActiveChatProvider');
	return context;
}
