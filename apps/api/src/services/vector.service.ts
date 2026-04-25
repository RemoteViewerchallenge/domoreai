// A simple in-memory vector store for demonstration purposes.
// TODO: Replace this with a more robust solution like pgvector.

export interface Vector {
  id: string;
  vector: number[];
  metadata: Record<string, unknown>;
  similarity?: number;
}

export class InMemoryVectorStore {
  private vectors: Vector[] = [];

  add(vectors: Vector[]) {
    this.vectors.push(...vectors);
    console.log(`Added ${vectors.length} vectors to the store. Total vectors: ${this.vectors.length}`);
  }

  // A simple cosine similarity search
  search(queryVector: number[], topK: number): Vector[] {
    const similarities = this.vectors.map(v => {
      const dotProduct = v.vector.reduce((acc, val, i) => acc + val * queryVector[i], 0);
      const magnitudeA = Math.sqrt(v.vector.reduce((acc, val) => acc + val * val, 0));
      const magnitudeB = Math.sqrt(queryVector.reduce((acc, val) => acc + val * val, 0));
      return { ...v, similarity: dotProduct / (magnitudeA * magnitudeB) };
    });

    return similarities.sort((a, b) => b.similarity - a.similarity).slice(0, topK);
  }
}

import { prisma } from '../db.js';

export class PgVectorStore {
  async add(vectors: Vector[]) {
    for (const v of vectors) {
      const vectorString = JSON.stringify(v.vector);
      // Store vector as JSON string instead of pgvector type
      await prisma.$executeRawUnsafe(
        `INSERT INTO "VectorEmbedding" ("id", "vector", "content", "filePath", "metadata")
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT ("id") DO UPDATE SET
         "vector" = EXCLUDED."vector",
         "content" = EXCLUDED."content",
         "metadata" = EXCLUDED."metadata"`,
        v.id,
        vectorString,
        v.metadata.chunk || '',
        v.metadata.filePath || '',
        v.metadata
      );
    }
    console.log(`Added ${vectors.length} vectors to PG store.`);
  }

  async search(queryVector: number[], topK: number): Promise<Vector[]> {
    const vectorString = `[${queryVector.join(',')}]`;
    interface DbVectorResult {
      id: string;
      content: string;
      filePath: string;
      metadata: Record<string, unknown>;
      similarity: number;
    }
    const results = await prisma.$queryRawUnsafe<DbVectorResult[]>(
      `SELECT "id", "content", "filePath", "metadata", 
              1 - ("vector" <=> $1::vector) as similarity
       FROM "VectorEmbedding"
       ORDER BY "vector" <=> $1::vector
       LIMIT $2`,
      vectorString,
      topK
    );

    return results.map((r) => ({
      id: r.id,
      vector: [], // Optimization: don't return the full vector
      metadata: { ...r.metadata, chunk: r.content, filePath: r.filePath },
      similarity: r.similarity
    }));
  }
}

export const vectorStore = new PgVectorStore();

// A simple text chunking function
// Increased chunkSize to be more efficient while staying under model limits (approx 512-1024 tokens)
export const chunkText = (text: string, chunkSize: number = 2000, overlap: number = 200): string[] => {
  if (!text) return [];
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    chunks.push(text.slice(i, i + chunkSize));
    i += chunkSize - overlap;
  }
  return chunks;
};

// A placeholder for embedding generation
// TODO: Replace this with a real embedding model. Consider using a library like sentence-transformers.
import axios from 'axios';
import { ProviderManager } from './ProviderManager.js';
import { OllamaProvider } from '../utils/OllamaProvider.js';

// Simple concurrency limiter to prevent overwhelming local Ollama
class ConcurrencyLimiter {
  private queue: (() => void)[] = [];
  private activeCount = 0;
  private maxConcurrency: number;

  constructor(maxConcurrency: number) {
    this.maxConcurrency = maxConcurrency;
  }

  async run<T>(fn: () => Promise<T>): Promise<T> {
    if (this.activeCount >= this.maxConcurrency) {
      await new Promise<void>(resolve => this.queue.push(resolve));
    }
    this.activeCount++;
    try {
      return await fn();
    } finally {
      this.activeCount--;
      if (this.queue.length > 0) {
        const next = this.queue.shift();
        next?.();
      }
    }
  }
}

const embeddingLimiter = new ConcurrencyLimiter(1); // Limit to 1 concurrent request

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const createEmbedding = async (text: string, retryCount = 3): Promise<number[]> => {
  if (!text || !text.trim()) {
    return new Array<number>(1024).fill(0);
  }

  // If text is too large for the model's context, truncate it.
  // mxbai-embed-large handles up to 512 tokens. 8000 chars is a safe upper bound for truncation.
  const truncatedText = text.length > 8000 ? text.substring(0, 8000) : text;

  return embeddingLimiter.run(async () => {
    let lastError: any = null;
    
    for (let attempt = 0; attempt < retryCount; attempt++) {
      try {
        // Try to get the 'local' provider first
        const provider = ProviderManager.getProvider('local');
        if (provider && provider instanceof OllamaProvider) {
          return await provider.generateEmbedding(truncatedText);
        }

        const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
        const response = await axios.post<{ embedding: number[] }>(`${baseUrl}/api/embeddings`, {
          model: 'mxbai-embed-large',
          prompt: truncatedText,
        }, { timeout: 30000 }); // Increased timeout to 30s
        
        if (response.data?.embedding) {
          return response.data.embedding;
        }
        throw new Error('No embedding returned in response');
      } catch (error: any) {
        lastError = error;
        const isTimeout = error.code === 'ECONNABORTED' || error.message?.includes('timeout');
        const isOverload = error.response?.status === 503 || error.response?.status === 429;
        
        console.warn(`[Embedding] Attempt ${attempt + 1} failed: ${error.message}${isOverload ? ' (Overloaded)' : ''}`);
        
        if (attempt < retryCount - 1) {
          // Exponential backoff
          await sleep(Math.pow(2, attempt) * 1000);
        }
      }
    }

    console.error(`Error creating embedding after ${retryCount} attempts: "${truncatedText.substring(0, 20)}..."`, lastError);
    // Return zeros instead of random noise to avoid poisoning the vector space
    return new Array<number>(1024).fill(0);
  });
};
