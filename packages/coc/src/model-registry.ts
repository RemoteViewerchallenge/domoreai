/**
 * Model Registry Module (MOCK IMPLEMENTATION)
 * 
 * This is a MOCK implementation for local development and testing.
 * In real mode, this should be replaced with production implementation
 * in packages/coc/src/prod/model-registry.ts
 * 
 * Provides deterministic model responses based on MOCK_SEED.
 */

import { config } from './config.js';

export interface ModelResponse {
  content: string;
  model: string;
  tokensUsed: number;
  latencyMs: number;
}

/**
 * MOCK Model Registry
 * Returns deterministic responses based on seed
 */
export class ModelRegistry {
  private seed: number;
  private models: string[] = ['mock-model-1', 'mock-model-2', 'mock-model-3'];

  constructor(seed?: number) {
    this.seed = seed ?? config.mockSeed;
  }

  /**
   * Get list of available models
   */
  getModels(): string[] {
    return [...this.models];
  }

  /**
   * MOCK: Run a model with a prompt
   * Returns deterministic response based on seed and prompt
   */
  async run(model: string, prompt: string): Promise<ModelResponse> {
    // Apply mock latency
    if (config.mockLatencyMs > 0) {
      await this.sleep(config.mockLatencyMs);
    }

    // Generate deterministic response
    const hash = this.hashString(prompt + this.seed);
    const responseLength = 50 + (hash % 200);
    const content = `MOCK RESPONSE [seed=${this.seed}]: Generated output for prompt "${prompt.substring(0, 30)}..." (${responseLength} chars)`;

    return {
      content,
      model,
      tokensUsed: Math.floor(responseLength / 4),
      latencyMs: config.mockLatencyMs,
    };
  }

  /**
   * MOCK: Generate a spec from natural language
   * Returns deterministic spec based on seed
   */
  async generateSpec(input: string): Promise<any> {
    // Apply mock latency
    if (config.mockLatencyMs > 0) {
      await this.sleep(config.mockLatencyMs);
    }

    const hash = this.hashString(input + this.seed);
    
    return {
      directive: {
        id: `mock-directive-${hash}`,
        description: `MOCK: Generated from "${input.substring(0, 50)}..."`,
        tasks: [
          {
            id: 'task-1',
            role: 'worker',
            prompt: `MOCK: Process request: ${input}`,
          }
        ],
        policies: {
          maxRetries: 3,
          retryDelayMs: 1000,
        }
      }
    };
  }

  /**
   * Simple string hash function
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
