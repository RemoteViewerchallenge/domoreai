
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("Cleaning up failed migration entry...");
  
  try {
    await prisma.$executeRawUnsafe(`DELETE FROM "_prisma_migrations" WHERE migration_name = '20260105163803_move_keys_to_env_and_cleanup';`);
    console.log("Deleted failed migration entry from _prisma_migrations.");
  } catch (e) {
    console.error("Failed to delete entry (it might not exist or table name is different):", e);
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
