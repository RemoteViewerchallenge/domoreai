
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('Testing DB Connection...');
  try {
    const result = await prisma.$queryRaw`SELECT 1 as result`;
    console.log('DB Connection Successful:', result);
    
    const config = await prisma.orchestratorConfig.findUnique({ where: { id: 'global' } });
    console.log('Orchestrator Config:', config);
  } catch (e) {
    console.error('DB Connection Failed:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
