
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  },
  log: ['query', 'info', 'warn', 'error']
});

async function main() {
  console.log("Attempting to connect...");
  try {
    await prisma.$connect();
    console.log("Connected!");
    const result = await prisma.$queryRaw`SELECT 1 as result`;
    console.log("Query result:", result);
  } catch (e) {
    console.error("Connection failed:", e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
