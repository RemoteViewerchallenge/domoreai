/**
 * Rate Limit Tracker for COC
 * 
 * Captures and normalizes rate limit headers from different providers
 * and stores them in Redis for cross-process sharing and WebSocket broadcasting.
 */

import { getRedisClient, type RedisClient } from '@repo/common';

// Optional Redis client (loaded dynamically)
let redisClient: RedisClient | null = null;
let redisInitialized = false;

// Lazy-load Redis client
async function getRedis(): Promise<RedisClient | null> {
  if (redisInitialized) {
    return redisClient;
  }
  
  try {
    redisClient = await getRedisClient();
    redisInitialized = true;
    console.log('[RateLimitTracker] Connected to Redis');
    return redisClient;
  } catch (error) {
    console.warn('[RateLimitTracker] Redis not available, using in-memory fallback');
    redisInitialized = true;
    return null;
  }
}

// In-memory fallback storage
const rateLimitStore = new Map<string, {
  remaining: number;
  limit: number;
  resetTimestamp: number;
  lastUsed: number;
  totalCalls: number;
  isThrottled: boolean;
  throttledUntil?: number;
}>();

export interface RateLimitHeaders {
  remaining?: number;
  limit?: number;
  resetTimestamp?: number; // Unix timestamp
  retryAfter?: number; // seconds
}

export interface ProviderUsageStats {
  providerId: string;
  modelId: string;
  remaining: number;
  limit: number;
  resetTimestamp: number;
  lastUsed: number;
  totalCalls: number;
  isThrottled: boolean;
}

/**
 * Normalize rate limit headers from different providers
 * 
 * Providers use different header formats:
 * - OpenRouter: x-ratelimit-remaining-requests, x-ratelimit-limit-requests, x-ratelimit-reset-requests
 * - OpenAI: x-ratelimit-remaining-requests, x-ratelimit-limit-requests, x-ratelimit-reset-requests  
 * - Gemini: x-ratelimit-remaining, x-ratelimit-limit, x-ratelimit-reset (or uses 429 with Retry-After)
 * - Anthropic: anthropic-ratelimit-requests-remaining, anthropic-ratelimit-requests-limit, anthropic-ratelimit-requests-reset
 */
export function extractRateLimitHeaders(headers: Record<string, any>): RateLimitHeaders {
  const normalized: RateLimitHeaders = {};

  // Convert all header keys to lowercase for case-insensitive matching
  const lowerHeaders: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    lowerHeaders[key.toLowerCase()] = String(value);
  }

  // Try different provider formats
  // OpenRouter / OpenAI format
  if (lowerHeaders['x-ratelimit-remaining-requests']) {
    normalized.remaining = parseInt(lowerHeaders['x-ratelimit-remaining-requests'], 10);
  } else if (lowerHeaders['x-ratelimit-remaining']) {
    normalized.remaining = parseInt(lowerHeaders['x-ratelimit-remaining'], 10);
  }

  if (lowerHeaders['x-ratelimit-limit-requests']) {
    normalized.limit = parseInt(lowerHeaders['x-ratelimit-limit-requests'], 10);
  } else if (lowerHeaders['x-ratelimit-limit']) {
    normalized.limit = parseInt(lowerHeaders['x-ratelimit-limit'], 10);
  }

  if (lowerHeaders['x-ratelimit-reset-requests']) {
    normalized.resetTimestamp = parseInt(lowerHeaders['x-ratelimit-reset-requests'], 10);
  } else if (lowerHeaders['x-ratelimit-reset']) {
    const reset = lowerHeaders['x-ratelimit-reset'];
    // Could be Unix timestamp or ISO date
    if (/^\d+$/.test(reset)) {
      normalized.resetTimestamp = parseInt(reset, 10);
    } else {
      normalized.resetTimestamp = Math.floor(new Date(reset).getTime() / 1000);
    }
  }

  // Anthropic format
  if (lowerHeaders['anthropic-ratelimit-requests-remaining']) {
    normalized.remaining = parseInt(lowerHeaders['anthropic-ratelimit-requests-remaining'], 10);
  }
  if (lowerHeaders['anthropic-ratelimit-requests-limit']) {
    normalized.limit = parseInt(lowerHeaders['anthropic-ratelimit-requests-limit'], 10);
  }
  if (lowerHeaders['anthropic-ratelimit-requests-reset']) {
    // Anthropic uses ISO 8601
    normalized.resetTimestamp = Math.floor(new Date(lowerHeaders['anthropic-ratelimit-requests-reset']).getTime() / 1000);
  }

  // Retry-After header (present on 429 responses)
  if (lowerHeaders['retry-after']) {
    const retryAfter = lowerHeaders['retry-after'];
    if (/^\d+$/.test(retryAfter)) {
      normalized.retryAfter = parseInt(retryAfter, 10);
    } else {
      // HTTP date format
      const retryDate = new Date(retryAfter);
      normalized.retryAfter = Math.max(0, Math.floor((retryDate.getTime() - Date.now()) / 1000));
    }
  }

  return normalized;
}

/**
 * Store rate limit data in Redis (or in-memory fallback)
 * Note: WebSocket broadcasting should be done at the API layer, not here
 */
export async function storeRateLimitData(
  providerId: string,
  modelId: string,
  headers: RateLimitHeaders,
  isError: boolean = false
): Promise<void> {
  try {
    const key = `ratelimit:model:${providerId}:${modelId}`;
    const now = Math.floor(Date.now() / 1000);

    // Calculate values
    const remaining = headers.remaining ?? 999;
    const limit = headers.limit ?? 1000;
    const resetTimestamp = headers.resetTimestamp ?? 0;
    const isThrottled = isError || remaining === 0 || (headers.retryAfter !== undefined && headers.retryAfter > 0);
    const throttledUntil = headers.retryAfter ? now + headers.retryAfter : undefined;

    // Try Redis first
    const redis = await getRedis();
    if (redis) {
      // Store in Redis as hash with TTL
      const data = {
        remaining: String(remaining),
        limit: String(limit),
        resetTimestamp: String(resetTimestamp),
        lastUsed: String(now),
        isThrottled: String(isThrottled),
        throttledUntil: throttledUntil ? String(throttledUntil) : '',
        provider: providerId,
        model: modelId,
      };

      await redis.hSet(key, data);
      
      // Increment total calls counter
      await redis.incr(`${key}:calls`);
      
      // Set TTL to reset timestamp + 1 hour (or 1 hour default)
      const ttl = resetTimestamp > now ? resetTimestamp - now + 3600 : 3600;
      await redis.expire(key, ttl);

      console.log(`[RateLimitTracker] Stored in Redis ${providerId}/${modelId}: remaining=${remaining}, throttled=${isThrottled}`);
    } else {
      // Fallback to in-memory
      const memKey = `${providerId}:${modelId}`;
      const currentData = rateLimitStore.get(memKey);
      const totalCalls = currentData ? currentData.totalCalls + 1 : 1;

      rateLimitStore.set(memKey, {
        remaining,
        limit,
        resetTimestamp,
        lastUsed: now,
        totalCalls,
        isThrottled,
        throttledUntil,
      });

      console.log(`[RateLimitTracker] Stored in-memory ${providerId}/${modelId}: remaining=${remaining}, throttled=${isThrottled}`);
    }
  } catch (error) {
    console.error('[RateLimitTracker] Failed to store rate limit data:', error);
  }
}

/**
 * Get current rate limit status for a model
 */
export async function getRateLimitStatus(
  providerId: string,
  modelId: string
): Promise<ProviderUsageStats | null> {
  try {
    const key = `ratelimit:model:${providerId}:${modelId}`;
    const now = Math.floor(Date.now() / 1000);

    // Try Redis first
    const redis = await getRedis();
    if (redis) {
      const data = await redis.hGetAll(key);
      if (!data || Object.keys(data).length === 0) {
        return null;
      }

      const totalCalls = parseInt(await redis.get(`${key}:calls`) || '0', 10);
      const remaining = parseInt(data.remaining, 10);
      const resetTimestamp = parseInt(data.resetTimestamp, 10);
      const throttledUntil = data.throttledUntil ? parseInt(data.throttledUntil, 10) : undefined;
      
      // Check if throttle period has expired
      const isThrottled = data.isThrottled === 'true' && 
        ((throttledUntil && throttledUntil > now) || (resetTimestamp > now));

      return {
        providerId,
        modelId,
        remaining,
        limit: parseInt(data.limit, 10),
        resetTimestamp,
        lastUsed: parseInt(data.lastUsed, 10),
        totalCalls,
        isThrottled,
      };
    } else {
      // Fallback to in-memory
      const memKey = `${providerId}:${modelId}`;
      const data = rateLimitStore.get(memKey);
      
      if (!data) {
        return null;
      }

      // Check if throttle period has expired
      const isThrottled = data.isThrottled && 
        ((data.throttledUntil && data.throttledUntil > now) || (data.resetTimestamp > now));

      return {
        providerId,
        modelId,
        remaining: data.remaining,
        limit: data.limit,
        resetTimestamp: data.resetTimestamp,
        lastUsed: data.lastUsed,
        totalCalls: data.totalCalls,
        isThrottled,
      };
    }
  } catch (error) {
    console.error('[RateLimitTracker] Failed to get rate limit status:', error);
    return null;
  }
}

/**
 * Calculate a usage score for model selection
 * Higher score = better to use right now
 * 
 * Strategy:
 * - Models with no usage history get high priority (100)
 * - Models with quota remaining get scored based on % remaining
 * - Models currently throttled get very low score but not 0 (can still be emergency fallback)
 * - Factor in how recently used to promote rotation
 */
export async function calculateUsageScore(
  providerId: string,
  modelId: string
): Promise<number> {
  const status = await getRateLimitStatus(providerId, modelId);
  
  if (!status) {
    // Never used = maximum score
    return 100;
  }

  const now = Math.floor(Date.now() / 1000);
  
  // If throttled and still within throttle window, give low but non-zero score
  if (status.isThrottled) {
    const timeUntilReset = Math.max(0, status.resetTimestamp - now);
    if (timeUntilReset > 0) {
      // Score 1-10 based on how soon it resets (sooner = higher score)
      // Max wait is typically 60 seconds for retry-after
      return Math.max(1, 10 - Math.floor(timeUntilReset / 10));
    }
  }

  // Calculate base score from remaining quota (0-80 points)
  const quotaPercent = status.limit > 0 ? (status.remaining / status.limit) : 1;
  const quotaScore = Math.floor(quotaPercent * 80);

  // Add recency bonus (0-20 points) - prefer models that haven't been used recently
  const timeSinceUse = now - status.lastUsed;
  const recencyBonus = Math.min(20, Math.floor(timeSinceUse / 30)); // 1 point per 30 seconds

  return quotaScore + recencyBonus;
}

/**
 * Rank models by usage score (best to use first)
 * This allows intelligent rotation to maximize free tier usage across all providers
 */
export async function rankModelsByUsage(
  models: Array<{ provider: string; model_id: string; [key: string]: any }>
): Promise<Array<{ model: any; usageScore: number; status: ProviderUsageStats | null }>> {
  const scored = await Promise.all(
    models.map(async (m) => {
      const score = await calculateUsageScore(m.provider, m.model_id);
      const status = await getRateLimitStatus(m.provider, m.model_id);
      return {
        model: m,
        usageScore: score,
        status,
      };
    })
  );

  // Sort by usage score descending (best to use first)
  return scored.sort((a, b) => b.usageScore - a.usageScore);
}

/**
 * Get the best model to use right now from a list, considering rate limits
 * Returns null if ALL models are hard-throttled (very rare)
 */
export async function selectBestAvailableModel(
  models: Array<{ provider: string; model_id: string; [key: string]: any }>
): Promise<{ model: any; usageScore: number } | null> {
  const ranked = await rankModelsByUsage(models);
  
  if (ranked.length === 0) {
    return null;
  }

  // Return the top-ranked model
  // Even if it's throttled, we'll return it (with low score) as emergency fallback
  return {
    model: ranked[0].model,
    usageScore: ranked[0].usageScore,
  };
}

/**
 * Get usage statistics summary across all tracked models
 */
export async function getUsageSummary(): Promise<{
  totalModels: number;
  activeModels: number;
  throttledModels: number;
  totalCalls: number;
}> {
  try {
    let activeModels = 0;
    let throttledModels = 0;
    let totalCalls = 0;

    for (const [_, data] of rateLimitStore.entries()) {
      totalCalls += data.totalCalls;
      if (data.isThrottled) {
        throttledModels++;
      } else if (data.remaining > 0) {
        activeModels++;
      }
    }

    return {
      totalModels: rateLimitStore.size,
      activeModels,
      throttledModels,
      totalCalls,
    };
  } catch (error) {
    console.error('[RateLimitTracker] Failed to get usage summary:', error);
    return { totalModels: 0, activeModels: 0, throttledModels: 0, totalCalls: 0 };
  }
}
