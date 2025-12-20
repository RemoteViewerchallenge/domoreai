import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const oldRoleId = 'cmjdkct760000bal48wbwzpgq';
  
  console.log(`Deleting old UI design assistant role: ${oldRoleId}`);
  
  const deleted = await prisma.role.delete({
    where: { id: oldRoleId }
  });
  
  console.log(`✅ Deleted role: ${deleted.name}`);
  console.log(`   ID: ${deleted.id}`);
  console.log(`   Tools: [${deleted.tools.join(', ')}]`);
  
  console.log('\nRemaining UI Design Assistant:');
  const remaining = await prisma.role.findUnique({
    where: { id: 'ui_design_assistant' }
  });
  
  if (remaining) {
    console.log(`   Name: ${remaining.name}`);
    console.log(`   ID: ${remaining.id}`);
    console.log(`   Tools: [${remaining.tools.join(', ')}]`);
  }
}

main()
  .catch(e => console.error('Error:', e))
  .finally(async () => {
    await prisma.$disconnect();
  });
