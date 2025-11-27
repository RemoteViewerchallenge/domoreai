
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log("Safely creating RawDataLake table...");
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "RawDataLake" (
          "id" TEXT NOT NULL,
          "provider" TEXT NOT NULL,
          "rawData" JSONB NOT NULL,
          "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      
          CONSTRAINT "RawDataLake_pkey" PRIMARY KEY ("id")
      );
    `);
    console.log("✅ RawDataLake table created (if it didn't exist).");
    
    // Verify it exists
    const result = await prisma.$queryRawUnsafe(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'RawDataLake'
    `);
    console.log("Verification:", result);

  } catch (e) {
    console.error("Error creating table:", e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
