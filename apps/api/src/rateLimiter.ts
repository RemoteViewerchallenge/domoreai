export interface IAtomicRedisClient {
  get(key: string): Promise<string | null>;
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<boolean>;
  multi(): any;
}

export class RateLimiter {
  private redis: IAtomicRedisClient;

  constructor(redisClient: IAtomicRedisClient) {
    this.redis = redisClient;
  }

  /**
   * Atomically checks and increments the rate limit counter.
   * Returns true if request is allowed, false if limit exceeded.
   */
  async checkAndIncrement(key: string, limit: number, windowSeconds: number): Promise<boolean> {
    const current = await this.redis.incr(key);
    
    // If this is the first request (current === 1), set the expiry.
    // Note: There is a tiny race here where if the process crashes after incr but before expire,
    // the key might persist without expiry. Lua script avoids this, but this is generally acceptable.
    // If strict atomicity for expiry is required, we'd need eval support in the interface.
    if (current === 1) {
      await this.redis.expire(key, windowSeconds);
    }
    
    return current <= limit;
  }
}