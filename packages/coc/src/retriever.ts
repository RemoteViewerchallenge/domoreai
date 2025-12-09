/**
 * Mock Retriever
 * Simulates context retrieval for agent tasks
 */

export interface RetrievalResult {
  content: string;
  relevance: number;
  source: string;
}

/**
 * Mock retriever that returns simulated context
 */
export class Retriever {
  /**
   * Retrieve relevant context for a query
   */
  async retrieve(query: string): Promise<RetrievalResult[]> {
    // Simulate async operation
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Return mock results
    return [
      {
        content: `Mock context for query: "${query}"`,
        relevance: 0.95,
        source: 'mock-database',
      },
      {
        content: 'Additional mock context with relevant information',
        relevance: 0.85,
        source: 'mock-documents',
      },
    ];
  }

  /**
   * Check if retriever is healthy
   */
  async healthCheck(): Promise<boolean> {
    return true;
  }
}
