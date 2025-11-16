import { createClient } from 'redis';

<<<<<<< HEAD
let redisClient: any | null = null;

export const getRedisClient = async (): Promise<any> => {
  if (!redisClient) {
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    redisClient.on('error', (err: any) => console.error('Redis Client Error', err));
    await redisClient.connect();
  }
  return redisClient;
=======
let redisClient;

export const getRedisClient = async () => {
    if (!redisClient) {
        redisClient = createClient({
            url: process.env.REDIS_URL || 'redis://localhost:6379'
        });

        redisClient.on('error', (err) => console.log('Redis Client Error', err));

        await redisClient.connect();
    }
    return redisClient;
>>>>>>> feature-rate-limiter
};
