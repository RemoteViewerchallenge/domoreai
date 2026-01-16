
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function cleanup() {
  console.log("Starting cleanup of duplicate OpenRouter models...");
  
  // 1. Delete all models from openrouter-env once.
  // This is safe because they will be re-synced correctly by the unified background loop.
  const deleted = await prisma.model.deleteMany({
    where: { providerId: 'openrouter-env' }
  });
  
  console.log(`Deleted ${deleted.count} OpenRouter models. RegistrySync will repopulate them correctly on next run.`);
  
  // 2. Also clean up any other duplicates that might have leaked from ProviderService
  // e.g. those with colons or spaces in their names that don't match our stable ID format
  const totalDeleted = await prisma.model.deleteMany({
    where: { 
      OR: [
        { name: { contains: ' (free)' } },
        { name: { contains: 'Google:' } },
        { name: { contains: 'Mistral:' } }
      ]
    }
  });
  console.log(`Deleted ${totalDeleted.count} additional display-name-based records.`);

  // 3. Delete from specialized tables to ensure consistency
  // Actually Cascading deletes in Prisma schema should handle this.

  await prisma.$disconnect();
}

cleanup();
