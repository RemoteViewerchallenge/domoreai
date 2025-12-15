import { DynamicModelAdapter, type DynamicModel } from '../services/DynamicModelAdapter.js';
import { UsageCollector } from '../services/UsageCollector.js';
import { prisma } from '../db.js';

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
  // 1. LOAD: Fetch all models
  const config = await prisma.orchestratorConfig.findUnique({ where: { id: 'global' } });
  const tableName = criteria.tableName || config?.activeTableName || 'unified_models';
  
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

  const providers = new Map(candidates.map(m => [m.id, m]));

  // Tier 1: Free Cloud Models (Dynamic Selection)
  // Filter for models explicitly tagged as free, or having 0 cost.
  const freeModels = candidates.filter(m => m.is_free_tier || m.cost === 0);

  for (const model of freeModels) {
    const currentUsage = await UsageCollector.getCurrentUsage(model.providerConfigId);
    const limit = model.rpm_limit || 1000; // Default limit
    if (currentUsage < limit) {
      console.log(`Selected Tier 1 model (Dynamic): ${model.id}`);
      return { ...model, onComplete: createOnCompleteCallback(model) };
    }
  }

  // Tier 2: Fallback to Local (Ollama)
  const ollamaModel = Array.from(providers.values()).find(m => m.providerConfigId.startsWith('ollama'));
  if (ollamaModel) {
    console.log(`Falling back to Tier 2 Local Ollama: ${ollamaModel.id}`);
    return { ...ollamaModel, onComplete: createOnCompleteCallback(ollamaModel) };
  }

  // Tier 3: Last Resort (Paid Models if configured)
  // This part is left simple. You can add more complex logic to select among paid models.
  const paidModel = Array.from(providers.values()).find(m => m.cost > 0);
  if (paidModel) {
    console.warn(`Warning: Using Tier 3 paid model: ${paidModel.id}`);
    return { ...paidModel, onComplete: createOnCompleteCallback(paidModel) };
  }

  // If no model is found
  console.error("No free or local models available!");
  return null;
}

function createOnCompleteCallback(model: DynamicModel) {
  return (status: 'SUCCESS' | 'FAILURE' | 'RATE_LIMIT', tokensIn: number, tokensOut: number, duration: number) => {
    void UsageCollector.logRequest({
      modelId: model.id,
      providerConfigId: model.providerConfigId,
      status,
      tokensIn,
      tokensOut,
      durationMs: duration
    });
  };
}

export async function selectCandidateModels(criteria: SelectionCriteria): Promise<DynamicModel[]> {
  // 1. LOAD: Fetch all models
  const config = await prisma.orchestratorConfig.findUnique({ where: { id: 'global' } });
  const tableName = criteria.tableName || config?.activeTableName || 'unified_models';
  
  let candidates: DynamicModel[];
  try {
    candidates = await DynamicModelAdapter.loadModelsFromTable(tableName);
  } catch (error) {
    console.warn(`Failed to load from table ${tableName}, falling back to SimpleDB:`, error);
    candidates = await DynamicModelAdapter.loadModelsFromSimpleDB();
  }

  if (criteria.modelName) {
      candidates = candidates.filter(c => c.id.includes(criteria.modelName!));
  }

  // Rank candidates
  const rankedCandidates = candidates.map(model => {
    let rank = 3; // Default rank (Tier 3 - Paid)
    if (model.providerConfigId.startsWith('ollama')) {
      rank = 2; // Tier 2 - Local
    }
    if (model.is_free_tier || model.cost === 0) {
      rank = 1; // Tier 1 - Free Cloud
    }
    return { ...model, rank };
  }).sort((a, b) => a.rank - b.rank);

  return rankedCandidates;
}

/**
 * Legacy compatibility function
 */
export async function loadModelCatalog(_paths: string[]): Promise<DynamicModel[]> {
  console.warn('loadModelCatalog is deprecated. Use DynamicModelAdapter.loadModelsFromTable instead.');
  return DynamicModelAdapter.loadModelsFromSimpleDB();
}

