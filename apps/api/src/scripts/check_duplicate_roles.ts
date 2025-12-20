import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Find all roles with 'ui' or 'design' in the name
  const roles = await prisma.role.findMany({
    where: {
      OR: [
        { name: { contains: 'ui', mode: 'insensitive' } },
        { name: { contains: 'design', mode: 'insensitive' } }
      ]
    },
    select: {
      id: true,
      name: true,
      categoryString: true,
      tools: true,
      createdAt: true,
      updatedAt: true
    },
    orderBy: {
      createdAt: 'asc'
    }
  });

  console.log('\n=== UI/Design Roles ===\n');
  
  if (roles.length === 0) {
    console.log('No UI/Design roles found.');
  } else {
    roles.forEach((role, index) => {
      console.log(`${index + 1}. ${role.name}`);
      console.log(`   ID: ${role.id}`);
      console.log(`   Category: ${role.categoryString || 'None'}`);
      console.log(`   Tools: [${role.tools.join(', ')}]`);
      console.log(`   Created: ${role.createdAt.toISOString()}`);
      console.log(`   Updated: ${role.updatedAt.toISOString()}`);
      console.log('');
    });

    // Check for duplicates
    const nameMap = new Map<string, number>();
    roles.forEach(r => {
      const count = nameMap.get(r.name) || 0;
      nameMap.set(r.name, count + 1);
    });

    const duplicates = Array.from(nameMap.entries()).filter(([_, count]) => count > 1);
    
    if (duplicates.length > 0) {
      console.log('\n⚠️  DUPLICATES DETECTED:');
      duplicates.forEach(([name, count]) => {
        console.log(`   - "${name}" appears ${count} times`);
      });
      console.log('\nRecommendation: Keep the most recently updated version and delete the others.');
    } else {
      console.log('✅ No duplicate roles found.');
    }
  }
}

main()
  .catch(e => console.error('Error:', e))
  .finally(async () => {
    await prisma.$disconnect();
  });
