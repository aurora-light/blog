'use client';

import type { DataUIPart } from 'ai';
import type { CustomUIDataTypes, WaitingStatusData } from '@/lib/chat-types';
export type {
	CustomChatMessage,
	CustomUIDataTypes,
	WaitingStatusData
} from '@/lib/chat-types';
import {
	createContext,
	type Dispatch,
	type ReactNode,
	type SetStateAction,
	useContext,
	useMemo,
	useState
} from 'react';

type DataStreamContextValue = {
	dataStream: DataUIPart<CustomUIDataTypes>[];
	setDataStream: Dispatch<SetStateAction<DataUIPart<CustomUIDataTypes>[]>>;
	waitingStatus: WaitingStatusData | undefined;
	setWaitingStatus: Dispatch<SetStateAction<WaitingStatusData | undefined>>;
};

const DataStreamContext = createContext<DataStreamContextValue | null>(null);

export function DataStreamProvider({ children }: { children: ReactNode }) {
	const [dataStream, setDataStream] = useState<DataUIPart<CustomUIDataTypes>[]>(
		[]
	);
	const [waitingStatus, setWaitingStatus] = useState<WaitingStatusData>();

	const value = useMemo(
		() => ({ dataStream, setDataStream, setWaitingStatus, waitingStatus }),
		[dataStream, waitingStatus]
	);

	return (
		<DataStreamContext.Provider value={value}>
			{children}
		</DataStreamContext.Provider>
	);
}

export function useDataStream() {
	const context = useContext(DataStreamContext);

	if (!context) {
		throw new Error('useDataStream must be used within a DataStreamProvider');
	}

	return context;
}
