import { db } from '../db.js';
import { getRedisClient } from '../redis.js';

export interface UsageLogData {
  modelId: string;
  providerConfigId: string;
  tokensIn: number;
  tokensOut: number;
  status: 'SUCCESS' | 'FAILURE' | 'RATE_LIMIT';
  durationMs: number;
  roleId?: string;
  userId?: string;
}

export class UsageCollector {
  /**
   * Logs usage asynchronously.
   * Fire-and-forget: does not block the API response.
   */
  /**
   * Pre-flight: Check and Increment Redis counter (Synchronous)
   * Returns true if request is allowed, false if rate limit exceeded.
   */
  static async checkAndIncrementRateLimit(providerConfigId: string, limit: number, windowSeconds: number = 60): Promise<boolean> {
    try {
      const client = await getRedisClient();
      const limitKey = `ratelimit:${providerConfigId}`;
      
      const current = await client.incr(limitKey);
      
      if (current === 1) {
        await client.expire(limitKey, windowSeconds);
      }
      
      if (current > limit) {
        return false;
      }
      
      return true;
    } catch (err) {
      console.error('Failed to check rate limit:', err);
      // Default to allowing if Redis fails, to avoid blocking all traffic
      return true;
    }
  }

  /**
   * Logs usage asynchronously.
   * Post-flight: Log token usage and cost to Postgres.
   */
  static async logRequest(data: UsageLogData): Promise<void> {
    try {
      // 1. Log to Persistent DB (Prisma ModelUsage table)
      await db.modelUsage.create({
        data: {
          userId: data.userId || 'system',
          modelConfigId: data.modelId, // This should be a ModelConfig ID
          roleId: data.roleId || 'default-role',
          promptTokens: data.tokensIn,
          completionTokens: data.tokensOut,
          cost: 0, // Calculate based on model rates if needed
          metadata: {
            status: data.status,
            duration: data.durationMs,
            providerConfigId: data.providerConfigId
          }
        }
      });

      // 2. Track errors separately for placement logic
      if (data.status === 'FAILURE') {
        const client = await getRedisClient();
        const errorKey = `errors:${data.providerConfigId}`;
        await client.incr(errorKey);
        await client.expire(errorKey, 300); // 5 minute window for error tracking
      }
      
    } catch (err) {
      console.error('Failed to log usage:', err);
    }
  }

  /**
   * Fetch error rates for your placement logic
   */
  static async getErrorRate(providerConfigId: string): Promise<number> {
    try {
      const client = await getRedisClient();
      
      const errorKey = `errors:${providerConfigId}`;
      const totalKey = `ratelimit:${providerConfigId}`;
      
      const errors = parseInt((await client.get(errorKey)) || '0');
      const total = parseInt((await client.get(totalKey)) || '0');
      
      if (total === 0) return 0;
      
      return errors / total;
    } catch (err) {
      console.error('Failed to get error rate:', err);
      return 0;
    }
  }

  /**
   * Get current usage count for rate limiting
   */
  static async getCurrentUsage(providerConfigId: string): Promise<number> {
    try {
      const client = await getRedisClient();
      const limitKey = `ratelimit:${providerConfigId}`;
      return parseInt((await client.get(limitKey)) || '0');
    } catch (err) {
      console.error('Failed to get current usage:', err);
      return 0;
    }
  }
}
