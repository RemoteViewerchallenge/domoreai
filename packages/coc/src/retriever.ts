// Simple mock retriever for COC orchestrator
export class Retriever {
  async retrieve(opts: { query: string; payloadId?: string | null; topK?: number }): Promise<string[]> {
    // Mock implementation - returns empty array for now
    // In production, this would query a vector store or knowledge base
    return [];
  }

  async index(opts: { id: string; content: string; metadata?: any }): Promise<void> {
    // Mock implementation - does nothing for now
    // In production, this would store content in a vector store
  }
}