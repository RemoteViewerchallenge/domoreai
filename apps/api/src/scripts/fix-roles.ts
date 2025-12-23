
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixRoles() {
  console.log('Starting Role Fixer...');

  try {
    // 1. Ensure 'category' column exists (Safe Schema Patch)
    try {
      console.log('Checking for category column...');
      await prisma.$executeRawUnsafe(`ALTER TABLE "Role" ADD COLUMN IF NOT EXISTS "category" TEXT DEFAULT 'Uncategorized';`);
      console.log('Ensured "category" column exists.');
    } catch (e) {
      console.warn('Could not alter table (might already exist or permissions issue):', e);
    }

    // 2. Fetch all roles
    const roles = await prisma.role.findMany({
      include: {
        tools: { include: { tool: true } }
      }
    });
    console.log(`Found ${roles.length} roles to update.`);

    for (const role of roles) {
      // A. Fix Tools (Add research_browser)
      if (!role.tools.some(rt => rt.tool.name === 'research_browser')) {
        console.log(`Adding research_browser to Role: ${role.name}...`);
        await prisma.role.update({
          where: { id: role.id },
          data: {
            tools: {
              create: {
                tool: {
                  connectOrCreate: {
                    where: { name: 'research_browser' },
                    create: {
                      name: 'research_browser',
                      description: 'Research the web using a browser',
                      instruction: 'Use this tool to find information on the internet.',
                      schema: '{}'
                    }
                  }
                }
              }
            }
          },
        });
      }

      // B. Fix Category (for UI Grouping)
      if (!role.categoryString) {
        console.log(`Setting category to General for Role: ${role.name}...`);
        await prisma.role.update({
          where: { id: role.id },
          data: { categoryString: 'General' },
        });
      }
    }

    console.log('All roles processed successfully.');

  } catch (error) {
    console.error('Critical Error in Fix Script:', error);
  } finally {
    await prisma.$disconnect();
  }
}

void fixRoles();
