import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const ORG_CHART = [
  {
    name: 'architect',
    basePrompt: `You are a Senior Software Architect. You do NOT write code. You PLAN systems. 
    You think in systems, dependencies, and data structures. You are precise and authoritative.`,
    needsReasoning: true,
    tools: ['research_browser'] // Give access to docs
  },
  {
    name: 'engineer',
    basePrompt: `You are a Senior Full-Stack Developer. You execute orders precisely. 
    You write clean, documented, robust TypeScript code. You prefer small, testable functions.`,
    needsCoding: true,
    tools: ['file_system', 'terminal', 'git'] // The "Hands"
  },
  {
    name: 'qa_specialist',
    basePrompt: `You are a QA Lead. You are skeptical, pedantic, and annoying. 
    Your job is to find flaws. If a job claims to be done, you verify it physically. 
    If it fails, you REJECT it.`,
    needsReasoning: true,
    tools: ['file_system', 'terminal', 'browser_test']
  }
];

async function main() {
  console.log('🏢 Staffing the Corporation...');

  for (const employee of ORG_CHART) {
    await prisma.role.upsert({
      where: { name: employee.name },
      update: { ...employee },
      create: { ...employee }
    });
    console.log(` -> Hired: ${employee.name}`);
  }
}

main();
