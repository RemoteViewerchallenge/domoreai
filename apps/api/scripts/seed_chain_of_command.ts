
// apps/api/scripts/seed_chain_of_command.ts
// @ts-ignore
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedHierarchy() {
  console.log("🏗️ Constructing Corporate Lattice...");

  // 1. Root Category: "Internal Code"
  const root = await prisma.roleCategory.upsert({
    where: { name: 'Internal Code' },
    update: {},
    create: { 
      name: 'Internal Code', 
      order: 0,
      parentId: null 
    }
  });
  console.log(`- Root category 'Internal Code' ensured (ID: ${root.id})`);

  // 2. The Three Tiers (Subcategories)
  const tiers = [
    { name: 'Executive', order: 1 },
    { name: 'Manager', order: 2 },
    { name: 'Worker', order: 3 }
  ];

  for (const tier of tiers) {
    const created = await prisma.roleCategory.upsert({
      where: { name: tier.name },
      update: { parentId: root.id, order: tier.order },
      create: { 
        name: tier.name, 
        parentId: root.id,
        order: tier.order
      }
    });
    console.log(`- Tier '${tier.name}' ensured under root (ID: ${created.id})`);
  }

  console.log("✅ Chain of Command Established.");

  // 3. Seed Roles
  console.log("👮 Seeding Roles...");
  
  // Executive
  await prisma.role.upsert({
      where: { name: 'executive_planner' },
      update: {},
      create: {
          name: 'executive_planner',
          categoryId: (await prisma.roleCategory.findFirst({ where: { name: 'Executive' } }))?.id,
          basePrompt: "You are the Executive Planner...",
          description: "Strategy and Planning"
      }
  });

  // Manager
  await prisma.role.upsert({
      where: { name: 'manager_architect' },
      update: {},
      create: {
          name: 'manager_architect',
          categoryId: (await prisma.roleCategory.findFirst({ where: { name: 'Manager' } }))?.id,
          basePrompt: "You are the Manager Architect...",
          description: "Decomposition and Review"
      }
  });

  // Architect (used in draftBlueprint)
  await prisma.role.upsert({
      where: { name: 'architect' },
      update: {},
      create: {
          name: 'architect',
          categoryId: (await prisma.roleCategory.findFirst({ where: { name: 'Manager' } }))?.id, 
          basePrompt: "You are the Chief Architect...",
          description: "System Design"
      }
  });

  // Researcher (used by ModelDoctor)
  await prisma.role.upsert({
      where: { name: 'researcher' },
      update: {},
      create: {
          name: 'researcher',
          categoryString: 'Research & Planning',
          basePrompt: "You are a Technical Researcher. You investigate technologies, analyze solutions, and provide detailed technical research reports.",
          description: "Technical Research and Analysis"
      }
  });

  console.log("✅ Roles Seeded.");
}

seedHierarchy()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
