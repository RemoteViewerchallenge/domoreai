import { type RedisClient } from './redis.js';

export class RateLimiter {
  private redis: RedisClient;

  constructor(redisClient: RedisClient) {
    this.redis = redisClient;
  }

  async checkLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
    const current = await this.redis.get(key);
    
    if (current && parseInt(current) >= limit) {
      return false;
    }
    return true;
  }

  async increment(key: string, windowSeconds: number): Promise<void> {
    const multi = this.redis.multi();
    multi.incr(key);
    multi.expire(key, windowSeconds);
    await multi.exec();
  }
}