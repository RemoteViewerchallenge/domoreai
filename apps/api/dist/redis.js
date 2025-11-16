import { createClient } from 'redis';
let redisClient = null;
export const getRedisClient = async () => {
    if (!redisClient) {
        redisClient = createClient({
            url: process.env.REDIS_URL || 'redis://localhost:6379'
        });
        redisClient.on('error', (err) => console.error('Redis Client Error', err));
        await redisClient.connect();
    }
    return redisClient;
};
//# sourceMappingURL=redis.js.map