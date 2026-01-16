
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const models = await prisma.model.findMany({
    where: { providerId: { contains: 'openrouter' } },
    select: { id: true, name: true, isActive: true },
    orderBy: { name: 'asc' }
  });
  
  console.log(`Found ${models.length} OpenRouter models.`);
  models.forEach(m => {
    console.log(`ID: ${m.id} | Name: ${m.name} | Active: ${m.isActive}`);
  });
  
  await prisma.$disconnect();
}

check();
