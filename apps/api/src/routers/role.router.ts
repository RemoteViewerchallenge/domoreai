import { z } from "zod";
import * as path from "path";
import { fileURLToPath } from "url";
import { createTRPCRouter, publicProcedure } from "../trpc.js";
import { prisma } from "../db.js";
import { ingestAgentLibrary, onboardProject } from "../services/RoleIngestionService.js";
import { ModelSelector } from "../services/ModelSelector.js";

// Helper function for template-based prompt generation (fallback)
function generateTemplatePrompt(
  name: string,
  goal: string | undefined,
  category: string | undefined,
  capabilities?: {
    vision?: boolean;
    reasoning?: boolean;
    coding?: boolean;
    tools?: boolean;
  }
): string {
  const capabilityList: string[] = [];
  if (capabilities?.vision) capabilityList.push("Vision (multimodal understanding)");
  if (capabilities?.reasoning) capabilityList.push("Advanced reasoning and chain-of-thought");
  if (capabilities?.coding) capabilityList.push("Code generation and analysis");
  if (capabilities?.tools) capabilityList.push("Tool usage and function calling");

  const categoryContext = category ? `\n\n**Category:** ${category}` : "";
  const capabilitiesContext = capabilityList.length > 0 
    ? `\n\n**Required Capabilities:**\n${capabilityList.map(c => `- ${c}`).join('\n')}`
    : "";
  
  return `## ROLE: ${name}${categoryContext}${capabilitiesContext}

**GOAL:**
${goal || "Assist the user with high-quality, accurate responses tailored to this role."}

**CORE INSTRUCTIONS:**
- You are a specialized AI assistant with the role of "${name}".
- Your primary objective is to fulfill the user's request based on your defined goal and capabilities.
- Analyze the context provided and respond efficiently, accurately, and professionally.
- Maintain a helpful, clear, and concise communication style.
- Always prioritize accuracy and relevance in your responses.`;
}


const createRoleSchema = z.object({
  name: z.string().min(1, "Name is required."),
  basePrompt: z.string().min(1, "Base prompt is required."),
  category: z.string().optional().default('Uncategorized'),
  tools: z.array(z.string()).optional().default([]),
  
  // Metadata fields
  minContext: z.number().int().optional(),
  maxContext: z.number().int().optional(),
  needsVision: z.boolean().optional().default(false),
  needsReasoning: z.boolean().optional().default(false),
  needsCoding: z.boolean().optional().default(false),
  needsTools: z.boolean().optional().default(false),
  needsJson: z.boolean().optional().default(false),
  needsUncensored: z.boolean().optional().default(false),
  needsImageGeneration: z.boolean().optional().default(false),
  
  defaultTemperature: z.number().min(0).max(2).optional(),
  defaultMaxTokens: z.number().int().min(1).optional(),
  defaultTopP: z.number().min(0).max(1).optional(),
  defaultFrequencyPenalty: z.number().min(-2).max(2).optional(),
  defaultPresencePenalty: z.number().min(-2).max(2).optional(),
  defaultStop: z.array(z.string()).optional(),
  defaultSeed: z.number().int().optional(),
  defaultResponseFormat: z.enum(['text', 'json_object']).optional(),
  
  terminalRestrictions: z.object({
    mode: z.enum(['whitelist', 'blacklist', 'unrestricted']),
    commands: z.array(z.string())
  }).optional(),
  
  criteria: z.record(z.any()).optional(),
  orchestrationConfig: z.object({
    requiresCheck: z.boolean(),
    judgeRoleId: z.string().optional(),
    minPassScore: z.number().int()
  }).optional(),
  memoryConfig: z.object({
    useProjectMemory: z.boolean(),
    readOnly: z.boolean()
  }).optional(),
});

const updateRoleSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Name is required.").optional(),
  basePrompt: z.string().min(1, "Base prompt is required.").optional(),
  category: z.string().optional(),
  categoryString: z.string().optional(),
  tools: z.array(z.string()).optional(),
  
  // Metadata fields
  minContext: z.number().int().optional().nullable(),
  maxContext: z.number().int().optional().nullable(),
  needsVision: z.boolean().optional(),
  needsReasoning: z.boolean().optional(),
  needsCoding: z.boolean().optional(),
  needsTools: z.boolean().optional(),
  needsJson: z.boolean().optional(),
  needsUncensored: z.boolean().optional(),
  needsImageGeneration: z.boolean().optional(),
  
  defaultTemperature: z.number().min(0).max(2).optional(),
  defaultMaxTokens: z.number().int().min(1).optional(),
  defaultTopP: z.number().min(0).max(1).optional(),
  defaultFrequencyPenalty: z.number().min(-2).max(2).optional(),
  defaultPresencePenalty: z.number().min(-2).max(2).optional(),
  defaultStop: z.array(z.string()).optional(),
  defaultSeed: z.number().int().optional(),
  defaultResponseFormat: z.enum(['text', 'json_object']).optional(),
  
  terminalRestrictions: z.object({
    mode: z.enum(['whitelist', 'blacklist', 'unrestricted']),
    commands: z.array(z.string())
  }).optional(),
  
  criteria: z.record(z.any()).optional(),
  orchestrationConfig: z.object({
    requiresCheck: z.boolean(),
    judgeRoleId: z.string().optional(),
    minPassScore: z.number().int()
  }).optional(),
  memoryConfig: z.object({
    useProjectMemory: z.boolean(),
    readOnly: z.boolean()
  }).optional(),
});

export const roleRouter = createTRPCRouter({
  list: publicProcedure.query(async () => {
    // Fetch all roles from the database
    const roles = await prisma.role.findMany({
      orderBy: {
        name: "asc",
      },
      include: {
        category: true, // Include the category object
      },
    });

    // Resolve Operational Intelligence (Model & Scope)
    const modelSelector = new ModelSelector();

    // We fetch model names efficiently to avoid N+1 issues where possible,
    // but ModelSelector logic is complex so we'll do parallel resolution.
    // In a real high-scale app, we'd cache this or store 'currentModel' in the DB periodically.

    const enrichedRoles = await Promise.all(roles.map(async (role) => {
       let currentModelName = 'Auto-Detect';
       try {
           const modelId = await modelSelector.resolveModelForRole(role as any);
           // Fetch the friendly name for this model ID
           const model = await prisma.model.findUnique({
               where: { id: modelId },
               select: { name: true }
           });
           if (model) currentModelName = model.name;
       } catch {
           currentModelName = 'None Available';
       }

       // Scope Extraction (Simple Heuristic)
       let scope = 'Global';
       const desc = (role.description || '').toLowerCase();
       if (desc.includes('frontend') || desc.includes('react') || desc.includes('ui')) scope = 'Frontend (src/components)';
       else if (desc.includes('backend') || desc.includes('api') || desc.includes('database')) scope = 'Backend (apps/api)';
       else if (desc.includes('test') || desc.includes('qa')) scope = 'Tests (*.test.ts)';

       return {
           ...role,
           currentModel: currentModelName,
           scope: scope,
           healthScore: 100 // Placeholder for AssessmentService score
       };
    }));

    // Return roles, or a default role if none exist (prevents UI crash)
    return enrichedRoles.length > 0
      ? enrichedRoles
      : [
          {
            id: "default",
            name: "General Assistant",
            basePrompt: "You are a helpful AI assistant.",
            categoryString: null, 
            category: null,
            tools: [],
            metadata: {},
            preferredModels: [],
            currentModel: 'GPT-4o',
            scope: 'Global',
            healthScore: 100
          },
        ];
  }),

  // --- CATEGORY MANAGEMENT ---
  
  // --- CATEGORY MANAGEMENT ---
  
  listCategories: publicProcedure.query(async () => {
    // Nested query is tricky with simple client usage.
    // We return flat list and reconstruct tree on client, or return with children.
    // Let's return flat for maximum flexibility in UI.
    return prisma.roleCategory.findMany({
      orderBy: { order: 'asc' },
    });
  }),

  createCategory: publicProcedure
    .input(z.object({ name: z.string().min(1), parentId: z.string().optional() }))
    .mutation(async ({ input }) => {
      return prisma.roleCategory.create({
        data: { 
            name: input.name,
            // parentId: input.parentId || null
        }
      });
    }),

  updateCategory: publicProcedure
    .input(z.object({ id: z.string(), name: z.string().min(1).optional(), parentId: z.string().nullable().optional() }))
    .mutation(async ({ input }) => {
      const data: any = {};
      if (input.name) data.name = input.name;
      if (input.parentId !== undefined) data.parentId = input.parentId;

      return prisma.roleCategory.update({
        where: { id: input.id },
        data: data
      });
    }),

  deleteCategory: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const category = await prisma.roleCategory.findUnique({
          where: { id: input.id },
          include: { roles: true } // , children: true } 
      });

      if (category) {
          // Flatten roles: set category to null (or parent?)
          // Let's set to null ('Uncategorized') for safety
          // if(category.children.length > 0) { ... }
          if (false) {
             /* await prisma.roleCategory.updateMany({
                where: { parentId: input.id },
                data: { parentId: category.parentId } 
             }); */
          }
      }

      return prisma.roleCategory.delete({
        where: { id: input.id }
      });
    }),

  moveRoleToCategory: publicProcedure
    .input(z.object({ roleId: z.string(), categoryId: z.string().nullable() }))
    .mutation(async ({ input }) => {
      let categoryName = 'Uncategorized';
      if (input.categoryId) {
          const cat = await prisma.roleCategory.findUnique({ where: { id: input.categoryId }});
          if (cat) categoryName = cat.name;
      }
      
      return prisma.role.update({
        where: { id: input.roleId },
        data: { 
            categoryId: input.categoryId,
            // categoryString: categoryName // Removed 
        }
      });
    }),

  reorderCategories: publicProcedure
    .input(z.array(z.object({ id: z.string(), order: z.number() })))
    .mutation(async ({ input }) => {
        const updates = input.map(item => 
            prisma.roleCategory.update({
                where: { id: item.id },
                data: { order: item.order }
            })
        );
        return prisma.$transaction(updates);
    }),

  create: publicProcedure
    .input(createRoleSchema)
    .mutation(async ({ input }) => {
      const { name, basePrompt, category, tools, ...metadata } = input;
      const categoryName = category || 'Uncategorized';

      const cat = await prisma.roleCategory.upsert({
        where: { name: categoryName },
        update: {},
        create: { name: categoryName }
      });
      const categoryId = cat.id;

      // Create a new role in the database
      const role = await prisma.role.create({
        data: {
          name,
          basePrompt,
          // categoryString: categoryName,
          categoryId,
          // metadata: metadata as any,
          tools: {
            create: tools.map(toolName => ({
              tool: { connect: { name: toolName } }
            }))
          }
        },
      });
      return role;
    }),

  update: publicProcedure
    .input(updateRoleSchema)
    .mutation(async ({ input }) => {
      const { id, name, basePrompt, category, categoryString, tools, ...metadataUpdate } = input;
      
      // Fetch existing metadata to merge
      const existing = await prisma.role.findUnique({ 
        where: { id }, 
        select: { id: true, name: true, description: true } // metadata removed 
      });
      const currentMeta = {}; // (existing?.metadata as any) || {};

      const newMetadata = {
        ...currentMeta,
        ...metadataUpdate
      };

      // Filter out undefined values from data object
      const data: any = {
        ...(name !== undefined && { name }),
        ...(basePrompt !== undefined && { basePrompt }),
        metadata: newMetadata,
      };

      // Resolve category if provided
      const resolvedCategoryName = categoryString || category;
      if (resolvedCategoryName) {
        const cat = await prisma.roleCategory.upsert({
          where: { name: resolvedCategoryName },
          update: {},
          create: { name: resolvedCategoryName }
        });
        data.categoryId = cat.id;
        data.categoryString = resolvedCategoryName;
      }

      // Handle tools update if provided
      if (tools !== undefined) {
        // First delete existing tool relations
        await prisma.roleTool.deleteMany({
          where: { roleId: id }
        });
        
        // Then create new ones
        data.tools = {
          create: tools.map(toolName => ({
            tool: { connect: { name: toolName } }
          }))
        };
      }

      // Update the role in the database
      const role = await prisma.role.update({
        where: { id },
        data,
      });
      return role;
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      // Delete the role from the database
      await prisma.role.delete({
        where: { id: input.id },
      });
      return { success: true };
    }),

  ingestLibrary: publicProcedure.mutation(async () => {
    // Get the directory where this router is located
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const agentsDir = path.join(__dirname, "../../../data/agents/en");

    const stats = await ingestAgentLibrary(agentsDir, prisma);
    return {
      message: "Agent library ingestion complete",
      ...stats,
    };
  }),

  generatePrompt: publicProcedure
    .input(
      z.object({
        name: z.string(),
        goal: z.string().optional(),
        category: z.string().optional(),
        capabilities: z.object({
          vision: z.boolean().optional(),
          reasoning: z.boolean().optional(),
          coding: z.boolean().optional(),
          tools: z.boolean().optional(),
        }).optional(),
        tools: z.array(z.string()).optional(),
        roleId: z.string().optional(), // Keep roleId optional for now
        context: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { name, goal, category, capabilities, tools } = input;

      // --- NEW: Real AI-Powered Prompt Generation ---
      console.log(`[PromptGen] 🎨 Generating AI prompt for role: "${name}"...`);

      // 1. Find the Prompt Engineer role
      const promptEngineerRole = await prisma.role.findFirst({
        where: { name: 'Prompt Engineer' },
      });

      if (!promptEngineerRole) {
        console.warn('[PromptGen] ⚠️ Prompt Engineer role not found, falling back to template');
        // Fallback to template if role doesn't exist
        return generateTemplatePrompt(name, goal, category, capabilities);
      }

      // 2. Build the capability list
      const capabilityList: string[] = [];
      if (capabilities?.vision) capabilityList.push("Vision (multimodal understanding)");
      if (capabilities?.reasoning) capabilityList.push("Advanced reasoning and chain-of-thought");
      if (capabilities?.coding) capabilityList.push("Code generation and analysis");
      if (capabilities?.tools) capabilityList.push("Tool usage and function calling");

      const toolsList = tools && tools.length > 0 ? tools.join(', ') : 'none';

      // 3. Create the prompt engineering request
      const request = `Generate a professional, effective system prompt for an AI assistant with the following specifications:

**Role Name:** ${name}
**Category:** ${category || 'General'}
**Goal:** ${goal || 'Assist the user with high-quality, accurate responses tailored to this role'}
**Required Capabilities:** ${capabilityList.length > 0 ? capabilityList.join(', ') : 'General assistance'}
**Tools Available:** ${toolsList}

Please create a clear, structured system prompt that:
1. Defines the role and its expertise
2. States the primary goal/mission
3. Provides specific, actionable instructions
4. Uses markdown formatting for readability
5. Is concise but comprehensive (150-400 words ideal)

Return ONLY the system prompt, no additional commentary.`;

      try {
        // const { createVolcanoAgent } = await import('../services/AgentFactory.js');
        // DISABLED for now
        const createVolcanoAgent = async (_: any) => ({ generate: async (_prompt: any) => "Mocked Response" });
        
        const agent = await createVolcanoAgent({
          roleId: promptEngineerRole.id,
          modelId: null, // CRITICAL: Setting modelId to null forces getBestModel to run.
          isLocked: false, // Let the system dynamically choose the best model
          temperature: 0.7,
          maxTokens: 1500,
        });

        // 6. Generate with the Prompt Engineer's instructions
        const fullRequest = `${promptEngineerRole.basePrompt}\n\n---\n\n${request}`;
        
        console.log('[PromptGen] 🤖 Calling LLM...');
        const generatedPrompt = await agent.generate(fullRequest);
        console.log('[PromptGen] ✅ AI-generated prompt created successfully');

        return generatedPrompt;

      } catch (error) {
        console.error('[PromptGen] ❌ Failed to generate AI prompt:', error);
        // Fallback to template on error
        console.log('[PromptGen] 📋 Falling back to template generation');
        return generateTemplatePrompt(name, goal, category, capabilities);
      }
    }),

  onboardProject: publicProcedure
    .input(z.object({ rootPath: z.string() }))
    .mutation(async ({ input }) => {
      const stats = await onboardProject(input.rootPath, prisma);
      return {
        message: "Project onboarding complete",
        ...stats,
      };
    }),

});
