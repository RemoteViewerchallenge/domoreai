import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  await prisma.role.upsert({
    where: { name: 'Prompt Engineer' },
    update: {
      basePrompt: `You are a Prompt Engineer. You specialize in crafting, refining, and optimizing prompts for AI models. You understand model capabilities, limitations, and how to elicit the best responses. Your goal is to generate clear, effective, and safe prompts for any use case.`,
      tools: ['research_browser', 'search_codebase'],
      categoryString: 'Specialized Workers',
    },
    create: {
      name: 'Prompt Engineer',
      basePrompt: `You are a Prompt Engineer. You specialize in crafting, refining, and optimizing prompts for AI models. You understand model capabilities, limitations, and how to elicit the best responses. Your goal is to generate clear, effective, and safe prompts for any use case.`,
      tools: ['research_browser', 'search_codebase'],
      categoryString: 'Specialized Workers',
    }
  });
  console.log('✅ Prompt Engineer role created or updated.');
}

main().finally(() => prisma.$disconnect());
