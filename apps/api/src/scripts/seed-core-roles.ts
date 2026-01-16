import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedCoreRoles() {
  console.log('🌱 Seeding Core Roles...\n');

  // 1. Ensure System Category
  let systemCategory = await prisma.roleCategory.findUnique({
    where: { name: 'System' }
  });

  if (!systemCategory) {
    systemCategory = await prisma.roleCategory.create({
      data: { name: 'System', order: 0 }
    });
    console.log('✅ Created System category');
  } else {
    console.log('⏭️  System category already exists');
  }

  // 2. Ensure Nebula Architect
  let nebulaArchitect = await prisma.role.findUnique({
    where: { name: 'Nebula Architect' }
  });

  if (!nebulaArchitect) {
    nebulaArchitect = await prisma.role.create({
      data: {
        name: 'Nebula Architect',
        description: 'The Master Builder. Designs and constructs UI using the Nebula runtime.',
        categoryId: systemCategory.id,
        basePrompt: `# Nebula Architect

You are the master designer of the Nebula ecosystem. Your mission is to construct and refine user interfaces by writing executable TypeScript code that runs in the live Nebula runtime.

## 🎯 Primary Directives
1. **CODE IS THE MEDIUM**: You do not describe UI changes; you execute them.
2. **ATOMIC DESIGN**: Group related component updates into single, logical blocks.
3. **CONTEXT FIRST**: Always verify the current state of the Nebula Tree (\`tree.nodes\`) before making modifications.

## 📋 Operational Workflow

### Phase 1: Planning (OUTSIDE code blocks)
Before execution, clearly state your intent:
- **LOCATE**: Target parent node ID (e.g., "root" or a specific component ID).
- **DEFINE**: UI strategy (Grid vs Flex, Color tokens, Spacing).
- **EXECUTE**: Summary of the build.

### Phase 2: Execution (INSIDE \`\`\`typescript blocks)
Write ONLY clean, executable code.

## 🛠️ Global API Reference
- \`nebula.addNode(parentId, config)\`: Returns a unique \`nodeId\`. **YOU MUST CAPTURE THIS ID.**
- \`nebula.updateNode(nodeId, updates)\`: Modifies an existing node.
- \`nebula.deleteNode(nodeId)\`: Removes a node.
- \`ast.parse(jsx)\`: Ingests raw JSX/TSX strings into Nebula fragments.
- \`tree.nodes\`: Read-only access to the current UI state.

## 📦 Component Library
- **Primitives**: \`Box\`, \`Text\`, \`Icon\`, \`Grid\`, \`Container\`, \`Mosaic\`.
- **Composite**: \`Card\`, \`Tabs\`, \`Navbar\`, \`Hero\`, \`Stat\`, \`Badge\`.
- **Interactive**: \`Button\`, \`Input\`, \`Textarea\`, \`Slider\`, \`Checkbox\`.
- **AI-Enhanced**: \`AiButton\`, \`SuperAiButton\`.

## ⚠️ Critical Rules
- ❌ NEVER use conversational filler like "Sure, I can do that."
- ❌ NEVER use \`tree.rootId\`. Use the string \`"root"\`.
- ✅ ALWAYS capture return IDs: \`const myId = nebula.addNode(...)\`.
- ✅ ALWAYS use Tailwind classes for styling (e.g., \`bg-zinc-900\`, \`p-4\`, \`gap-2\`).`,
        metadata: { needsReasoning: true }
      }
    });
    console.log('✅ Created Nebula Architect role');
  } else {
    console.log('⏭️  Nebula Architect role already exists');
  }

  // 3. Create a DNA Variant for Nebula Architect
  const existingNebulaArchitectVariant = await prisma.roleVariant.findFirst({
    where: {
      roleId: nebulaArchitect.id,
      isActive: true
    }
  });

  if (!existingNebulaArchitectVariant) {
    await prisma.roleVariant.create({
      data: {
        roleId: nebulaArchitect.id,
        isActive: true,
        identityConfig: {
          personaName: 'Graph Master',
          style: 'SOCRATIC',
          systemPromptDraft: nebulaArchitect.basePrompt,
          thinkingProcess: 'CHAIN_OF_THOUGHT',
          reflectionEnabled: true
        },
        cortexConfig: {
          contextRange: { min: 8192, max: 128000 },
          capabilities: ['reasoning', 'coding'], // Array for multi-select
          tools: ['nebula']
        },
        governanceConfig: {
          assessmentStrategy: ['VISUAL_CHECK'], // Array for multi-select
          enforcementLevel: 'WARN_ONLY',
          rules: [
            'Always capture node IDs when using nebula.addNode',
            'Never use tree.rootId - use "root" string',
            'Always use Tailwind CSS classes for styling'
          ]
        },
        contextConfig: {
          strategy: ['EXPLORATORY'], // Array for multi-select
          permissions: ['ALL']
        }
      }
    });
    console.log('✅ Created DNA Variant for Nebula Architect');
  } else {
    interface DNAIdentity {
        systemPromptDraft?: string;
        [key: string]: unknown;
    }
    interface DNACortex {
        tools?: string[];
        [key: string]: unknown;
    }

    console.log('🔄 Updating existing DNA Variant for Nebula Architect...');
    await prisma.roleVariant.update({
        where: { id: existingNebulaArchitectVariant.id },
        data: {
            identityConfig: {
                ...(existingNebulaArchitectVariant.identityConfig as unknown as DNAIdentity),
                systemPromptDraft: nebulaArchitect.basePrompt
            },
            cortexConfig: {
                ...(existingNebulaArchitectVariant.cortexConfig as unknown as DNACortex),
                tools: ['nebula'],
                executionMode: 'CODE_INTERPRETER'
            },
            behaviorConfig: { silenceConfirmation: true }
        } as any
    });


    console.log('✅ Updated DNA Variant for Nebula Architect');
  }

  // 4. Ensure Role Architect
  let roleArchitect = await prisma.role.findUnique({
    where: { name: 'Role Architect' }
  });

  if (!roleArchitect) {
    roleArchitect = await prisma.role.create({
      data: {
        name: 'Role Architect',
        description: 'Designs and evolves AI agent roles using the DNA architecture.',
        categoryId: systemCategory.id,
        basePrompt: `You are the Role Architect.
Your mission is to design specialized AI agents (Roles) for the user's workspace.
You have access to the 'role_variant_evolve' tool to biologically spawn new agent lifeforms.

When the user asks for a new agent:
1. Discover Intent: Infer the Name, Description, Domain (Frontend/Backend/Creative/Research), and Complexity (LOW/MEDIUM/HIGH).
2. DO NOT ASK FOR CLARIFICATION: Act autonomously. Make your best guess.
3. Check existing roles using 'system.role_registry_list' if you are unsure if a role already exists.
4. Output ONLY a JSON tool call for 'system.role_variant_evolve' in this EXACT format (no markdown, no code blocks, no explanations):

{
  "tool": "system.role_variant_evolve",
  "args": {
    "intent": {
      "name": "Role Name Here",
      "description": "What this role does",
      "domain": "Creative",
      "complexity": "MEDIUM"
    }
  }
}

5. After the role is created, confirm to the user with a brief message.
6. If you need to fine-tune an existing role, use 'system.role_config_patch'.`,
        metadata: { needsReasoning: true }
      }
    });
    console.log('✅ Created Role Architect role');
  } else {
    console.log('⏭️  Role Architect role already exists');
  }

  // Meta is a native tool - it doesn't need a DB record
  console.log("ℹ️  'meta' is available as a native tool for Role Architect");

  // 5. Create a DNA Variant for Role Architect
  const existingRoleArchitectVariant = await prisma.roleVariant.findFirst({
    where: {
      roleId: roleArchitect.id,
      isActive: true
    }
  });

  if (!existingRoleArchitectVariant) {
    await prisma.roleVariant.create({
      data: {
        roleId: roleArchitect.id,
        isActive: true,
        identityConfig: {
          personaName: 'DNA Synthesizer',
          style: 'SOCRATIC',
          systemPromptDraft: roleArchitect.basePrompt,
          thinkingProcess: 'MULTI_STEP_PLANNING',
          reflectionEnabled: true
        },
        cortexConfig: {
          contextRange: { min: 8192, max: 32000 },
          capabilities: ['reasoning'], // Array for multi-select
          tools: ['meta']
        },
        governanceConfig: {
          assessmentStrategy: ['LINT_ONLY'], // Array for multi-select
          enforcementLevel: 'WARN_ONLY',
          rules: [
            'Always provide complete DNA configurations',
            'Consider domain-specific governance rules',
            'Match capabilities to role requirements'
          ]
        },
        contextConfig: {
          strategy: ['EXPLORATORY'], // Array for multi-select
          permissions: ['ALL']
        }
      }
    });
    console.log('✅ Created DNA Variant for Role Architect');
  } else {
    interface DNAIdentity {
        systemPromptDraft?: string;
        [key: string]: unknown;
    }
    interface DNACortex {
        tools?: string[];
        [key: string]: unknown;
    }

    console.log('🔄 Updating existing DNA Variant for Role Architect...');
    await prisma.roleVariant.update({
        where: { id: existingRoleArchitectVariant.id },
        data: {
            identityConfig: {
                ...(existingRoleArchitectVariant.identityConfig as unknown as DNAIdentity),
                systemPromptDraft: roleArchitect.basePrompt
            },
            cortexConfig: {
                ...(existingRoleArchitectVariant.cortexConfig as unknown as DNACortex),
                tools: ['meta'],
                executionMode: 'JSON_STRICT'
            },
            behaviorConfig: { silenceConfirmation: true }
        } as any
    });


    console.log('✅ Updated DNA Variant for Role Architect');
  }

  // 6. Ensure System Judge (for JUDGE assessment strategy)
  let judgeRole = await prisma.role.findUnique({ where: { name: 'System Judge' } });
  if (!judgeRole) {
    judgeRole = await prisma.role.create({
      data: {
        name: 'System Judge',
        description: 'The impartial arbiter. Reviews agent work against strict quality and safety standards.',
        categoryId: systemCategory.id,
        basePrompt: `# System Judge
You are the System Judge, the quality assurance engine of the Nebula ecosystem.
Your goal is to AUDIT the work of other agents and provide a pass/fail grade with specific feedback.

## ⚖️ Directives
1. **Unbiased auditing**: You do not write code; you review it.
2. **Strict Guidelines**: Verify inputs against the "Governance Module" rules provided in the context.
3. **Security First**: immediately flag unsafe patterns (e.g., hardcoded secrets, dangerous commands).

## 📋 Evaluation Output
Always output your judgment in JSON:
{
  "approved": boolean,
  "score": number (0-100),
  "issues": string[],
  "feedback": "Concise summary of what needs to be fixed."
}`,
        metadata: { needsReasoning: true }
      }
    });
    console.log('✅ Created System Judge role');
  } else {
    console.log('⏭️  System Judge role already exists');
  }

  // Create Judge DNA
  const judgeVariant = await prisma.roleVariant.findFirst({ where: { roleId: judgeRole.id, isActive: true } });
  if (!judgeVariant) {
    await prisma.roleVariant.create({
      data: {
        roleId: judgeRole.id,
        isActive: true,
        identityConfig: {
          personaName: 'The Gavel',
          style: 'AGGRESSIVE_AUDITOR',
          systemPromptDraft: judgeRole.basePrompt,
          thinkingProcess: 'CHAIN_OF_THOUGHT',
          reflectionEnabled: true
        },
        cortexConfig: {
          contextRange: { min: 4096, max: 32000 },
          capabilities: ['reasoning', 'coding']
        },
        governanceConfig: {
          assessmentStrategy: ['LINT_ONLY'],
          enforcementLevel: 'BLOCK_ON_FAIL',
          rules: ['Zero tolerance for security risks', 'Strict adherence to TypeScript strict mode']
        },
        contextConfig: {
          strategy: ['LOCUS_FOCUS'], // Focus only on the work being judged
          permissions: ['ALL']
        }
      }
    });
    console.log('✅ Created DNA Variant for System Judge');
  }

  // 7. Ensure Librarian (for LIBRARIAN assessment/context)
  let librarianRole = await prisma.role.findUnique({ where: { name: 'Librarian' } });
  if (!librarianRole) {
    librarianRole = await prisma.role.create({
      data: {
        name: 'Librarian',
        description: 'The knowledge keeper. Organizes project structure and verifies documentation consistency.',
        categoryId: systemCategory.id,
        basePrompt: `# Librarian
You are the Librarian, the custodian of the project's knowledge graph.

## 📚 Missions
1. **Structure Verification**: Ensure file placements match the project architecture (e.g. "Components go in /src/components").
2. **Documentation Check**: Verify that new features have corresponding updates in README.md or /docs.
3. **Deduplication**: Flag potential duplicate code or conflicting definitions.

## 🔍 Context Strategy
You use "Exploratory" context to scan the file tree and "Vector Search" to find semantic connections.`,
        metadata: { needsReasoning: false }
      }
    });
    console.log('✅ Created Librarian role');
  } else {
    console.log('⏭️  Librarian role already exists');
  }

  // Create Librarian DNA
  const librarianVariant = await prisma.roleVariant.findFirst({ where: { roleId: librarianRole.id, isActive: true } });
  if (!librarianVariant) {
    await prisma.roleVariant.create({
      data: {
        roleId: librarianRole.id,
        isActive: true,
        identityConfig: {
          personaName: 'Curator',
          style: 'SOCRATIC',
          systemPromptDraft: librarianRole.basePrompt,
          thinkingProcess: 'SOLO',
          reflectionEnabled: false
        },
        cortexConfig: {
          contextRange: { min: 16000, max: 128000 },
          capabilities: [] // General Chat/Knowledge role
        },
        governanceConfig: {
          assessmentStrategy: ['LINT_ONLY'],
          enforcementLevel: 'WARN_ONLY',
          rules: ['Maintain standard directory structure']
        },
        contextConfig: {
          strategy: ['EXPLORATORY', 'VECTOR_SEARCH'],
          permissions: ['ALL']
        }
      }
    });
    console.log('✅ Created DNA Variant for Librarian');
  }

  console.log('\n🎉 Core roles seeded successfully!');
}

seedCoreRoles()
  .catch((e) => {
    console.error('❌ Error seeding roles:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
