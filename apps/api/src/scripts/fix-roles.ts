
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
    const roles = await prisma.role.findMany();
    console.log(`Found ${roles.length} roles to update.`);

    for (const role of roles) {
      const updates: any = {};
      let needsUpdate = false;

      // A. Fix Context Window
      // User asked for "36000 and above". We'll set a safe high default if it's low or missing.
      if (!role.maxContext || role.maxContext < 36000) {
        updates.maxContext = 128000; // Set to 128k to be safe and "above 36000"
        needsUpdate = true;
      }
      // Ensure minContext is set
      if (role.minContext === null || role.minContext === undefined) {
        updates.minContext = 0;
        needsUpdate = true;
      }

      // B. Fix Tools (Add research_browser)
      const currentTools = role.tools || [];
      if (!currentTools.includes('research_browser')) {
        updates.tools = [...currentTools, 'research_browser'];
        needsUpdate = true;
      }

      // C. Fix Category (for UI Grouping)
      if (!role.category) {
        updates.category = 'General';
        needsUpdate = true;
      }

      // Apply Updates
      if (needsUpdate) {
        console.log(`Updating Role: ${role.name}...`);
        await prisma.role.update({
          where: { id: role.id },
          data: updates,
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

fixRoles();
