export type ModelAvailability = 'available' | 'impacted' | 'unknown';

const CACHE_TTL_MS = 30_000;
const UNKNOWN_TTL_MS = 5_000;
const MAX_CACHE_ENTRIES = 32;
const cache = new Map<
	string,
	{
		expiresAt: number;
		result: Promise<ModelAvailability>;
	}
>();

function parseAvailability(
	data: unknown,
	modelId: string,
	componentId?: string
): ModelAvailability {
	if (!data || typeof data !== 'object') return 'unknown';
	const payload = data as Record<string, unknown>;
	// Optional model-specific endpoint: { models: { "model-id": "available" } }.
	if (payload.models && typeof payload.models === 'object') {
		const value = (payload.models as Record<string, unknown>)[modelId];
		return value === 'available' || value === 'impacted' ? value : 'unknown';
	}
	// Statuspage summary.json: scope to a component when configured.
	if (componentId) {
		if (!Array.isArray(payload.components)) return 'unknown';
		const component = payload.components.find(
			(item) => item?.id === componentId
		);
		if (component?.status === 'operational') return 'available';
		return [
			'degraded_performance',
			'partial_outage',
			'major_outage',
			'under_maintenance'
		].includes(component?.status)
			? 'impacted'
			: 'unknown';
	}
	const indicator = (payload.status as { indicator?: unknown } | undefined)
		?.indicator;
	if (indicator === 'none') return 'available';
	return ['minor', 'major', 'critical', 'maintenance'].includes(
		String(indicator)
	)
		? 'impacted'
		: 'unknown';
}

/** Public status information only; never invokes a model or sends API credentials. */
export function healthTimeChecker(modelId: string): Promise<ModelAvailability> {
	const endpoint = process.env.AI_STATUS_URL;
	const componentId = process.env.AI_STATUS_COMPONENT_ID;
	if (!endpoint) return Promise.resolve('unknown');
	try {
		if (new URL(endpoint).protocol !== 'https:')
			return Promise.resolve('unknown');
	} catch {
		return Promise.resolve('unknown');
	}
	const key = JSON.stringify([endpoint, componentId, modelId]);
	const cached = cache.get(key);
	if (cached && cached.expiresAt > Date.now()) return cached.result;
	const entry = {
		expiresAt: Date.now() + CACHE_TTL_MS,
		result: Promise.resolve<ModelAvailability>('unknown')
	};
	entry.result = (async (): Promise<ModelAvailability> => {
		try {
			const response = await fetch(endpoint, {
				cache: 'no-store',
				signal: AbortSignal.timeout(2000),
				headers: { Accept: 'application/json' }
			});
			if (!response.ok) return 'unknown';
			return parseAvailability(await response.json(), modelId, componentId);
		} catch {
			return 'unknown';
		}
	})().then((value) => {
		entry.expiresAt =
			Date.now() + (value === 'unknown' ? UNKNOWN_TTL_MS : CACHE_TTL_MS);
		return value;
	});
	cache.set(key, entry);
	if (cache.size > MAX_CACHE_ENTRIES) cache.delete(cache.keys().next().value!);
	return entry.result;
}
