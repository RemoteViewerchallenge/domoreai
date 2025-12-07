/**
 * Production Model Registry (STUB)
 * 
 * TODO: Implement real model registry that:
 * - Connects to actual model providers (OpenAI, Anthropic, Google, etc.)
 * - Manages API keys and authentication
 * - Handles rate limiting and quotas
 * - Provides real cost tracking
 */

export class ModelRegistry {
  constructor() {
    throw new Error(
      'Production ModelRegistry not implemented. ' +
      'Set COC_MODE=mock to use mock implementation.'
    );
  }

  getModels(): never {
    throw new Error('Not implemented');
  }

  getModel(id: string): never {
    throw new Error('Not implemented');
  }

  hasModel(id: string): never {
    throw new Error('Not implemented');
  }

  getModelIds(): never {
    throw new Error('Not implemented');
  }
}
