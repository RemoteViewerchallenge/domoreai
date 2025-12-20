
import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  const roles = await prisma.role.findMany({
    select: {
      id: true,
      name: true,
      categoryString: true
    }
  });
  
  const output = roles.map(r => `ID: ${r.id}, Name: ${r.name}, Category: ${r.categoryString}`).join('\n');
  fs.writeFileSync('roles_inventory.txt', output);
  console.log('Roles inventory written to roles_inventory.txt');
}

main()
  .catch(e => {
    fs.writeFileSync('roles_inventory_error.txt', e.stack);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
