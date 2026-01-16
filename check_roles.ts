import { prisma } from './apps/api/src/db.js';

async function main() {
    const roles = await prisma.role.findMany({
        where: {
            name: {
                in: ['Role Architect', 'Nebula Architect', 'Prompt Improver']
            }
        }
    });
    console.log(JSON.stringify(roles, null, 2));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
