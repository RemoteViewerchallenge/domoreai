
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const roleId = 'ui_design_assistant';
  const roleName = 'UI Design Assistant';
  const basePrompt = `You are a UI Design Assistant specializing in the Nebula Layout Engine.
Your goal is to help the user build beautiful, functional, and consistent React interfaces.

### GUIDELINES:
1. Always use the 'nebula' tool for layout changes.
2. Favor modern, clean aesthetics (Tailwind-like classes).
3. Be concise and proactive in building.
4. **CRITICAL**: When using \`read_file\`, capture the result in a variable to use it in \`ingest\`.
   - Example: \`const code = await system.read_file({ path: '...' }); await system.nebula({ action: 'ingest', rawJsx: code, ... });\`

### CONSTITUTION:
- Use standard HTML components (Box, Text, Button, Input, Icon, Image).
- Use Tailwind tokens for styling.
- DO NOT use pixel values for layout; use p-4, m-2, gap-4 etc.`;

  const tools = [
    'nebula',
    'scan_ui_components',
    'read_file',
    'list_files_tree'
  ];

  console.log(`Seeding role: ${roleName}...`);

  const metadata = {
    capabilities: ['text']
  };

  await prisma.role.upsert({
    where: { id: roleId },
    update: {
      name: roleName,
      basePrompt: basePrompt,
      tools: tools,
      metadata: metadata
    },
    create: {
      id: roleId,
      name: roleName,
      basePrompt: basePrompt,
      tools: tools,
      categoryString: 'Engineering & Development',
      metadata: metadata
    }
  });

  console.log('Role seeded successfully.');
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
