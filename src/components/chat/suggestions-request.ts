import { suggestionsSchema } from '@/lib/chat-types';
export type SuggestionsState = {
	status: 'generating' | 'complete';
	questions: string[];
};

// One active request. A newer turn invalidates even a fetcher that ignores abort.
export function createSuggestionsClient(
	fetcher: typeof fetch = (...args) => fetch(...args)
) {
	let generation = 0;
	let controller: AbortController | undefined;
	const cancel = () => {
		generation++;
		controller?.abort();
		controller = undefined;
	};
	return {
		cancel,
		async load(
			input: { question: string; reply: string; sourceSlugs: string[] },
			onChange: (state: SuggestionsState) => void
		) {
			cancel();
			const token = generation;
			const active = new AbortController();
			controller = active;
			const current = () => token === generation && !active.signal.aborted;
			onChange({ status: 'generating', questions: [] });
			try {
				const response = await fetcher('/api/chat/suggestions', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(input),
					signal: active.signal
				});
				if (!response.ok) throw new Error('Suggestions unavailable');
				const parsed = suggestionsSchema.safeParse(await response.json());
				if (!parsed.success) throw new Error('Invalid suggestions');
				if (current())
					onChange({ status: 'complete', questions: parsed.data.questions });
			} catch {
				if (current()) onChange({ status: 'complete', questions: [] });
			} finally {
				if (token === generation) controller = undefined;
			}
		}
	};
}
