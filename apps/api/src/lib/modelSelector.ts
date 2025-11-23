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
    const allModels: Model[] = dbModels.map(m => ({
        id: m.modelId, // Use the provider's model ID (e.g. "gpt-4o")
        name: m.name,
        provider: m.provider.type, 
        providerConfigId: m.providerId,
        contextWindow: m.contextWindow || 4096,
        capabilities: {
            vision: m.hasVision,
            reasoning: m.hasReasoning,
            coding: m.hasCoding
        },
        costPer1k: m.costPer1k || (m.isFree ? 0 : 100), // Default high cost if unknown
        limitRequestRate: m.limitRequestRate,
        limitWindow: m.limitWindow
    }));

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

    // 3. Filter by Constraints
    let candidates = allModels.filter(m => {
        // Context Window
        if (criteria.minContextWindow && m.contextWindow < criteria.minContextWindow) return false;
        
        // Capabilities
        if (criteria.capabilities?.vision && !m.capabilities.vision) return false;
        if (criteria.capabilities?.reasoning && !m.capabilities.reasoning) return false;
        if (criteria.capabilities?.coding && !m.capabilities.coding) return false;

        // Cost
        if (criteria.maxCostPer1k !== undefined && m.costPer1k > criteria.maxCostPer1k) return false;

        return true;
    });

    // 4. Fallback if no candidates match
    if (candidates.length === 0) {
        console.warn("No models match criteria, returning all models sorted by cost.");
        candidates = [...allModels];
    }

    // 5. Sort by Cost (Cheapest first)
    candidates.sort((a, b) => a.costPer1k - b.costPer1k);

    return candidates;
}
