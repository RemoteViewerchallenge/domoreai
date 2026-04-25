import { ProviderManager } from './ProviderManager.js';
import { CardAgentState } from '../types.js';

export interface AgentConfig extends CardAgentState {
  providerId?: string;
  internalId?: string;
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

  async generate(prompt: string): Promise<{ text: string, usage?: any }> {
    const { modelId, temperature, maxTokens } = this.config;
    
    // ...
    let providerId = this.config.providerId || ''; 
    let actualModelId = modelId || 'gpt-4o';

    if (!providerId && modelId?.includes('/')) {
        [providerId, actualModelId] = modelId.split('/');
    }

    if (!providerId) {
        const activeProviders = ProviderManager.getProviderIds();
        if (activeProviders.includes('openai')) {
            providerId = 'openai';
        } else if (activeProviders.length > 0) {
            throw new Error(`Execution failed: Could not infer provider for model '${actualModelId}' and no default 'openai' provider is active.`);
        }
    }
    
    const provider = ProviderManager.getProvider(providerId);
    if (!provider) {
        throw new Error(`Provider '${providerId}' not found for agent execution.`);
    }
    
    return await provider.generateCompletion({
        modelId: actualModelId,
        messages: [{ role: 'user', content: prompt }], 
        temperature: temperature || 0.7,
        max_tokens: maxTokens || 1024 
    });
  }
}

export function createVolcanoAgent(config: AgentConfig): Promise<VolcanoAgent> {
  return Promise.resolve(new VolcanoAgent(config));
}
