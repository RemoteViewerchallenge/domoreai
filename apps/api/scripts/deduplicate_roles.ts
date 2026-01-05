
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("Starting Role Deduplication...");
  
  const roles = await prisma.role.findMany({
    select: {
      id: true,
      name: true,
      updatedAt: true
    }
  });

  const seen = new Map<string, typeof roles[0]>();
  const toDelete: string[] = [];

  for (const r of roles) {
    const key = r.name; // Role names must be unique
    if (seen.has(key)) {
      const existing = seen.get(key)!;
      if (r.updatedAt > existing.updatedAt) {
        toDelete.push(existing.id);
        seen.set(key, r);
      } else {
        toDelete.push(r.id);
      }
    } else {
      seen.set(key, r);
    }
  }

  console.log(`Found ${toDelete.length} duplicate roles to delete.`);
  
  if (toDelete.length > 0) {
    await prisma.role.deleteMany({
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
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
