import { DynamicModelAdapter, type DynamicModel } from '../services/DynamicModelAdapter.js';
import { UsageCollector } from '../services/UsageCollector.js';
import { getRedisClient } from '../redis.js';

// --- Error Classes ---
export class HardStopError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HardStopError';
  }
}

export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitError';
  }
}

// --- Types ---
export interface SelectionCriteria {
  modelName?: string;    // e.g. "gpt-4"
  groupId?: string;      // e.g. "reasoning_models"
  maxCost?: number;
  tableName?: string;    // Which Data Lake table to query (default: 'unified_models')
}

interface ScoredModel {
  model: DynamicModel;
  score: number;
  reasons: string[];
}

export interface SelectedModel extends DynamicModel {
  onComplete?: (status: 'SUCCESS' | 'FAILURE' | 'RATE_LIMIT', tokensIn: number, tokensOut: number, duration: number) => void;
}

/**
 * The main orchestrator function with configurable score-based selection.
 * Reads your custom Data Lake table and applies dynamic placement logic.
 * 
 * @param criteria The desired model or capabilities
 * @returns A promise that resolves to the selected model with tracking callback
 */
export async function selectModel(criteria: SelectionCriteria): Promise<SelectedModel | null> {
  const client = await getRedisClient();

  // 1. LOAD: Fetch your custom rows from the Data Lake table
  // These rows now contain your 'priority', 'group_id', etc.
  const tableName = criteria.tableName || 'unified_models';
  let candidates: DynamicModel[];
  
  try {
    candidates = await DynamicModelAdapter.loadModelsFromTable(tableName);
  } catch (error) {
    console.warn(`Failed to load from table ${tableName}, falling back to SimpleDB:`, error);
    candidates = await DynamicModelAdapter.loadModelsFromSimpleDB();
  }

  if (candidates.length === 0) {
    console.warn('No models available in catalog');
    return null;
  }

  // 2. FILTER: Basic hard constraints
  let pool = candidates.filter(m => {
    // Filter by specific model name
    if (criteria.modelName && m.id !== criteria.modelName) return false;
    
    // Filter by group_id (your custom column)
    if (criteria.groupId && m.group_id !== criteria.groupId) return false;
    
    // Filter by max cost
    if (criteria.maxCost !== undefined && m.cost > criteria.maxCost) return false;
    
    return true;
  });

  // 2.5 SAFETY CHECK: Filter out anything that isn't explicitly marked free
  // This protects you if you accidentally synced a paid model to the DB
  const safeCandidates = pool.filter(m => {
    // If your DB says it has a cost, block it
    if (m.cost > 0) {
      console.warn(`SAFETY BLOCKED: Model ${m.id} has a cost > 0 (${m.cost}). Skipping to prevent spending.`);
      return false;
    }
    // Double-check the is_free_tier flag if it exists
    if (m.is_free_tier === false) {
      console.warn(`SAFETY BLOCKED: Model ${m.id} is not marked as free tier. Skipping.`);
      return false;
    }
    return true;
  });

  if (safeCandidates.length === 0) {
    console.error('SAFE MODE: No free models available. Request aborted to prevent spending.');
    console.error('Original pool size:', pool.length, 'After safety filter:', safeCandidates.length);
    throw new Error('SAFE MODE: No free models available. Request aborted to prevent spending.');
  }

  pool = safeCandidates;

  if (pool.length === 0) {
    console.warn('No models match the criteria:', criteria);
    return null;
  }

  // 3. SCORE: Apply your "Dynamic Placement Logic"
  const scoredModels: ScoredModel[] = await Promise.all(pool.map(async (m) => {
    let score = m.priority || 50; // Default score from your table
    const reasons: string[] = [`Base Priority: ${score}`];

    // Logic A: Rate Limits (Redis)
    const currentUsage = await UsageCollector.getCurrentUsage(m.providerConfigId);
    const limit = m.rpm_limit || 1000;
    
    if (currentUsage >= limit) {
      score = -1000; // Hard Fail
      reasons.push('Rate Limit Exceeded');
    } else if (currentUsage > limit * 0.8) {
      score -= 30; // Soft penalty for nearing limit
      reasons.push(`Near Rate Limit (${currentUsage}/${limit})`);
    }

    // Logic B: Error Rate Penalty (Feedback Loop)
    // If this provider failed recently, lower its score
    if (m.error_penalty) {
      const errorRate = await UsageCollector.getErrorRate(m.providerConfigId);
      if (errorRate > 0.1) { // >10% errors
        score -= 50;
        reasons.push(`High Error Rate: ${(errorRate * 100).toFixed(1)}%`);
      }
    }

    // Logic C: Cost Preference (lower cost = higher score)
    if (m.cost === 0) {
      score += 20; // Bonus for free models
      reasons.push('Free Tier Bonus');
    } else {
      score -= m.cost * 10; // Penalty proportional to cost
      reasons.push(`Cost Penalty: -${(m.cost * 10).toFixed(1)}`);
    }

    // Logic D: Target Usage Distribution
    // If you want to balance load across providers (e.g., 80% to Key A, 20% to Key B)
    if (m.target_usage_percent) {
      // This is a simplified version - you could implement more sophisticated load balancing
      const randomFactor = Math.random() * 100;
      if (randomFactor < m.target_usage_percent) {
        score += 10;
        reasons.push('Target Usage Distribution Match');
      }
    }

    // Logic E: Random Jitter (to prevent "thundering herd" on the top model)
    const jitter = Math.random() * 5;
    score += jitter;
    reasons.push(`Jitter: +${jitter.toFixed(2)}`);

    return { model: m, score, reasons };
  }));

  // 4. SELECT: Sort by score (highest first)
  scoredModels.sort((a, b) => b.score - a.score);
  
  const winner = scoredModels[0];

  if (!winner || winner.score < 0) {
    console.warn("No suitable models found. Top rejection:", winner?.reasons);
    return null;
  }

  console.log(`Selected model: ${winner.model.id} (score: ${winner.score.toFixed(2)})`, winner.reasons);

  // 5. RETURN & TRACK
  // We return a wrapped object that knows how to log its own completion
  return {
    ...winner.model,
    // Attach a "done" callback for the router to call
    onComplete: (status: 'SUCCESS' | 'FAILURE' | 'RATE_LIMIT', tokensIn: number, tokensOut: number, duration: number) => {
      UsageCollector.logRequest({
        modelId: winner.model.id,
        providerConfigId: winner.model.providerConfigId,
        status,
        tokensIn,
        tokensOut,
        durationMs: duration
      });
    }
  };
}

/**
 * Legacy compatibility function
 */
export async function loadModelCatalog(paths: string[]): Promise<DynamicModel[]> {
  console.warn('loadModelCatalog is deprecated. Use DynamicModelAdapter.loadModelsFromTable instead.');
  return DynamicModelAdapter.loadModelsFromSimpleDB();
}

