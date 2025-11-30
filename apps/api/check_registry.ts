
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' }); // Try .env.local first
dotenv.config(); // Fallback to .env

const prisma = new PrismaClient();

async function main() {
  try {
    const config = await prisma.orchestratorConfig.findUnique({ where: { id: 'global' } });
    console.log('Orchestrator Config:', config);

    if (!config?.activeTableName) {
      console.log('No active table name found.');
      return;
    }

    const tableName = config.activeTableName;
    console.log(`Active Table: ${tableName}`);

    const columns = await prisma.$queryRawUnsafe<any[]>(
      `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '${tableName}'`
    );
    console.log('Columns:', columns.map(c => c.column_name));

    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "${tableName}" LIMIT 5`
    );
    console.log('First 5 rows:', rows);

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
