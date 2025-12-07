/**
 * Mock Model Registry
 * Provides a simple in-memory registry of available models
 */

export interface Model {
  id: string;
  name: string;
  provider: string;
  cost: number;
}

/**
 * Mock model registry with a few example models
 */
export class ModelRegistry {
  private models: Map<string, Model>;

  constructor() {
    this.models = new Map([
      [
        'mock-gpt-4',
        {
          id: 'mock-gpt-4',
          name: 'GPT-4 (Mock)',
          provider: 'openai',
          cost: 0,
        },
      ],
      [
        'mock-claude-3',
        {
          id: 'mock-claude-3',
          name: 'Claude 3 (Mock)',
          provider: 'anthropic',
          cost: 0,
        },
      ],
      [
        'mock-gemini-pro',
        {
          id: 'mock-gemini-pro',
          name: 'Gemini Pro (Mock)',
          provider: 'google',
          cost: 0,
        },
      ],
    ]);
  }

  /**
   * Get all available models
   */
  getModels(): Model[] {
    return Array.from(this.models.values());
  }

  /**
   * Get a specific model by ID
   */
  getModel(id: string): Model | undefined {
    return this.models.get(id);
  }

  /**
   * Check if a model exists
   */
  hasModel(id: string): boolean {
    return this.models.has(id);
  }

  /**
   * Get model IDs
   */
  getModelIds(): string[] {
    return Array.from(this.models.keys());
  }
}
