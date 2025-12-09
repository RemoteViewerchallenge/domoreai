/**
 * Mock Evaluator
 * Simulates evaluation and scoring of model outputs
 */

export interface EvaluationResult {
  score: number;
  feedback: string;
  metrics: Record<string, number>;
}

/**
 * Mock evaluator that scores outputs
 */
export class Evaluator {
  /**
   * Evaluate a model output
   */
  async evaluate(input: string, output: string): Promise<EvaluationResult> {
    // Simulate async operation
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Generate mock score (random for simulation)
    const score = 0.7 + Math.random() * 0.3;

    return {
      score,
      feedback: `Mock evaluation: ${score > 0.85 ? 'Excellent' : 'Good'} response`,
      metrics: {
        relevance: score,
        coherence: score * 0.95,
        completeness: score * 1.05,
      },
    };
  }

  /**
   * Batch evaluate multiple outputs
   */
  async evaluateBatch(
    items: Array<{ input: string; output: string }>
  ): Promise<EvaluationResult[]> {
    return Promise.all(items.map((item) => this.evaluate(item.input, item.output)));
  }
}
