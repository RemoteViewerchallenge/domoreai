#!/usr/bin/env node
/*
  Migration helper (non-destructive):
  - For each Role that does not reference a template, create a RoleTemplate
    populated from the Role's internal fields and attach it via templateId.
  - This script does NOT remove fields from Role. Run manually.

  Usage: node scripts/migrate-role-templates.ts
*/
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const roles = await prisma.role.findMany({ where: { templateId: null } });
  console.log(`Found ${roles.length} roles without templates.`);

  for (const r of roles) {
    try {
      const tpl = await prisma.roleTemplate.create({
        data: {
          name: `${r.name}-template`,
          basePrompt: r.basePrompt,
          defaultMaxTokens: r.defaultMaxTokens ?? undefined,
          defaultTopP: r.defaultTopP ?? undefined,
          defaultFrequencyPenalty: r.defaultFrequencyPenalty ?? undefined,
          defaultPresencePenalty: r.defaultPresencePenalty ?? undefined,
          defaultStop: r.defaultStop ?? undefined,
          defaultSeed: r.defaultSeed ?? undefined,
          defaultResponseFormat: r.defaultResponseFormat ?? undefined,
          terminalRestrictions: r.terminalRestrictions ?? undefined,
          criteria: r.criteria ?? undefined,
          tools: r.tools ?? undefined,
          tone: r.tone ?? undefined,
          domainKnowledge: r.domainKnowledge ?? undefined,
          hardcodedModelId: r.hardcodedModelId ?? undefined,
          hardcodedProviderId: r.hardcodedProviderId ?? undefined,
        }
      });

      await prisma.role.update({ where: { id: r.id }, data: { templateId: tpl.id } });
      console.log(`Migrated role ${r.name} -> template ${tpl.id}`);
    } catch (e) {
      console.warn(`Failed to migrate role ${r.name}:`, e);
    }
  }

  console.log('Migration complete. Review templates and run manual cleanup as needed.');
}

main().catch((e) => { console.error(e); process.exit(1); });
