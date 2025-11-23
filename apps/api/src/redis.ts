import { createClient } from 'redis';

// Define the client type based on the library
export type RedisClient = ReturnType<typeof createClient>;

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis: RedisClient = createClient({
  url: redisUrl,
});

redis.on('error', (err: unknown) => console.error('Redis Client Error', err));

// We don't await here to avoid top-level await issues in some envs, 
// but you should ensure connection before usage in index.ts
redis.connect().catch(console.error);

// Memoized client helper for services
let redisClient: RedisClient | null = null;
export async function getRedisClient(): Promise<RedisClient> {
  if (redisClient && redisClient.isOpen) {
    return redisClient;
  }
  
  if (!redis.isOpen) {
    await redis.connect();
  }
  
  redisClient = redis;
  return redisClient;
}