import { ProviderManager } from './ProviderManager.js';
import { CardAgentState } from '../types.js';

export interface AgentConfig extends CardAgentState {
  providerId?: string;
  // Add any specific properties if needed
}

export class VolcanoAgent {
  private config: AgentConfig;

  constructor(config: AgentConfig) {
    this.config = config;
  }

  getConfig() {
    return this.config;
  }

  async generate(prompt: string): Promise<string> {
    const { modelId, temperature, maxTokens } = this.config;
    
    // Auto-select provider if not explicit (simplified)
    // For now assume modelId is fully qualified or we can look it up.
    // Actually ProviderManager needs context.
    
    // If modelId is provided:
    if (modelId) {
        // We typically need to know the provider for this model.
        // But ProviderManager.getProvider requires providerId.
        // We might need to look it up from the Model table if not in config.
        // But for speed, let's assume config has it or we can find it.
        // The AgentService usually resolves the best model and provides providerId in config if possible.
        // Let's assume AgentService logic handles selection -> config.
        
        // Wait, CardAgentState has `modelId` but `providerId` might be missing if not explicitly passed?
        // Let's assume we need to resolve it if missing.
        // BUT `AgentService` sets `modelId` and `providerId` on `selectedModel`.
        // `agentConfig` passed to `startSession` MIGHT NOT have providerId if it came from `input.modelConfig`.
    }

    // Simplest implementation: use ProviderManager if we have providerId
    // If we don't have providerId, we might fail or need lookup.
    
    // Ideally AgentService passes resolved config!
    // In startSession:
    // const agentConfig = { ... }
    // createVolcanoAgent(agentConfig)
    
    // We will assume simpler logic for now to unblock build.
    // ProviderManager global usage?
    
    // Let's require providerId for now or try to split modelId if it's "provider:model" format
    let providerId = this.config.providerId || ''; 
    let actualModelId = modelId || 'gpt-4o';

    // Try to detect provider from modelId if simple and providerId is missing
    if (!providerId && modelId?.includes('/')) {
        [providerId, actualModelId] = modelId.split('/');
    }

    if (!providerId) {
        // Find if we have any active providers
        const activeProviders = ProviderManager.getProviderIds();
        console.warn(`[VolcanoAgent] ⚠️ No providerId explicit or inferable for model '${actualModelId}'. Available: ${activeProviders.join(', ')}`);
        
        // If we have ONLY ONE provider, maybe use it? No, better to be explicit or fail.
        // For now, if 'openai' exists, keep it as fallback but better warning.
        if (activeProviders.includes('openai')) {
            providerId = 'openai';
        } else if (activeProviders.length > 0) {
            // Pick the first available one as an absolute last resort emergency? 
            // Better to fail so we can fix the root cause (AgentService resolution).
            throw new Error(`Execution failed: Could not infer provider for model '${actualModelId}' and no default 'openai' provider is active.`);
        }
    }
    
    // Get Provider
    const provider = ProviderManager.getProvider(providerId);
    if (!provider) {
        const available = ProviderManager.getProviderIds().join(', ');
        throw new Error(`Provider '${providerId}' not found for agent execution (Model: ${actualModelId}). Available: ${available}`);
    }
    
    return await provider.generateCompletion({
        modelId: actualModelId,
        messages: [{ role: 'user', content: prompt }], // System prompt injected by runtime usually
        temperature: temperature || 0.7,
        max_tokens: maxTokens || 4096
    });
  }
}

export function createVolcanoAgent(config: AgentConfig): Promise<VolcanoAgent> {
  return Promise.resolve(new VolcanoAgent(config));
}
