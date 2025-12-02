// A simple in-memory vector store for demonstration purposes.
// TODO: Replace this with a more robust solution like pgvector.

interface Vector {
  id: string;
  vector: number[];
  metadata: Record<string, any>;
}

class InMemoryVectorStore {
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

export const vectorStore = new InMemoryVectorStore();

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
// TODO: Replace this with a real embedding model
export const createEmbedding = (text: string): number[] => {
  console.log(`Creating embedding for text: "${text.substring(0, 50)}..."`);
  // For demonstration purposes, we'll create a random 1536-dimensional vector
  return Array.from({ length: 1536 }, () => Math.random());
};
