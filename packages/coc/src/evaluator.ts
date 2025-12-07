/**
 * Evaluator Module (MOCK IMPLEMENTATION)
 * 
 * This is a MOCK implementation for local development and testing.
 * In real mode, this should be replaced with production implementation
 * in packages/coc/src/prod/evaluator.ts
 * 
 * Provides mock evaluation with controlled failure injection.
 */

import { config } from './config.js';

export interface EvaluationResult {
  score: number; // 0-1 range
  passed: boolean;
  feedback: string;
  metrics?: Record<string, number>;
}

/**
 * MOCK Evaluator
 * Provides deterministic evaluation with optional failure injection
 */
export class Evaluator {
  private seed: number;
  private rng: () => number;

  constructor(seed?: number) {
    this.seed = seed ?? config.mockSeed;
    
    // Seeded RNG for deterministic behavior
    let state = this.seed;
    this.rng = () => {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 0x100000000;
    };
  }

  /**
   * MOCK: Evaluate a task result
   * Returns deterministic score with optional failure injection
   */
  async evaluate(taskId: string, result: any, expected?: any): Promise<EvaluationResult> {
    // Apply mock latency
    if (config.mockLatencyMs > 0) {
      await this.sleep(config.mockLatencyMs);
    }

    // Check if we should inject a failure
    const shouldFail = this.rng() < config.mockInjectFailureRate;
    
    if (shouldFail) {
      return {
        score: 0.0,
        passed: false,
        feedback: `MOCK FAILURE INJECTION [seed=${this.seed}]: Task ${taskId} failed (injected failure)`,
        metrics: {
          accuracy: 0.0,
          completeness: 0.0,
        }
      };
    }

    // Generate deterministic score based on task ID
    const hash = this.hashString(taskId + this.seed);
    const score = 0.6 + (hash % 400) / 1000; // Score between 0.6 and 1.0

    return {
      score,
      passed: score >= 0.7,
      feedback: `MOCK EVALUATION [seed=${this.seed}]: Task ${taskId} scored ${score.toFixed(2)}`,
      metrics: {
        accuracy: score,
        completeness: Math.min(score + 0.1, 1.0),
        coherence: Math.min(score + 0.05, 1.0),
      }
    };
  }

  /**
   * MOCK: Batch evaluate multiple results
   */
  async batchEvaluate(
    evaluations: Array<{ taskId: string; result: any; expected?: any }>
  ): Promise<EvaluationResult[]> {
    return Promise.all(
      evaluations.map(({ taskId, result, expected }) => 
        this.evaluate(taskId, result, expected)
      )
    );
  }

  /**
   * Simple string hash function
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;
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
