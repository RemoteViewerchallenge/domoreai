#!/usr/bin/env ts-node

import { PrismaClient } from '@prisma/client';
import { SkillFinderService } from '../src/services/SkillFinderService.js';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const prisma = new PrismaClient();
const finder = new SkillFinderService();

async function main() {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    process.chdir(join(__dirname, '../../../'));

    const skillManagerPrompt = `
You are SkillManager, the dynamic skill integrator for DoMoreAI.

Your core function:
1. When user requests a new skill or capability, use skill-finder to search and retrieve relevant SKILL.md.
2. Parse the SKILL.md to understand the skill's purpose, tools, and requirements.
3. Use code mode to generate TypeScript implementation:
   - If it's a tool, generate a TRPC procedure or sandbox tool handler.
   - If it's a role, generate the base prompt and tool assignments.
4. Feed the generated TS to the language server for validation.
5. If errors, regenerate with feedback until error-free.
6. Once valid, create the new Role/Tool in the DB via admin endpoints.
7. Test the new skill/role by running a simple task.
8. Report success and how to use it.

Always prioritize free/cheap API providers for any AI calls during generation/testing.

Tools available:
 - skill-finder tools (search_skills, get_skill)
 - code-mode for TS generation
 - language-server for validation
 - admin endpoints for DB creation (role.create, tool.create)

Example workflow:
User: "Add a skill for web scraping."
You: Search "web scraping", get SKILL.md, generate TS scraper tool, validate, create Tool, test with simple scrape, confirm.
`;

    // Check if exists
    const existing = await prisma.role.findUnique({ where: { name: 'SkillManager' } });
    if (existing) {
        console.log('SkillManager role already exists.');
    } else {
        // Create category if needed
        const category = await prisma.roleCategory.upsert({
            where: { name: 'System Skills' },
            update: {},
            create: {
                name: 'System Skills',
                description: 'Core system management roles',
                isSystem: true,
                order: 0,
            },
        });

        // Create role
        const role = await prisma.role.create({
            data: {
                name: 'SkillManager',
                description: 'Dynamically integrates new skills by generating and validating TypeScript implementations.',
                basePrompt: skillManagerPrompt,
                categoryId: category.id,
                metadata: {
                    skillType: 'manager',
                    providersPreferred: ['free', 'cheap'],
                },
            },
        });

        console.log('Created SkillManager role:', role.id);

        // Assign tools
        const toolNames = ['search_skills', 'get_skill', 'validateCode'];
        const tools = await prisma.tool.findMany({
            where: { name: { in: toolNames } }
        });
        if (tools.length !== toolNames.length) {
            const missing = toolNames.filter(n => !tools.some(t => t.name === n));
            throw new Error(`Missing required tools for SkillManager: \${missing.join(', ')}\`);
        }
        for (const tool of tools) {
            await prisma.roleTool.create({
                data: { roleId: role.id, toolId: tool.id }
            }).catch(e => console.warn(\`Failed to assign tool \${tool.name}:\`, e));
        }
        console.log('Assigned tools to SkillManager role');
    }

    // Seed roles for existing skills
    const skills = await finder.searchSkills('', 10);
    console.log('Found skills:', skills.map(s => s.name));

    for (const skill of skills) {
        const existingRole = await prisma.role.findUnique({ where: { name: skill.name } });
        if (existingRole) {
            console.log(\`Role for \${skill.name} already exists.\`);
            continue;
        }

        const fullSkill = await finder.getSkill(skill.id);
        if (!fullSkill) {
            console.warn(\`Could not get full skill \${skill.id}\`);
            continue;
        }

        const category = await prisma.roleCategory.upsert({
            where: { name: 'Skills' },
            update: {},
            create: {
                name: 'Skills',
                description: 'Roles generated from skills',
                isSystem: false,
                order: 10,
            },
        });

        const prompt = \`You are \${skill.name}, a specialist in \${skill.description}.

Use JSON tool calls to interact with tools.

Skills files:
\${Object.entries(fullSkill.files).map(([f, c]) => \`--- \${f} ---\n\${c.substring(0, 500)}...\`).join('\n\n')}\`;

        const role = await prisma.role.create({
            data: {
                name: skill.name,
                description: skill.description,
                basePrompt: prompt,
                categoryId: category.id,
                metadata: fullSkill.metadata,
            },
        });

        console.log(\`Created role for skill \${skill.name}:\`, role.id);
    }

    await prisma.$disconnect();
}

main().catch(e => {
    console.error(e);
    process.exit(1);
}).finally(async () => {
    await prisma.$disconnect();
});
