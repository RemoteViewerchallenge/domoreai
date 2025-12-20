
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Find roles that might have typos
  const roles = await prisma.role.findMany();
  for (const role of roles) {
      if (role.name.includes('deesign') || role.id.includes('deesign')) {
          console.log(`Fixing role: ${role.name} (${role.id})`);
          await prisma.role.update({
              where: { id: role.id },
              data: {
                  name: role.name.replace('deesign', 'design'),
                  id: role.id.replace('deesign', 'design') // WARNING: this might break foreign keys if any
              }
          });
      }
  }
  console.log('Done.');
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
