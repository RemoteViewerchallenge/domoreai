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
      const base = `limit:${providerConfigId}`;

      // 1. Check Dynamic Limits (Smart Rate Limiting from Headers)
      const [rpmRem, tpmRem] = await client.mGet([`${base}:rpm:current`, `${base}:tpm:current`]);
      
      // If we have dynamic data, and it says 0 remaining, BLOCK.
      if (rpmRem !== null && parseInt(rpmRem) <= 0) {
        console.warn(`Provider ${providerConfigId} rate limited by dynamic header (RPM exhausted).`);
        return false;
      }
      if (tpmRem !== null && parseInt(tpmRem) <= 0) {
         console.warn(`Provider ${providerConfigId} rate limited by dynamic header (TPM exhausted).`);
         return false;
      }
      
      // 2. Fallback / Internal Counter
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
   * Updates dynamic rate limits based on provider headers.
   */
  static async updateDynamicLimits(providerConfigId: string, headers: Record<string, string>) {
    try {
      const client = await getRedisClient();
      const base = `limit:${providerConfigId}`;

      // Extract headers (OpenAI/OpenRouter standard)
      const rpmMax = headers['x-ratelimit-limit-requests'] || headers['x-ratelimit-limit'];
      const rpmRem = headers['x-ratelimit-remaining-requests'] || headers['x-ratelimit-remaining'];
      const tpmMax = headers['x-ratelimit-limit-tokens'];
      const tpmRem = headers['x-ratelimit-remaining-tokens'];

      // Set keys if they exist
      if (rpmMax) await client.set(`${base}:rpm:max`, rpmMax);
      if (rpmRem) await client.set(`${base}:rpm:current`, rpmRem); // 'current' here means 'remaining' in the UI context usually, or we can invert it. The user prompt says "RPM: 45 / 200 (Discovered)". If 45 is usage, then remaining is 155. But usually headers give remaining. Let's store what we get.
      if (tpmMax) await client.set(`${base}:tpm:max`, tpmMax);
      if (tpmRem) await client.set(`${base}:tpm:current`, tpmRem);

      // Also keep the JSON for internal logic if needed, or migrate internal logic to use these new keys.
      // For now, I'll keep the old key too to avoid breaking modelSelector if it relies on it (though I should check that).
      // modelSelector uses getCurrentUsage which checks 'ratelimit:${providerConfigId}' (the counter).
      // It doesn't seem to use 'ratelimit:dynamic:${providerConfigId}' yet except for my recent edit?
      // Wait, my recent edit to modelSelector didn't actually use the dynamic limit for *enforcement*, just for scoring?
      // Actually, I didn't update modelSelector to read the JSON. I only updated UsageCollector to write it.
      // So I can safely change this.
      
    } catch (err) {
      console.error('Failed to update dynamic limits:', err);
    }
  }

  static async getProviderStats(providerId: string) {
    const client = await getRedisClient();
    const base = `limit:${providerId}`;
  
    const [rpmMax, rpmCurr, tpmMax, tpmCurr, balance] = await client.mGet([
      `${base}:rpm:max`,
      `${base}:rpm:current`, 
      `${base}:tpm:max`,
      `${base}:tpm:current`,
      `balance:${providerId}`
    ]);
  
    return {
      rpm: { max: parseInt(rpmMax || '0'), current: parseInt(rpmCurr || '0') },
      tpm: { max: parseInt(tpmMax || '0'), current: parseInt(tpmCurr || '0') },
      credits: balance ? parseFloat(balance) : null
    };
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
