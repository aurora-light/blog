'use client';

import type { DataUIPart, UIMessage } from 'ai';
import {
	createContext,
	type Dispatch,
	type ReactNode,
	type SetStateAction,
	useContext,
	useMemo,
	useState
} from 'react';

export type WaitingStatusData = {
	phase: 'waiting' | 'still-waiting' | 'health' | 'thinking';
	message: string;
	modelId: string;
	modelName: string;
};

export type CustomUIDataTypes = {
	'waiting-status': WaitingStatusData;
};

export type CustomChatMessage = UIMessage<unknown, CustomUIDataTypes>;

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
