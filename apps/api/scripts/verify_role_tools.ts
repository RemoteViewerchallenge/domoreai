import { prisma } from '../src/db.js';

async function main() {
  console.log('Verifying role tools fetch...');
  const roles = await prisma.role.findMany({
    include: {
        category: true,
        tools: {
            include: {
                tool: true
            }
        }
    }
  });

  const transformed = roles.map(r => ({
      name: r.name,
      tools: r.tools.map(rt => rt.tool.name)
  }));
  
  const rolesWithTools = transformed.filter(r => r.tools.length > 0);
  
  console.log(`Found ${roles.length} total roles.`);
  console.log(`Found ${rolesWithTools.length} roles with tools.`);
  
  if (rolesWithTools.length > 0) {
      console.log('Example role with tools:', rolesWithTools[0]);
  } else {
      console.log('No roles with tools found. This might be normal if no tools are assigned yet, or it indicates the fix is needed (if tools SHOULD appear).');
      // Let's check if there are any RoleTool entries in the database at all
      const roleToolCount = await prisma.roleTool.count();
      console.log(`Total RoleTool entries in DB: ${roleToolCount}`);
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
