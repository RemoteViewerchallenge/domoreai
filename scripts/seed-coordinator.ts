
import { RoleFactoryService } from '../apps/api/src/services/RoleFactoryService.js';
import { prisma } from '../apps/api/src/db.js';

async function seed() {
  const factory = new RoleFactoryService();
  console.log("🌱 Seeding Roles...");
  await factory.seedCoordinator();
  await factory.seedLiaison();
  console.log("✅ Seed Complete.");
  await prisma.$disconnect();
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
