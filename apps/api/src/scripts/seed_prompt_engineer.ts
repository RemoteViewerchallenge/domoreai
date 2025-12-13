import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  await prisma.role.upsert({
    where: { name: 'Prompt Engineer' },
    update: {
      basePrompt: `You are a Prompt Engineer. You specialize in crafting, refining, and optimizing prompts for AI models. You understand model capabilities, limitations, and how to elicit the best responses. Your goal is to generate clear, effective, and safe prompts for any use case.`,
      needsReasoning: true,
      needsCoding: false,
      needsTools: true,
      tools: ['research_browser', 'search_codebase'],
      category: 'Specialized Workers',
      minContext: 32000,
      maxContext: 131072
    },
    create: {
      name: 'Prompt Engineer',
      basePrompt: `You are a Prompt Engineer. You specialize in crafting, refining, and optimizing prompts for AI models. You understand model capabilities, limitations, and how to elicit the best responses. Your goal is to generate clear, effective, and safe prompts for any use case.`,
      needsReasoning: true,
      needsCoding: false,
      needsTools: true,
      tools: ['research_browser', 'search_codebase'],
      category: 'Specialized Workers',
      minContext: 32000,
      maxContext: 131072
    }
  });
  console.log('✅ Prompt Engineer role created or updated.');
}

main().finally(() => prisma.$disconnect());
