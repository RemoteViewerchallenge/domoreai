import { PrismaClient } from '@prisma/client';
import { db } from '../src/db.js';
import { modelRegistry } from '../src/db/schema.js';

const prisma = new PrismaClient();

async function compareDatabases() {
  console.log('🔍 Comparing Prisma vs Drizzle Database Access\n');
  
  // Check Prisma
  const prismaModels = await prisma.model.count();
  const prismaCaps = await prisma.modelCapabilities.count();
  
  console.log('=== PRISMA ===');
  console.log(`Models: ${prismaModels}`);
  console.log(`Capabilities: ${prismaCaps}`);
  
  // Check Drizzle
  const drizzleModels = await db.select().from(modelRegistry);
  
  console.log('\n=== DRIZZLE ===');
  console.log(`Models: ${drizzleModels.length}`);
  
  // Show connection strings (masked)
  const dbUrl = process.env.DATABASE_URL || '';
  const masked = dbUrl.replace(/:[^:@]+@/, ':****@');
  console.log(`\nConnection: ${masked}`);
  
  // If counts differ, there's a problem
  if (prismaModels !== drizzleModels.length) {
    console.log('\n❌ MISMATCH DETECTED!');
    console.log('Prisma and Drizzle are seeing different data!');
  } else {
    console.log('\n✅ Both ORMs see the same data');
  }
  
  await prisma.$disconnect();
  process.exit(0);
}

compareDatabases().catch(err => {
  console.error('❌ Comparison failed:', err);
  process.exit(1);
});
