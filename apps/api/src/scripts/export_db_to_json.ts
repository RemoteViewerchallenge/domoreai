import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function exportTablesToJson() {
  const backupDir = path.join(process.cwd(), 'apps', 'api', 'db_backups');

  // List of tables to export (add more as needed)
  const tables = [
    'Model',
    'Role',
    'ProviderConfig',
    'ModelConfig',
    'ModelFailure',
    'ProviderFailure',
    'ModelUsage',
    'RawDataLake',
    'FlattenedTable',
    'TableMapping',
    'Workspace',
    'WorkOrderCard',
    'Job'
  ];

  for (const table of tables) {
    try {
      // Dynamically call prisma[table].findMany()
      const data = await (prisma as any)[table.toLowerCase()].findMany();
      const filePath = path.join(backupDir, `${table}.json`);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      console.log(`✅ Exported ${table} to ${filePath}`);
    } catch (error) {
      console.warn(`⚠️ Failed to export ${table}:`, error);
    }
  }

  console.log('🎉 All tables exported to JSON.');
}

exportTablesToJson().finally(() => prisma.$disconnect());