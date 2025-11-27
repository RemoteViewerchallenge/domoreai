
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const count = await prisma.providerConfig.count();
    console.log(`ProviderConfig count: ${count}`);
    const providers = await prisma.providerConfig.findMany({ select: { label: true, type: true } });
    console.log('Providers:', providers);
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
