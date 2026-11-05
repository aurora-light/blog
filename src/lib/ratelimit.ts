import { isProductionEnvironment } from '@/lib/constants';
import { ChatbotError } from '@/lib/errors';
import { getRedisClient } from '@/lib/redis';

const MAX_MESSAGES = 10;
const TTL_SECONDS = 60 * 60;

export async function checkIpRateLimit(
	ip: string | undefined,
	scope: 'chat' | 'suggestions' = 'chat'
) {
	if (!isProductionEnvironment || !ip) {
		return;
	}

	try {
		const redis = await getRedisClient();
		if (!redis) return;

		const key =
			scope === 'chat'
				? `ip-rate-limit:${ip}`
				: `ip-rate-limit:suggestions:${ip}`;
		const [count] = await redis
			.multi()
			.incr(key)
			.expire(key, TTL_SECONDS, 'NX')
			.exec();

		if (typeof count === 'number' && count > MAX_MESSAGES) {
			throw new ChatbotError(`rate_limit:${scope}`);
		}
	} catch (error) {
		if (error instanceof ChatbotError) {
			throw error;
		}
	}
}
