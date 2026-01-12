
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanup() {
  try {
    const idsToDelete = [
      'mistral-api',
      'openrouter-env',
      '9062c21b-f2fc-496a-80f2-e3c77f281e33'
    ];

    console.log(`Deleting providers with IDs: ${idsToDelete.join(', ')}`);

    const result = await prisma.providerConfig.deleteMany({
      where: {
        id: { in: idsToDelete }
      }
    });

    console.log(`Deleted ${result.count} duplicate provider configurations.`);
    console.log('Remaining providers:');
    const remaining = await prisma.providerConfig.findMany();
    remaining.forEach(p => console.log(`- ${p.id} (${p.label}) [Type: ${p.type}]`));

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

cleanup();
