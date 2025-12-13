import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  await prisma.role.upsert({
    where: { name: 'Datacenter Helper' },
    update: {
      basePrompt: `You are a Datacenter Helper AI. You are an expert database administrator and system integrator with full access to manage database schemas, run migrations, backup data, and perform complex data operations. You have tools to execute SQL queries, manage database tables, search codebases, and access file systems for comprehensive data center management.

Your capabilities include:
- Database schema management and migrations
- SQL query execution and optimization
- Data backup and restoration
- Table creation, modification, and deletion
- Codebase analysis for database-related changes
- File system operations for data management
- Automated backup procedures before schema changes

Always prioritize data safety - create backups before making destructive changes, validate queries before execution, and ensure data integrity.`,
      needsReasoning: true,
      needsCoding: true,
      needsTools: true,
      needsUncensored: true,
      tools: ['postgres', 'filesystem', 'search_codebase'],
      category: 'Infrastructure & Operations',
      minContext: 128000,
      maxContext: 1000000,
      allowedDirectories: [
        'apps/api/db_backups',
        'apps/api/prisma',
        'packages/common',
        'apps/api/src',
        'apps/ui/src'
      ]
    },
    create: {
      name: 'Datacenter Helper',
      basePrompt: `You are a Datacenter Helper AI. You are an expert database administrator and system integrator with full access to manage database schemas, run migrations, backup data, and perform complex data operations. You have tools to execute SQL queries, manage database tables, search codebases, and access file systems for comprehensive data center management.

Your capabilities include:
- Database schema management and migrations
- SQL query execution and optimization
- Data backup and restoration
- Table creation, modification, and deletion
- Codebase analysis for database-related changes
- File system operations for data management
- Automated backup procedures before schema changes

Always prioritize data safety - create backups before making destructive changes, validate queries before execution, and ensure data integrity.`,
      needsReasoning: true,
      needsCoding: true,
      needsTools: true,
      needsUncensored: true,
      tools: ['postgres', 'filesystem', 'search_codebase'],
      category: 'Infrastructure & Operations',
      minContext: 128000,
      maxContext: 1000000,
      allowedDirectories: [
        'apps/api/db_backups',
        'apps/api/prisma',
        'packages/common',
        'apps/api/src',
        'apps/ui/src'
      ]
    }
  });
  console.log('✅ Datacenter Helper role created or updated.');
}

main().finally(() => prisma.$disconnect());