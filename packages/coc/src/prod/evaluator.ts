/**
 * Production Evaluator (STUB)
 * 
 * TODO: Implement real evaluator that:
 * - Uses actual LLM-based evaluation
 * - Implements custom scoring metrics
 * - Handles human-in-the-loop feedback
 * - Tracks evaluation history
 */

export class Evaluator {
  constructor() {
    throw new Error(
      'Production Evaluator not implemented. ' +
      'Set COC_MODE=mock to use mock implementation.'
    );
  }

  async evaluate(input: string, output: string): Promise<never> {
    throw new Error('Not implemented');
  }

  async evaluateBatch(
    items: Array<{ input: string; output: string }>
  ): Promise<never> {
    throw new Error('Not implemented');
  }
}
