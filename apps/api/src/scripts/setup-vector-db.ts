
import { prisma } from '../db.js';

async function main() {
  try {
    console.log('Enabling vector extension...');
    await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS vector;');
    console.log('Vector extension enabled.');
    
    console.log('Creating VectorEmbedding table if not exists...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "VectorEmbedding" (
        "id" TEXT NOT NULL,
        "vector" vector,
        "content" TEXT NOT NULL,
        "filePath" TEXT NOT NULL,
        "metadata" JSONB,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "VectorEmbedding_pkey" PRIMARY KEY ("id")
      );
    `);
    console.log('Table created.');
    
    console.log('Creating index...');
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "VectorEmbedding_filePath_idx" ON "VectorEmbedding"("filePath");
    `);
    console.log('Index created.');

  } catch (error) {
    console.error('Failed to setup vector DB:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
