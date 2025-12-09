/**
 * Production Retriever (STUB)
 * 
 * TODO: Implement real retriever that:
 * - Connects to vector database or search engine
 * - Performs semantic search
 * - Handles embeddings generation
 * - Manages document indexing
 */

export class Retriever {
  constructor() {
    throw new Error(
      'Production Retriever not implemented. ' +
      'Set COC_MODE=mock to use mock implementation.'
    );
  }

  async retrieve(query: string): Promise<never> {
    throw new Error('Not implemented');
  }

  async healthCheck(): Promise<never> {
    throw new Error('Not implemented');
  }
}
