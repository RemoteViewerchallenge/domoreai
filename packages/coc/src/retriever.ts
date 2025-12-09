/**
 * Retriever Module (MOCK IMPLEMENTATION)
 * 
 * This is a MOCK implementation for local development and testing.
 * In real mode, this should be replaced with production implementation
 * in packages/coc/src/prod/retriever.ts
 * 
 * Provides mock retrieval and indexing of artifacts.
 */

import { config } from './config.js';

export interface Artifact {
  id: string;
  content: string;
  metadata: Record<string, any>;
  embedding?: number[];
  indexed: string;
}

/**
 * MOCK Retriever
 * Simulates document retrieval and indexing
 */
export class Retriever {
  private store: Map<string, Artifact> = new Map();
  private seed: number;

  constructor(seed?: number) {
    this.seed = seed ?? config.mockSeed;
  }

  /**
   * MOCK: Index an artifact
   */
  async index(artifact: Omit<Artifact, 'indexed' | 'embedding'>): Promise<void> {
    // Apply mock latency
    if (config.mockLatencyMs > 0) {
      await this.sleep(config.mockLatencyMs);
    }

    const fullArtifact: Artifact = {
      ...artifact,
      indexed: new Date().toISOString(),
      embedding: this.generateMockEmbedding(artifact.content),
    };

    this.store.set(artifact.id, fullArtifact);
  }

  /**
   * MOCK: Retrieve similar artifacts
   * Returns deterministic results based on seed
   */
  async retrieve(query: string, topK: number = 5): Promise<Artifact[]> {
    // Apply mock latency
    if (config.mockLatencyMs > 0) {
      await this.sleep(config.mockLatencyMs);
    }

    // Return artifacts sorted by mock similarity
    const artifacts = Array.from(this.store.values());
    const scored = artifacts.map(artifact => ({
      artifact,
      score: this.mockSimilarity(query, artifact.content),
    }));

    scored.sort((a, b) => b.score - a.score);
    
    return scored.slice(0, topK).map(item => item.artifact);
  }

  /**
   * MOCK: Get artifact by ID
   */
  async getById(id: string): Promise<Artifact | null> {
    return this.store.get(id) || null;
  }

  /**
   * Get all indexed artifacts
   */
  getAll(): Artifact[] {
    return Array.from(this.store.values());
  }

  /**
   * Clear all artifacts
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Generate mock embedding vector
   */
  private generateMockEmbedding(content: string): number[] {
    const hash = this.hashString(content + this.seed);
    const embedding: number[] = [];
    
    // Generate 384-dimensional mock embedding
    for (let i = 0; i < 384; i++) {
      const val = Math.sin(hash + i) * 10000;
      embedding.push(val - Math.floor(val));
    }
    
    return embedding;
  }

  /**
   * Calculate mock similarity between query and content
   */
  private mockSimilarity(query: string, content: string): number {
    // Simple word overlap similarity
    const queryWords = new Set(query.toLowerCase().split(/\s+/));
    const contentWords = content.toLowerCase().split(/\s+/);
    
    let overlap = 0;
    for (const word of contentWords) {
      if (queryWords.has(word)) {
        overlap++;
      }
    }
    
    return overlap / Math.max(queryWords.size, 1);
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
