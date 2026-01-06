import { prisma } from '../src/db.js';

async function main() {
  console.log('Assigning tool to role for verification...');
  
  // 1. Get a role (or create one if none exist)
  let role = await prisma.role.findFirst();
  if (!role) {
      console.log('No roles found, creating temporary role...');
      role = await prisma.role.create({
          data: {
              name: 'Verification Role',
              description: 'Temp role for verification',
              basePrompt: 'You are a verification role.',
              // categoryId removed to avoid FK errors
          }
      });
  }

  // 2. Get a tool
  const tool = await prisma.tool.findFirst({ where: { name: 'filesystem' } });
  if (!tool) throw new Error('Tool not found (should have been restored)');

  // 3. Assign
  console.log(`Assigning ${tool.name} to role ${role.name}...`);
  await prisma.roleTool.upsert({
      where: { roleId_toolId: { roleId: role.id, toolId: tool.id } },
      update: {},
      create: {
          roleId: role.id,
          toolId: tool.id
      }
  });
  
  console.log('Assignment complete.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
