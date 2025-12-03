import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  try {
    const count = await prisma.providerConfig.count();
    console.log('ProviderConfig count:', count);
  } catch (e) {
    console.error('Error counting providers:', e);
  }
}
main().finally(() => prisma.$disconnect());
