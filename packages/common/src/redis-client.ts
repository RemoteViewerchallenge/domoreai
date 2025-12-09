/**
 * Shared Redis client for packages (COC, agents, etc.)
 * Connects to the same Redis instance as apps/api
 */
import { createClient } from 'redis';

export type RedisClient = ReturnType<typeof createClient>;

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

let redisInstance: RedisClient | null = null;

export async function getRedisClient(): Promise<RedisClient> {
  if (redisInstance && redisInstance.isOpen) {
    return redisInstance;
  }

  if (!redisInstance) {
    redisInstance = createClient({ url: redisUrl });
    redisInstance.on('error', (err: unknown) => console.error('[Redis] Client Error', err));
  }

  if (!redisInstance.isOpen) {
    await redisInstance.connect();
  }

  return redisInstance;
}

/**
 * Close Redis connection (for graceful shutdown)
 */
export async function closeRedis(): Promise<void> {
  if (redisInstance && redisInstance.isOpen) {
    await redisInstance.quit();
    redisInstance = null;
  }
}
