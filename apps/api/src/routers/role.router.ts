import { z } from "zod";
import * as path from "path";
import { fileURLToPath } from "url";
import { createTRPCRouter, publicProcedure } from "../trpc.js";
import { prisma } from "../db.js";
import { ingestAgentLibrary } from "../services/RoleIngestionService.js";

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
  minContext: z.number().int().optional(),
  maxContext: z.number().int().optional(),
  needsVision: z.boolean().default(false),
  needsReasoning: z.boolean().default(false),
  needsCoding: z.boolean().default(false),
  needsTools: z.boolean().default(false),
  needsJson: z.boolean().default(false),
  needsUncensored: z.boolean().default(false),
  tools: z.array(z.string()).optional().default([]),
  defaultTemperature: z.number().min(0).max(2).optional().default(0.7),
  defaultMaxTokens: z
    .number()
    .int()
    .min(256)
    .max(32000)
    .optional()
    .default(2048),
  defaultTopP: z.number().min(0).max(1).optional().default(1.0),
  defaultFrequencyPenalty: z.number().min(-2).max(2).optional().default(0.0),
  defaultPresencePenalty: z.number().min(-2).max(2).optional().default(0.0),
  defaultStop: z.array(z.string()).optional(),
  defaultSeed: z.number().int().optional(),
  defaultResponseFormat: z.enum(["text", "json_object"]).optional(),
  terminalRestrictions: z
    .object({
      mode: z.enum(["whitelist", "blacklist", "unrestricted"]),
      commands: z.array(z.string()),
    })
    .optional(),
  criteria: z.record(z.any()).optional(),
  orchestrationConfig: z
    .object({
      requiresCheck: z.boolean(),
      judgeRoleId: z.string().optional(),
      minPassScore: z.number().int().min(0).max(100),
    })
    .optional(),
  memoryConfig: z
    .object({
      useProjectMemory: z.boolean(),
      readOnly: z.boolean(),
    })
    .optional(),
  vfsConfig: z
    .object({
      selectedPaths: z.array(z.string()),
      maxFileSize: z.number().optional(),
      excludePatterns: z.array(z.string()).optional(),
    })
    .optional(),
});

const updateRoleSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Name is required.").optional(),
  basePrompt: z.string().min(1, "Base prompt is required.").optional(),
  category: z.string().optional(),
  minContext: z.number().int().optional().nullable(),
  maxContext: z.number().int().optional().nullable(),
  needsVision: z.boolean().optional(),
  needsReasoning: z.boolean().optional(),
  needsCoding: z.boolean().optional(),
  needsTools: z.boolean().optional(),
  needsJson: z.boolean().optional(),
  needsUncensored: z.boolean().optional(),
  tools: z.array(z.string()).optional(),
  defaultTemperature: z.number().min(0).max(2).optional(),
  defaultMaxTokens: z.number().int().min(256).max(32000).optional(),
  defaultTopP: z.number().min(0).max(1).optional(),
  defaultFrequencyPenalty: z.number().min(-2).max(2).optional(),
  defaultPresencePenalty: z.number().min(-2).max(2).optional(),
  defaultStop: z.array(z.string()).optional(),
  defaultSeed: z.number().int().optional(),
  defaultResponseFormat: z.enum(["text", "json_object"]).optional(),
  terminalRestrictions: z
    .object({
      mode: z.enum(["whitelist", "blacklist", "unrestricted"]),
      commands: z.array(z.string()),
    })
    .optional(),
  criteria: z.record(z.any()).optional(),
  orchestrationConfig: z
    .object({
      requiresCheck: z.boolean(),
      judgeRoleId: z.string().optional(),
      minPassScore: z.number().int().min(0).max(100),
    })
    .optional(),
  memoryConfig: z
    .object({
      useProjectMemory: z.boolean(),
      readOnly: z.boolean(),
    })
    .optional(),

  // --- MODEL OVERRIDE FIELDS ---
  // To set an override, provide both modelId and providerId.
  // To clear an override, send null for both fields.
  hardcodedModelId: z.string().nullable().optional(),
  hardcodedProviderId: z.string().nullable().optional(),

  // --- VFS CONTEXT CONFIGURATION ---
  // VFS Context Configuration for C.O.R.E. context building
  vfsConfig: z
    .object({
      selectedPaths: z.array(z.string()),
      maxFileSize: z.number().optional(),
      excludePatterns: z.array(z.string()).optional(),
    })
    .optional()
    .nullable(),
});

export const roleRouter = createTRPCRouter({
  list: publicProcedure.query(async () => {
    // Fetch all roles from the database
    const roles = await prisma.role.findMany({
      orderBy: {
        name: "asc",
      },
      include: {
        preferredModels: {
          include: { model: true }, // Include model details for the UI
        },
      },
    });

    // Return roles, or a default role if none exist (prevents UI crash)
    return roles.length > 0
      ? roles
      : [
          {
            id: "default",
            name: "General Assistant",
            basePrompt: "You are a helpful AI assistant.",
            category: null, // Add category to default role
            minContext: null,
            maxContext: null,
            needsVision: false,
            needsReasoning: false,
            needsCoding: false,
            needsTools: false,
            needsJson: false,
            needsUncensored: false,
            needsImageGeneration: false, // Explicitly add needsImageGeneration
            tools: [], // Explicitly add tools
            defaultTemperature: 0.7,
            preferredModels: [],
            defaultMaxTokens: 2048,
            defaultTopP: 1.0,
            defaultFrequencyPenalty: 0.0,
            defaultPresencePenalty: 0.0,
            defaultStop: null,
            defaultSeed: null,
            defaultResponseFormat: null,
            terminalRestrictions: null,
          },
        ];
  }),

  create: publicProcedure
    .input(createRoleSchema)
    .mutation(async ({ input }) => {
      // Create a new role in the database
      const role = await prisma.role.create({
        data: {
          name: input.name,
          basePrompt: input.basePrompt,
          category: input.category, // Explicitly add category
          minContext: input.minContext,
          maxContext: input.maxContext,
          needsVision: input.needsVision,
          needsReasoning: input.needsReasoning,
          needsCoding: input.needsCoding,
          needsTools: input.needsTools,
          needsJson: input.needsJson,
          needsUncensored: input.needsUncensored,
          tools: input.tools, // Include tools from input
          defaultTemperature: input.defaultTemperature,
          defaultMaxTokens: input.defaultMaxTokens,
          defaultTopP: input.defaultTopP,
          defaultFrequencyPenalty: input.defaultFrequencyPenalty,
          defaultPresencePenalty: input.defaultPresencePenalty,
          defaultStop: input.defaultStop,
          defaultSeed: input.defaultSeed,
          defaultResponseFormat: input.defaultResponseFormat,
          terminalRestrictions: input.terminalRestrictions,
          criteria: input.criteria,
          orchestrationConfig: input.orchestrationConfig,
          memoryConfig: input.memoryConfig,
          vfsConfig: input.vfsConfig,
        } as any,
      });
      return role;
    }),

  update: publicProcedure
    .input(updateRoleSchema)
    .mutation(async ({ input }) => {
      const { id, ...dataToUpdate } = input;

      // Ensure that if one override field is set, the other is too.
      // Or if one is cleared, the other is as well. This prevents an inconsistent state.
      if (
        (dataToUpdate.hardcodedModelId && !dataToUpdate.hardcodedProviderId) ||
        (!dataToUpdate.hardcodedModelId && dataToUpdate.hardcodedProviderId)
      ) {
        // If only one is provided, set the other to null to maintain consistency
        if (dataToUpdate.hardcodedModelId) dataToUpdate.hardcodedProviderId = null;
        if (dataToUpdate.hardcodedProviderId) dataToUpdate.hardcodedModelId = null;
      }

      // Note: The original code filtered out several fields. We'll keep that behavior
      // while ensuring our new fields are passed through.
      const { orchestrationConfig: _o, memoryConfig: _m, terminalRestrictions: _t, criteria: _c, defaultStop: _ds, defaultSeed: _dseed, defaultResponseFormat: _drf, vfsConfig: _vfs, ...data } = dataToUpdate;

      // Reconstruct the data object with JSON fields explicitly included
      const updateData: any = {
        ...data,
        ...(dataToUpdate.orchestrationConfig !== undefined && { orchestrationConfig: dataToUpdate.orchestrationConfig }),
        ...(dataToUpdate.memoryConfig !== undefined && { memoryConfig: dataToUpdate.memoryConfig }),
        ...(dataToUpdate.terminalRestrictions !== undefined && { terminalRestrictions: dataToUpdate.terminalRestrictions }),
        ...(dataToUpdate.criteria !== undefined && { criteria: dataToUpdate.criteria }),
        ...(dataToUpdate.defaultStop !== undefined && { defaultStop: dataToUpdate.defaultStop }),
        ...(dataToUpdate.defaultSeed !== undefined && { defaultSeed: dataToUpdate.defaultSeed }),
        ...(dataToUpdate.defaultResponseFormat !== undefined && { defaultResponseFormat: dataToUpdate.defaultResponseFormat }),
        ...(dataToUpdate.vfsConfig !== undefined && { vfsConfig: dataToUpdate.vfsConfig }),
      };

      // The `updateData` object now contains all valid fields for the Prisma update,
      // including the hardcodedModelId, hardcodedProviderId, and vfsConfig.

      // Update the role in the database
      const role = await prisma.role.update({
        where: { id },
        data: updateData,
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
    const agentsDir = path.join(__dirname, "../../data/agents/en");

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
      const { roleId, context, name, goal, category, capabilities, tools } = input;

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
        const { createVolcanoAgent } = await import('../services/AgentFactory.js');
        
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

});
