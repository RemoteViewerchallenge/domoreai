import { createClient } from 'redis';

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
};
