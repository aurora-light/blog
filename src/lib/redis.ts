import 'server-only';

import { createClient } from 'redis';
import { env } from '~/env.mjs';

let client: ReturnType<typeof createClient> | null = null;
let connectPromise: Promise<void> | null = null;

export async function getRedisClient() {
	const redisUrl = env.REDIS_URL;
	if (!redisUrl) return null;

	if (!client) {
		client = createClient({ url: redisUrl });
		client.on('error', (error) => {
			console.error('[Redis] Client error:', error);
		});
	}

	if (!client.isReady && !client.isOpen) {
		connectPromise ??= client.connect().then(() => undefined);

		try {
			await connectPromise;
		} catch (error) {
			client = null;
			throw error;
		} finally {
			connectPromise = null;
		}
	}

	return client.isReady ? client : null;
}
