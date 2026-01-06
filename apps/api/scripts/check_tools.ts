import { prisma } from '../src/db.js';

async function main() {
  const tools = await prisma.tool.findMany();
  console.log('Tools in DB:');
  tools.forEach(t => {
      console.log(`- ${t.name}: ${t.description}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
