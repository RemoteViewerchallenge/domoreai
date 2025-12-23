
import { prisma } from '../src/db.js';

async function pruneRoles() {
  console.log("🧹 Pruning Legacy Roles...");

  // Roles to KEEP
  // 1. Volcano Hierarchy
  const volcanoRoles = ['executive_planner', 'manager_architect', 'architect'];
  // 2. Utility / Research
  const utilityRoles = ['general_worker', 'researcher'];
  // 3. Fallback / Bridge (optional, user might value these, but they asked to remove "old" ones. 
  // Let's keep software-architect for now as it's often a Safe bet, but remove the specific engineers)
  // Actually, user said "too many roles... old code inject roles". 
  // I will strictly KEEP only the ones we explicitly know we need.
  
  const whitelist = [...volcanoRoles, ...utilityRoles];

  console.log(`🛡️ Whitelisted Roles: ${whitelist.join(', ')}`);

  const allRoles = await prisma.role.findMany();
  const toDelete = allRoles.filter(r => !whitelist.includes(r.name) && !whitelist.includes(r.id));

  console.log(`🗑️ Found ${toDelete.length} roles to delete.`);

  for (const role of toDelete) {
    console.log(`   - Deleting: ${role.name} (${role.id})`);
    try {
        await prisma.role.delete({ where: { id: role.id } });
    } catch (e) {
        console.warn(`Failed to delete ${role.name}: ${e}`);
    }
  }

  console.log("✅ Pruning Complete.");
}

pruneRoles()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
