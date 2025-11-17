// --- modelSelector.ts ---

import * as fs from 'node:fs';
import { createClient, RedisClientType } from 'redis';

// --- Error Classes ---
export class HardStopError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HardStopError';
  }
}

export class RateLimitError extends Error {
  constructor(message:string) {
    super(message);
    this.name = 'RateLimitError';
  }
}

// --- Types ---
interface Model {
  id: string;
  provider: string;
  cost: number;
  simulation: {
    onLimitExceeded: 'HARD_STOP' | 'SOFT_FAIL';
    rateLimits: {
      freeTier: {
        RPM?: number;
        RPD?: number;
      };
    };
  };
}

interface SelectionCriteria {
  model?: string;
  // Future criteria like max_cost, required_features, etc.
}

// --- Redis Client ---
// Memoized client so we don't reconnect on every call
let redisClient: RedisClientType | null = null;
const getRedisClient = async () => {
  if (redisClient) {
    return redisClient;
  }
  const client: RedisClientType = createClient();
  client.on('error', (err) => console.error('Redis Client Error', err));
  await client.connect();
  redisClient = client;
  return redisClient;
};


// --- Core Functions ---

/**
 * Loads model definitions from multiple JSON files.
 * @param paths An array of file paths to the model JSON files.
 * @returns A promise that resolves to a single array of all models.
 */
export async function loadModelCatalog(paths: string[]): Promise<Model[]> {
   const models: Model[] = [];
   for (const path of paths) {
     const data = await fs.promises.readFile(path, 'utf-8');
    models.push(...JSON.parse(data));
  }
  return models;
}

/**
 * The main orchestrator function.
 * Selects the best available model based on criteria and current usage.
 * @param criteria The desired model or capabilities.
 * @returns A promise that resolves to the selected model.
 */
export async function selectModel(criteria: SelectionCriteria): Promise<Model | null> {
  const client = await getRedisClient();
  const catalog = await loadModelCatalog(['/models/google.json', '/models/openrouter.json']);

  const now = Date.now();
  const currentMinute = Math.floor(now / 60000);
  const currentDay = Math.floor(now / 86400000);

  let candidates = catalog.filter(m => m.cost === 0); // Start with free models

  // --- 1. Handle Specific Model Request ---
  if (criteria.model) {
    const requestedModel = candidates.find(m => m.id === criteria.model);
    if (!requestedModel) return null; // Or throw an error

    // a. Check RPD (Requests Per Day)
    const rpdLimit = requestedModel.simulation.rateLimits.freeTier.RPD;
    if (rpdLimit) {
      const dayKey = `model:${requestedModel.id}:${currentDay}:day_usage`;
      const dailyUsage = parseInt((await client.get(dayKey)) || '0', 10);
      if (dailyUsage >= rpdLimit) {
        if (requestedModel.simulation.onLimitExceeded === 'HARD_STOP') {
          throw new HardStopError(`Daily limit of ${rpdLimit} reached for ${requestedModel.id}`);
        } else { // SOFT_FAIL
          // This model is exhausted, remove it from the candidate pool
          candidates = candidates.filter(m => m.id !== requestedModel.id);
          // Now proceed to the general selection logic with the reduced candidate pool
        }
      }
    }

    // b. Check RPM (Requests Per Minute)
    const rpmLimit = requestedModel.simulation.rateLimits.freeTier.RPM;
    if (rpmLimit) {
      const minuteKey = `model:${requestedModel.id}:${currentMinute}:minute_usage`;
      const minuteUsage = parseInt((await client.get(minuteKey)) || '0', 10);
      if (minuteUsage >= rpmLimit) {
        throw new RateLimitError(`Rate limit of ${rpmLimit}/min reached for ${requestedModel.id}`);
      }
    }

    // c. If we are here and the requested model is still a candidate, it's the one to use.
    // (It might have been removed by SOFT_FAIL logic above)
    if (candidates.some(m => m.id === requestedModel.id)) {
        await client.incr(`model:${requestedModel.id}:${currentDay}:day_usage`);
        await client.incr(`model:${requestedModel.id}:${currentMinute}:minute_usage`);
        await client.incr(`model:usage:${requestedModel.id}`);
        return requestedModel;
    }
  }

  // --- 2. "Maximize Free Labour" - Least Used Logic ---
  if (candidates.length === 0) return null; // No available models left

  const usageCounts = await Promise.all(
    candidates.map(async (model) => {
      const count = await client.get(`model:usage:${model.id}`);
      return { model, count: parseInt(count || '0', 10) };
    })
  );

  usageCounts.sort((a, b) => a.count - b.count);
  const bestModel = usageCounts[0].model;

  // --- 3. Update Redis and Return ---
  await client.incr(`model:${bestModel.id}:${currentDay}:day_usage`);
  await client.incr(`model:${bestModel.id}:${currentMinute}:minute_usage`);
  await client.incr(`model:usage:${bestModel.id}`);

  return bestModel;
}
