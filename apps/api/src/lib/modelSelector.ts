
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
    contextWindow: number;
    capabilities: {
        vision: boolean;
        reasoning: boolean;
        coding: boolean;
    };
    costPer1k: number;
}

// Mock database of models
const MOCK_MODELS: Model[] = [
    { 
        id: 'gpt-4o', 
        name: 'GPT-4o', 
        provider: 'openai', 
        contextWindow: 128000, 
        capabilities: { vision: true, reasoning: true, coding: true },
        costPer1k: 0.03 // Mock cost
    },
    { 
        id: 'claude-3-5-sonnet', 
        name: 'Claude 3.5 Sonnet', 
        provider: 'anthropic', 
        contextWindow: 200000, 
        capabilities: { vision: true, reasoning: true, coding: true },
        costPer1k: 0.015
    },
    { 
        id: 'llama-3.1-70b', 
        name: 'Llama 3.1 70B', 
        provider: 'groq', 
        contextWindow: 8192, 
        capabilities: { vision: false, reasoning: true, coding: true },
        costPer1k: 0 // Free tier simulation
    },
    { 
        id: 'mistral-large', 
        name: 'Mistral Large', 
        provider: 'mistral', 
        contextWindow: 32000, 
        capabilities: { vision: false, reasoning: true, coding: true },
        costPer1k: 0.008
    }
];

export async function selectModel(criteria: SelectionCriteria): Promise<Model> {
    // 1. Specific Override
    if (criteria.model) {
        const found = MOCK_MODELS.find(m => m.id === criteria.model);
        if (found) return found;
        console.warn(`Requested model ${criteria.model} not found, falling back to dynamic selection.`);
    }

    // 2. Filter by Constraints
    let candidates = MOCK_MODELS.filter(m => {
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

    // 3. Fallback if no candidates match
    if (candidates.length === 0) {
        console.warn("No models match criteria, returning default.");
        return MOCK_MODELS[0]; // Default to best available
    }

    // 4. Sort by Cost (Cheapest first)
    candidates.sort((a, b) => a.costPer1k - b.costPer1k);

    return candidates[0];
}
