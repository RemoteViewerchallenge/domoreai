
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("Starting Model Deduplication...");
  
  // fetch all models with just the needed fields to identify duplicates
  // We use 'any' cast because the client might be slightly out of sync with DB
  const models = await prisma.model.findMany({
    select: {
      id: true,
      providerId: true,
      name: true,
      updatedAt: true
    }
  });

  const seen = new Map<string, typeof models[0]>();
  const toDelete: string[] = [];

  for (const m of models) {
    const key = `${m.providerId}|${m.name}`;
    if (seen.has(key)) {
      const existing = seen.get(key)!;
      // Keep the one updated more recently
      if (m.updatedAt > existing.updatedAt) {
        toDelete.push(existing.id);
        seen.set(key, m);
      } else {
        toDelete.push(m.id);
      }
    } else {
      seen.set(key, m);
    }
  }

  console.log(`Found ${toDelete.length} duplicate models to delete.`);
  
  if (toDelete.length > 0) {
    await prisma.model.deleteMany({
      where: {
        id: { in: toDelete }
      }
    });
    console.log("Deleted duplicates.");
  } else {
    console.log("No duplicates found.");
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
