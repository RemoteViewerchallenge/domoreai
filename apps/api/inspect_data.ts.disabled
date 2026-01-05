
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  try {
    const config = await prisma.orchestratorConfig.findUnique({ where: { id: 'global' } });
    const tableName = config?.activeTableName || 'unified_models';
    console.log(`Active Table: ${tableName}`);

    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT model_id, model_name, provider FROM "${tableName}" LIMIT 10`
    );
    
    console.log('Sample Data:');
    console.table(rows);
    
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
