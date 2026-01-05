
import { prisma } from '../db.js';

async function wipeRoles() {
  console.log('🧹 Wiping Role table...');
  try {
    const { count } = await prisma.role.deleteMany({});
    console.log(`✅ Successfully deleted ${count} roles.`);
  } catch (error) {
    console.error('❌ Failed to wipe roles:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

wipeRoles();
