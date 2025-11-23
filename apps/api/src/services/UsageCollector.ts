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

      // 2. Update Real-time Redis Stats (for immediate limiting)
      const client = await getRedisClient();
      const limitKey = `ratelimit:${data.providerConfigId}`;
      
      // Increment usage counter
      await client.incr(limitKey);
      
      // Set expiry if not already set (1 minute window)
      const ttl = await client.ttl(limitKey);
      if (ttl === -1) {
        await client.expire(limitKey, 60);
      }

      // Track errors separately for placement logic
      if (data.status === 'FAILURE') {
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
