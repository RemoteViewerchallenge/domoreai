import { prisma } from '../db.js';

/**
 * Adds the search_codebase tool to all roles that don't already have it
 */
async function addSearchCodebaseToAllRoles() {
  console.log('Starting to add search_codebase to all roles...');

  try {
    // Get all roles
    const roles = await prisma.role.findMany({
      select: {
        id: true,
        name: true,
        tools: true
      }
    });

    console.log(`Found ${roles.length} roles to update`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const role of roles) {
      // Get current tools array
      const currentTools = Array.isArray(role.tools) ? role.tools : [];
      
      // Check if search_codebase already exists
      if (currentTools.includes('search_codebase')) {
        console.log(`  ⏭️  Skipping "${role.name}" - already has search_codebase`);
        skippedCount++;
        continue;
      }

      // Add search_codebase to the tools array
      const updatedTools = [...currentTools, 'search_codebase'];

      // Update the role
      await prisma.role.update({
        where: { id: role.id },
        data: { tools: updatedTools }
      });

      console.log(`  ✅ Updated "${role.name}" - added search_codebase`);
      updatedCount++;
    }

    console.log('\n📊 Summary:');
    console.log(`  Total roles: ${roles.length}`);
    console.log(`  Updated: ${updatedCount}`);
    console.log(`  Skipped (already had tool): ${skippedCount}`);
    console.log('\n✨ Done!');

  } catch (error) {
    console.error('❌ Error updating roles:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
addSearchCodebaseToAllRoles()
  .then(() => {
    console.log('Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
