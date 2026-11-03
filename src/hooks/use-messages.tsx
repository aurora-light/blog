import type { ChatStatus } from 'ai';
import { useEffect, useState } from 'react';
import { useScrollToBottom } from './use-scroll-to-bottom';

export function useMessages({ status }: { status: ChatStatus }) {
	const {
		containerRef,
		endRef,
		isAtBottom,
		scrollToBottom,
		onViewportEnter,
		onViewportLeave,
		reset
	} = useScrollToBottom();

	const [hasSentMessage, setHasSentMessage] = useState(false);

	useEffect(() => {
		if (status === 'submitted') {
			setHasSentMessage(true);
		}
	}, [status]);

	return {
		containerRef,
		endRef,
		hasSentMessage,
		isAtBottom,
		onViewportEnter,
		onViewportLeave,
		reset,
		scrollToBottom
	};
}
