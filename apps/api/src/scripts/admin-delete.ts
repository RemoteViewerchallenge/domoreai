/**
 * Admin-Safe Delete Script
 * 
 * This script allows authorized hard deletion of records from protected tables.
 * It bypasses the database trigger by setting the session variable app.allow_delete.
 * 
 * IMPORTANT: Only use this script for legitimate data removal (e.g., GDPR requests).
 * Always review the record before deletion.
 * 
 * Usage:
 *   tsx src/scripts/admin-delete.ts --table <TableName> --id <recordId>
 * 
 * Example:
 *   tsx src/scripts/admin-delete.ts --table Role --id clx123abc456
 */

import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const envPath = path.resolve(__dirname, '../../../.env.local');
dotenv.config({ path: envPath });

const prisma = new PrismaClient();

// List of tables that support hard delete via this script
const ALLOWED_TABLES = [
  'ProviderConfig',
  'Model',
  'Role',
  'ModelConfig',
  'Workspace',
  'WorkOrderCard',
  'Project',
  'Job',
  'Task',
] as const;

type AllowedTable = typeof ALLOWED_TABLES[number];

interface DeleteOptions {
  table: AllowedTable;
  id: string;
  userId?: string;
  reason?: string;
}

async function auditLog(options: {
  tableName: string;
  recordId: string;
  action: string;
  userId: string;
  metadata?: any;
}) {
  await prisma.auditLog.create({
    data: {
      tableName: options.tableName,
      recordId: options.recordId,
      action: options.action,
      userId: options.userId,
      metadata: options.metadata || {},
    },
  });
}

async function adminDelete(options: DeleteOptions): Promise<void> {
  // Check environment variable
  const allowDestructive = process.env.APP_ALLOW_DESTRUCTIVE_DB === 'true';
  
  if (!allowDestructive) {
    throw new Error(
      'APP_ALLOW_DESTRUCTIVE_DB is not set to "true". ' +
      'This is a safety measure. Set the environment variable to proceed.'
    );
  }

  console.log('\n🔐 Admin Delete Script');
  console.log('='.repeat(50));
  console.log(`Table: ${options.table}`);
  console.log(`Record ID: ${options.id}`);
  console.log(`User: ${options.userId || 'system'}`);
  console.log(`Reason: ${options.reason || 'Not specified'}`);
  console.log('='.repeat(50));

  // Validate table name
  if (!ALLOWED_TABLES.includes(options.table)) {
    throw new Error(
      `Table "${options.table}" is not in the allowed list. ` +
      `Allowed tables: ${ALLOWED_TABLES.join(', ')}`
    );
  }

  try {
    // First, retrieve the record to show what will be deleted
    let record: any = null;
    
    switch (options.table) {
      case 'ProviderConfig':
        record = await prisma.providerConfig.findUnique({ where: { id: options.id } });
        break;
      case 'Role':
        record = await prisma.role.findUnique({ where: { id: options.id } });
        break;
      case 'ModelConfig':
        record = await prisma.modelConfig.findUnique({ where: { id: options.id } });
        break;
      case 'Workspace':
        record = await prisma.workspace.findUnique({ where: { id: options.id } });
        break;
      case 'WorkOrderCard':
        record = await prisma.workOrderCard.findUnique({ where: { id: options.id } });
        break;
      case 'Project':
        record = await prisma.project.findUnique({ where: { id: options.id } });
        break;
      case 'Job':
        record = await prisma.job.findUnique({ where: { id: options.id } });
        break;
      case 'Task':
        record = await prisma.task.findUnique({ where: { id: options.id } });
        break;
    }

    if (!record) {
      throw new Error(`Record with ID "${options.id}" not found in table "${options.table}"`);
    }

    console.log('\n📋 Record to be deleted:');
    console.log(JSON.stringify(record, null, 2));
    
    // Log the deletion attempt to audit log BEFORE deletion
    await auditLog({
      tableName: options.table,
      recordId: options.id,
      action: 'DELETE',
      userId: options.userId || 'system',
      metadata: {
        reason: options.reason,
        recordSnapshot: record,
        timestamp: new Date().toISOString(),
      },
    });

    // Execute deletion in a transaction with session variable set
    await prisma.$executeRawUnsafe(`SET LOCAL app.allow_delete = 'true';`);
    
    switch (options.table) {
      case 'ProviderConfig':
        await prisma.providerConfig.delete({ where: { id: options.id } });
        break;
      case 'Role':
        await prisma.role.delete({ where: { id: options.id } });
        break;
      case 'ModelConfig':
        await prisma.modelConfig.delete({ where: { id: options.id } });
        break;
      case 'Workspace':
        await prisma.workspace.delete({ where: { id: options.id } });
        break;
      case 'WorkOrderCard':
        await prisma.workOrderCard.delete({ where: { id: options.id } });
        break;
      case 'Project':
        await prisma.project.delete({ where: { id: options.id } });
        break;
      case 'Job':
        await prisma.job.delete({ where: { id: options.id } });
        break;
      case 'Task':
        await prisma.task.delete({ where: { id: options.id } });
        break;
    }

    console.log('\n✅ Record successfully deleted');
    console.log('📝 Deletion logged to AuditLog table');
    
  } catch (error) {
    console.error('\n❌ Error during deletion:', error);
    
    // Log the failed attempt
    await auditLog({
      tableName: options.table,
      recordId: options.id,
      action: 'DELETE_FAILED',
      userId: options.userId || 'system',
      metadata: {
        reason: options.reason,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      },
    });
    
    throw error;
  }
}

// Parse command line arguments
function parseArgs(): DeleteOptions {
  const args = process.argv.slice(2);
  const options: Partial<DeleteOptions> = {};

  for (let i = 0; i < args.length; i += 2) {
    const key = args[i];
    const value = args[i + 1];

    switch (key) {
      case '--table':
        options.table = value as AllowedTable;
        break;
      case '--id':
        options.id = value;
        break;
      case '--user':
        options.userId = value;
        break;
      case '--reason':
        options.reason = value;
        break;
    }
  }

  if (!options.table || !options.id) {
    console.error('Usage: tsx src/scripts/admin-delete.ts --table <TableName> --id <recordId> [--user <userId>] [--reason <reason>]');
    console.error(`Allowed tables: ${ALLOWED_TABLES.join(', ')}`);
    process.exit(1);
  }

  return options as DeleteOptions;
}

// Main execution
async function main() {
  const options = parseArgs();

  try {
    await adminDelete(options);
  } catch (error) {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
