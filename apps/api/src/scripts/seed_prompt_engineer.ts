import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// ../../.. -> src/scripts -> src -> api -> apps -> root
const envPath = path.resolve(__dirname, '../../../../.env.local');
console.log(`Loading env from: ${envPath}`);
dotenv.config({ path: envPath });

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
