import { prisma } from '../db.js';

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
    const dbModels = await prisma.model.findMany({
        include: { provider: true }
    });

    // Map to internal Model interface
    const allModels: Model[] = dbModels.map(m => {
        // Safe provider type
        const providerType = m.provider?.type ?? 'unknown';

        // Read the resilient JSON specs layer populated by agents/ingestion
        const specs = (m.specs as any) || {};

        const computedCost =
          m.costPer1k !== null && m.costPer1k !== undefined
            ? m.costPer1k
            : (specs.costPer1k !== undefined ? specs.costPer1k : (m.isFree ? 0 : (providerType === 'ollama' ? 0 : 100)));

        return {
          id: m.modelId,
          name: m.name,
          provider: providerType,
          providerConfigId: m.providerId,
          // Prefer specs, then legacy columns (if any), then default
          contextWindow: (specs.contextWindow ?? specs.context_window ?? (m as any).contextWindow) || 4096,
          capabilities: {
            vision: (specs.hasVision ?? specs.vision ?? (m as any).hasVision) || false,
            reasoning: (specs.hasReasoning ?? specs.reasoning ?? (m as any).hasReasoning) || false,
            coding: (specs.hasCoding ?? specs.coding ?? (m as any).hasCoding) || false,
          },
          costPer1k: computedCost,
          // Rate limits moved to specs
          limitRequestRate: specs.limitRequestRate ?? (m as any).limitRequestRate ?? null,
          limitWindow: specs.limitWindow ?? (m as any).limitWindow ?? null,
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
