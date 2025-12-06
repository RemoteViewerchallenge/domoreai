// A simple in-memory vector store for demonstration purposes.
// TODO: Replace this with a more robust solution like pgvector.

export interface Vector {
  id: string;
  vector: number[];
  metadata: Record<string, any>;
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
    const results = await prisma.$queryRawUnsafe(
      `SELECT "id", "content", "filePath", "metadata", 
              1 - ("vector" <=> $1::vector) as similarity
       FROM "VectorEmbedding"
       ORDER BY "vector" <=> $1::vector
       LIMIT $2`,
      vectorString,
      topK
    );

    return results.map(r => ({
      id: r.id,
      vector: [], // Optimization: don't return the full vector
      metadata: { ...r.metadata, chunk: r.content, filePath: r.filePath },
      similarity: r.similarity
    }));
  }
}

export const vectorStore = new PgVectorStore();

// A simple text chunking function
export const chunkText = (text: string, chunkSize: number = 1000, overlap: number = 200): string[] => {
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

// A placeholder for embedding generation
// TODO: Replace this with a real embedding model. Consider using a library like sentence-transformers.
export const createEmbedding = async (text: string): Promise<number[]> => {
  // console.log(`Creating embedding for text: "${text.substring(0, 50)}..."`);
  
  // Try to get the 'local' provider first
  const provider = ProviderManager.getProvider('local');
  if (provider && provider instanceof OllamaProvider) {
    try {
      return await provider.generateEmbedding(text);
    } catch (err) {
      console.warn('Failed to use local provider for embedding, falling back to default localhost', err);
    }
  }

  try {
    const response = await axios.post('http://localhost:11434/api/embeddings', {
      model: 'mxbai-embed-large',
      prompt: text,
    });
    return response.data.embedding;
  } catch (error) {
    console.error('Error creating embedding:', error);
    // Fallback to random vector if Ollama fails, to keep the app running
    return Array.from({ length: 1024 }, () => Math.random());
  }
};
