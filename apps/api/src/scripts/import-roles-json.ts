import { promises as fs } from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type RoleJson = {
  id?: string;
  name: string;
  category?: string | null;
  basePrompt: string;
  minContext?: number | null;
  maxContext?: number | null;
  needsVision?: boolean;
  needsReasoning?: boolean;
  needsCoding?: boolean;
  needsTools?: boolean;
  needsJson?: boolean;
  needsUncensored?: boolean;
  needsImageGeneration?: boolean;
  tools?: string[];
  defaultTemperature?: number | null;
  defaultMaxTokens?: number | null;
  defaultTopP?: number | null;
  defaultFrequencyPenalty?: number | null;
  defaultPresencePenalty?: number | null;
  defaultStop?: unknown;
  defaultSeed?: number | null;
  defaultResponseFormat?: unknown;
  terminalRestrictions?: unknown;
  criteria?: unknown;
  orchestrationConfig?: unknown;
  memoryConfig?: unknown;
  domainKnowledge?: string[];
  tone?: string | null;
  hardcodedModelId?: string | null;
  hardcodedProviderId?: string | null;
};

async function main() {
  const fileArg = process.argv[2];
  const jsonPath = fileArg
    ? path.resolve(fileArg)
    : path.resolve(process.cwd(), 'packages/coc/agents/roles.json');

  console.log(`Importing roles from: ${jsonPath}`);

  const raw = await fs.readFile(jsonPath, 'utf-8');
  const roles = JSON.parse(raw) as RoleJson[];

  let created = 0;
  let updated = 0;

  for (const role of roles) {
    // Upsert by unique name (name is unique in schema)
    await prisma.role.upsert({
      where: { name: role.name },
      update: {
        category: role.category ?? null,
        basePrompt: role.basePrompt,
        minContext: role.minContext ?? null,
        maxContext: role.maxContext ?? null,
        needsVision: role.needsVision ?? false,
        needsReasoning: role.needsReasoning ?? false,
        needsCoding: role.needsCoding ?? false,
        needsTools: role.needsTools ?? false,
        needsJson: role.needsJson ?? false,
        needsUncensored: role.needsUncensored ?? false,
        needsImageGeneration: role.needsImageGeneration ?? false,
        tools: role.tools ?? [],
        defaultTemperature: role.defaultTemperature ?? 0.7,
        defaultMaxTokens: role.defaultMaxTokens ?? 2048,
        defaultTopP: role.defaultTopP ?? 1.0,
        defaultFrequencyPenalty: role.defaultFrequencyPenalty ?? 0.0,
        defaultPresencePenalty: role.defaultPresencePenalty ?? 0.0,
        defaultStop: role.defaultStop ?? undefined,
        defaultSeed: role.defaultSeed ?? null,
        defaultResponseFormat: role.defaultResponseFormat ?? undefined,
        terminalRestrictions: role.terminalRestrictions ?? undefined,
        criteria: role.criteria ?? undefined,
        domainKnowledge: role.domainKnowledge ?? [],
        tone: role.tone ?? null,
        hardcodedModelId: role.hardcodedModelId ?? null,
        hardcodedProviderId: role.hardcodedProviderId ?? null,
      },
      create: {
        id: role.id, // preserve ID if provided; otherwise prisma will generate
        name: role.name,
        category: role.category ?? null,
        basePrompt: role.basePrompt,
        minContext: role.minContext ?? null,
        maxContext: role.maxContext ?? null,
        needsVision: role.needsVision ?? false,
        needsReasoning: role.needsReasoning ?? false,
        needsCoding: role.needsCoding ?? false,
        needsTools: role.needsTools ?? false,
        needsJson: role.needsJson ?? false,
        needsUncensored: role.needsUncensored ?? false,
        needsImageGeneration: role.needsImageGeneration ?? false,
        tools: role.tools ?? [],
        defaultTemperature: role.defaultTemperature ?? 0.7,
        defaultMaxTokens: role.defaultMaxTokens ?? 2048,
        defaultTopP: role.defaultTopP ?? 1.0,
        defaultFrequencyPenalty: role.defaultFrequencyPenalty ?? 0.0,
        defaultPresencePenalty: role.defaultPresencePenalty ?? 0.0,
        defaultStop: role.defaultStop ?? undefined,
        defaultSeed: role.defaultSeed ?? null,
        defaultResponseFormat: role.defaultResponseFormat ?? undefined,
        terminalRestrictions: role.terminalRestrictions ?? undefined,
        criteria: role.criteria ?? undefined,
        domainKnowledge: role.domainKnowledge ?? [],
        tone: role.tone ?? null,
        hardcodedModelId: role.hardcodedModelId ?? null,
        hardcodedProviderId: role.hardcodedProviderId ?? null,
      },
    });

    if (role.id) {
      updated++; // if id existed we likely updated existing record; simple heuristic
    } else {
      created++;
    }
  }

  console.log(`Import complete. Processed ${roles.length} roles (created/updated).`);
  console.log(`Heuristic counts — created: ${created}, updated: ${updated}`);
}

main()
  .catch((err) => {
    console.error('Failed to import roles:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

