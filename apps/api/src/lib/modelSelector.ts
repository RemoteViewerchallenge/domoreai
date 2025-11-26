import { db } from '../db.js';

export interface SelectionCriteria {
  model?: string; // Specific override
  
  // Role-Based Constraints (The "Abstract" Requirements)
  minContextWindow?: number;
  capabilities?: {
    vision?: boolean;     // from role.needsVision
    reasoning?: boolean;  // from role.needsReasoning
    coding?: boolean;     // from role.needsCoding
  };
  
  // Session Constraints
  maxCostPer1k?: number; // To enforce free/cheap tiers
}

export interface Model {
    id: string;
    name: string;
    provider: string;
    providerConfigId: string; // Added for rate limiting
    contextWindow: number;
    capabilities: {
        vision: boolean;
        reasoning: boolean;
        coding: boolean;
    };
    costPer1k: number;
    limitRequestRate?: number | null;
    limitWindow?: number | null;
}

export async function selectCandidateModels(criteria: SelectionCriteria): Promise<Model[]> {
    // 1. Fetch all models from DB
    const dbModels = await db.model.findMany({
        include: { provider: true }
    });

    // Map to internal Model interface
    const allModels: Model[] = dbModels.map(m => {
        const providerType = m.provider.type;
        const computedCost =
          m.costPer1k !== null && m.costPer1k !== undefined
            ? m.costPer1k
            : (m.isFree ? 0 : (providerType === 'ollama' ? 0 : 100));

        return {
          id: m.modelId,
          name: m.name,
          provider: providerType,
          providerConfigId: m.providerId,
          contextWindow: m.contextWindow || 4096,
          capabilities: {
            vision: m.hasVision,
            reasoning: m.hasReasoning,
            coding: m.hasCoding,
          },
          costPer1k: computedCost,
          limitRequestRate: m.limitRequestRate,
          limitWindow: m.limitWindow,
        };
    });

    // 2. Specific Override
    if (criteria.model) {
        const found = allModels.find(m => m.id === criteria.model);
        if (found) {
            // If specific model requested, return it as the only candidate (or top candidate)
            // But we might want fallbacks even for specific overrides if they fail?
            // For now, let's return it as primary.
            return [found, ...allModels.filter(m => m.id !== criteria.model)]; 
        }
        console.warn(`Requested model ${criteria.model} not found, falling back to dynamic selection.`);
    }

    // 3. Filter by Constraints (with progressive relaxation)
    const passesStrict = (m: Model): boolean => {
    if (criteria.minContextWindow && (m.contextWindow || 0) < criteria.minContextWindow) return false;
    if (criteria.capabilities?.vision && !m.capabilities.vision) return false;
    if (criteria.capabilities?.reasoning && !m.capabilities.reasoning) return false;
    if (criteria.capabilities?.coding && !m.capabilities.coding) return false;
    if (criteria.maxCostPer1k !== undefined && m.costPer1k > criteria.maxCostPer1k) return false;
    return true;
    };
    
    const passesIgnoreCapabilities = (m: Model): boolean => {
    if (criteria.minContextWindow && (m.contextWindow || 0) < criteria.minContextWindow) return false;
    // Always enforce cost constraints
    if (criteria.maxCostPer1k !== undefined && m.costPer1k > criteria.maxCostPer1k) return false;
    // Ignore capabilities entirely here
    return true;
    };
    
    let candidates = allModels.filter(passesStrict);
    
    // 4a. If no candidates, relax capability requirements BUT NEVER COST
    if (candidates.length === 0 && (criteria.capabilities?.vision || criteria.capabilities?.reasoning || criteria.capabilities?.coding)) {
    candidates = allModels.filter(passesIgnoreCapabilities);
    }
    
    // 4b. Final fallback: still enforce cost, ignore all other constraints
    if (candidates.length === 0) {
    console.warn('No models match strict or relaxed-capability criteria; falling back to cost-only filter.');
    candidates = allModels.filter(m => (criteria.maxCostPer1k === undefined) || (m.costPer1k <= criteria.maxCostPer1k));
    }
    
    // 5. Sort by Cost (Cheapest first)
    candidates.sort((a, b) => (a.costPer1k ?? Number.POSITIVE_INFINITY) - (b.costPer1k ?? Number.POSITIVE_INFINITY));
    
    return candidates;
    }
