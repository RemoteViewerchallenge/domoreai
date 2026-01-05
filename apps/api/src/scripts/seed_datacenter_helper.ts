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
      category: {
        connectOrCreate: {
            where: { name: 'Infrastructure & Operations' },
            create: { name: 'Infrastructure & Operations', order: 5 }
        }
      },
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
      tools: {
        create: ['postgres', 'filesystem', 'search_codebase'].map(t => ({
          tool: {
            connectOrCreate: {
              where: { name: t },
              create: {
                name: t,
                description: `Datacenter tool: ${t}`,
                instruction: `Use the ${t} tool for database or filesystem operations.`,
                schema: '{}'
              }
            }
          }
        }))
      },
      category: {
        connectOrCreate: {
            where: { name: 'Infrastructure & Operations' },
            create: { name: 'Infrastructure & Operations', order: 5 }
        }
      },
    }
  });
  console.log('✅ Datacenter Helper role created or updated.');
}

void main().finally(() => prisma.$disconnect());