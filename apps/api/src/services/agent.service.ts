import { z } from "zod";
import { AgentRuntime } from "./AgentRuntime.js";
import { createVolcanoAgent, type AgentConfig } from "./VolcanoAgent.js";
import { ModelSelector } from "../orchestrator/ModelSelector.js";
import { ProviderManager } from "./ProviderManager.js";
import { prisma } from "../db.js";
import type { Role } from "@prisma/client";
import {
  getBestModel,
  recordModelFailure,
  recordProviderFailure,
  type ModelSelectionResult
} from "./modelManager.service.js";

export const startSessionSchema = z.object({
  roleId: z.string(),
  modelConfig: z.object({
    providerId: z.string().optional(),
    modelId: z.string().optional(),
    temperature: z.number().min(0).max(2).default(0.7),
    maxTokens: z.number().int().min(256).max(128000).default(2048),
  }),
  userGoal: z.string().min(1, "User goal/prompt is required"),
  cardId: z.string(),
  context: z
    .object({
      targetDir: z.string().optional(),
    })
    .optional(),
  sessionId: z.string().optional(),
});

export type StartSessionInput = z.infer<typeof startSessionSchema>;

const BASE_PROMPT_SQL_HELPER = `
You are an expert PostgreSQL Query Generator. Your task is to translate the user's natural language request into a single, clean SQL query that can be executed against the available database tables.

The user is querying the following table schemas:
[TABLE_SCHEMAS_CONTEXT]

User Request: [USER_PROMPT]

Constraints:
1. Only output the raw SQL query text. Do NOT include any markdown, commentary, or explanation (e.g., do not use \`\`\`sql ... \`\`\`).
2. Only use SELECT statements. Do not use INSERT, DELETE, DROP, or ALTER.
`;

export interface ExtendedRole extends Role {
  needsVision?: boolean;
  needsCoding?: boolean;
  needsReasoning?: boolean;
  needsTools?: boolean;
  variants?: unknown[]; 
}

export class AgentService {
  async startSession(input: StartSessionInput) {
    const { roleId, modelConfig, userGoal, cardId, context } = input;

    try {
      // 1.5 Fetch Workspace Prompt
      const card = await prisma.workOrderCard.findUnique({
        where: { id: cardId },
        include: { workspace: true },
      });
      const projectPrompt = card?.workspace.systemPrompt || undefined;

      // Prepend context if available
      let finalUserGoal = userGoal;
      if (context?.targetDir) {
        finalUserGoal = `Context: Target Directory: ${context.targetDir}\n\n${userGoal}`;
      }

      // 1. Resolve Configuration (Auto-Detect Provider)
      let resolvedModelId = modelConfig.modelId || null;
      let resolvedProviderId = modelConfig.providerId || undefined;

      // If we have a modelId but no provider, try to find it in the DB
      if (resolvedModelId && !resolvedProviderId) {
          // Use findFirst because 'name' might not be globally unique or indexed as a single unique field
          const modelRecord = await prisma.model.findFirst({
              where: { name: resolvedModelId }, 
              select: { providerId: true }
          });
          if (modelRecord) {
              resolvedProviderId = modelRecord.providerId;
              console.log(`[AgentService] Auto-resolved provider '${resolvedProviderId}' for model '${resolvedModelId}'`);
          } else if (resolvedModelId.includes('/')) {
              // Try split strategy "provider/model"
              const [p] = resolvedModelId.split('/');
              if (ProviderManager.hasProvider(p)) {
                  resolvedProviderId = p;
                  // We keep the full slug as modelId usually, unless provider expects distinct
                  console.log(`[AgentService] inferred provider '${p}' from slug '${resolvedModelId}'`);
              }
          }
      }

      // If NO model is specified, use ModelSelector immediately to pick the best one
      if (!resolvedModelId) {
        try {
           console.log('[AgentService] No model specified. Using ModelSelector to pick best available...');
           const selector = new ModelSelector();
           const safeRole = (await prisma.role.findUnique({ where: { id: roleId } })) || ({ id: 'default', metadata: {} } as unknown as Role);
           // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
           const bestSlug = await selector.resolveModelForRole(safeRole as any, 0, []);
           
           const bestModel = await prisma.model.findUnique({ where: { id: bestSlug }, select: { name: true, providerId: true } });
           if (bestModel) {
               resolvedModelId = bestModel.name;
               resolvedProviderId = bestModel.providerId;
               console.log(`[AgentService] Selected Best Model: ${resolvedModelId} (${resolvedProviderId})`);
           }
        } catch (e) {
           console.warn('[AgentService] Failed to auto-select model:', e);
        }
      }

      const agentConfig: AgentConfig = {
        roleId,
        modelId: resolvedModelId,
        providerId: resolvedProviderId,
        isLocked: !!modelConfig.modelId, // Lock if model was explicitly provided in input
        temperature: modelConfig.temperature,
        maxTokens: modelConfig.maxTokens,
        userGoal: finalUserGoal, // Pass user goal for memory injection
        projectPrompt,
      };

      // 2. Create the Volcano agent
      let agent = await createVolcanoAgent(agentConfig);

      // 2.5 Fetch Role to get Tools and other defaults
      const rawRole = await prisma.role.findUnique({
        where: { id: roleId },
        include: { 
            tools: { include: { tool: true } },
            variants: { where: { isActive: true }, take: 1 } // Fetch DNA
        }
      });
      
      
      // Flatten DNA (Shared Logic with Router)
      let role: ExtendedRole | null = null;
      
      if (rawRole) {
          role = { ...rawRole } as ExtendedRole;
          
          if (rawRole.variants && rawRole.variants.length > 0) {
              const v = rawRole.variants[0];
              // Safely cast JSON config
              const cortex = (v.cortexConfig && typeof v.cortexConfig === 'object') ? v.cortexConfig as Record<string, unknown> : {};
              const identity = (v.identityConfig && typeof v.identityConfig === 'object') ? v.identityConfig as Record<string, unknown> : {};
              
              const caps: string[] = Array.isArray(cortex.capabilities) ? cortex.capabilities as string[] : [];
   
              role.needsVision = caps.includes('vision');
              role.needsCoding = caps.includes('coding');
              role.needsReasoning = caps.includes('reasoning');
              role.needsTools = caps.includes('tools');
              
              if (typeof identity.systemPromptDraft === 'string' && identity.systemPromptDraft) {
                  role.basePrompt = identity.systemPromptDraft;
              }
          }
      }

      let tools = rawRole?.tools.map(rt => rt.tool.name) || [];

      // [FIX] Merge tools from the Active Variant (DNA)
      if (rawRole && rawRole.variants && rawRole.variants.length > 0) {
          const v = rawRole.variants[0];
          const cortex = (v.cortexConfig && typeof v.cortexConfig === 'object') ? v.cortexConfig as Record<string, unknown> : {};
          
          if (Array.isArray(cortex.tools)) {
              const variantTools = cortex.tools as string[];
              console.log(`[AgentService] 🧬 Injecting ${variantTools.length} tools from DNA Variant:`, variantTools);
              // Use Set to avoid duplicates
              tools = Array.from(new Set([...tools, ...variantTools]));
          }
      }

      // 3. Create the agent runtime with selected tools
      const runtime = await AgentRuntime.create(undefined, tools);

      // 4. Define the LLM callback that uses our Volcano agent and enriches
      //    the system prompt with role context from the runtime's ContextManager.
      //    Captured 'agent' variable is used, allowing hot-swapping on fallback.
      const llmCallback = async (prompt: string): Promise<string> => {
        const basePrompt = role?.basePrompt || "";
        return runtime.generateWithContext(
          agent,
          basePrompt,
          prompt,
          roleId,
          sessionId 
        ) as Promise<string>;
      };

      // 5. Start the agent loop (Synchronous for now to ensure UI update)
      const sessionId = input.sessionId || `session-${cardId}-${Date.now()}`;

      // Get initial response first, with Fallback Logic
      let initialResponse = "";
      const failedModels: string[] = [];
      const MAX_RETIES = 3;

      for (let attempt = 0; attempt <= MAX_RETIES; attempt++) {
        try {
           initialResponse = await llmCallback(userGoal);
           break; // Success
        } catch (err: unknown) {
           const isLastAttempt = attempt === MAX_RETIES;
           const msg = err instanceof Error ? err.message : String(err);
           const isProviderError = /provider|not found|model/i.test(msg);

           if (isLastAttempt || !isProviderError) {
             throw err; // Give up
           }

           // Log and Fallback
           console.warn(`[AgentService] Initial generation failed: ${msg}. Attempting fallback...`);
           
           if (agentConfig.modelId) failedModels.push(agentConfig.modelId);

           // Select new model using ModelSelector (Context Aware)
           console.log('[AgentService] Fallback Strategy: Using ModelSelector for Context-Aware Selection');
           const selector = new ModelSelector();
           const safeRole = (role ? role : ({ id: 'default', metadata: {} } as ExtendedRole));
           
           // We pass 'failedModels' (which contains Slugs) to exclude them
           // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
           const fallbackId = await selector.resolveModelForRole(safeRole as any, 0, failedModels);
           const fallback = await prisma.model.findUnique({ 
               where: { id: fallbackId }, 
               include: { provider: true } 
           });

           if (!fallback) throw new Error("No fallback models available.");

           // Update Config
           agentConfig.modelId = fallback.name; // Use Slug
           agentConfig.providerId = fallback.providerId;
           // agentConfig.temperature = check if defined? Default to current
           
           console.log(`[AgentService] Switched to fallback model: ${fallback.name} (Context-Safe)`);

           // Re-create agent
           agent = await createVolcanoAgent(agentConfig);
        }
      }

      // Execute the agent loop and wait for result
      const { result, logs } = await runtime.runAgentLoop(
        userGoal,
        initialResponse,
        async (retryPrompt: string) => {
          // Regenerate with the retry prompt
          const retryResponse = await runtime.generateWithContext(
            agent,
            role?.basePrompt || "",
            retryPrompt,
            roleId
          );
          return retryResponse as string;
        }
      );

      console.log(`[AgentService] Session ${sessionId} Completed.`);

      // Get the actual model used
      const usedConfig = agent.getConfig();

      // 6. Return session info and result immediately
      return {
        sessionId,
        status: "completed" as const,
        cardId,
        result,
        logs,
        modelId: usedConfig.modelId,
        providerId: usedConfig.providerId,
      };
    } catch (error) {
      console.error("[AgentService] Failed to start session:", error);
      throw new Error(
        error instanceof Error
          ? `Failed to start agent session: ${error.message}`
          : "Failed to start agent session"
      );
    }
  }

  async generateQuery(input: {
    userPrompt: string;
    targetTable?: string;
    roleName?: string;
  }) {
    const { userPrompt, targetTable, roleName = "sql-query-helper" } = input;

    // 1. Try to find an optional role; fall back to base prompt if none
    let role = null;
    if (roleName) {
      role = await prisma.role.findFirst({ where: { name: roleName } });
      if (!role) {
        console.warn(
          `[AgentService] Role "${roleName}" not found; proceeding without role-specific settings.`
        );
      }
    }

    // 2. Build schema context (lightweight)
    let schemaContext = "";
    if (targetTable) {
      const rows = await prisma.$queryRawUnsafe<{ column_name: string; data_type: string }[]>(
        `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '${targetTable}'`
      );
      schemaContext = rows.length
        ? `The primary table is "${targetTable}" with columns: ` +
          rows.map((r) => `${r.column_name} (${r.data_type})`).join(", ")
        : "";
    }

    // 3. Final prompt
    const finalPrompt = ((role && role.basePrompt) || BASE_PROMPT_SQL_HELPER)
      .replace("[TABLE_SCHEMAS_CONTEXT]", schemaContext)
      .replace("[USER_PROMPT]", userPrompt);

    // 4. Select Model using Dynamic Role Criteria
    let selectedModel: ModelSelectionResult | null = null;
    try {
      selectedModel = await getBestModel(role?.id, [], []);
    } catch (e) {
      console.warn(
        `[AgentService] Dynamic model selection failed for role ${roleName}:`,
        e
      );
    }

    // Fallback if dynamic selection fails
    if (!selectedModel) {
      console.log(
        `[AgentService] Falling back to any enabled model for ${roleName}`
      );
      const fallback = await prisma.model.findFirst({
        where: { provider: { isEnabled: true } },
        include: { provider: true },
      });

      if (fallback) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
        const metadata = ((role as any)?.metadata as Record<string, unknown>) || {};
        selectedModel = {
          modelId: fallback.id,
          providerId: fallback.providerId,
          model: fallback,
          temperature: (metadata.defaultTemperature as number) || 0.1,
          maxTokens: (metadata.defaultMaxTokens as number) || 1024,
        };
      }
    }

    if (!selectedModel)
      throw new Error("No suitable models available for SQL generation.");

    console.log(
      `[AgentService] Generating SQL using model: ${selectedModel.modelId} (${selectedModel.providerId})`
    );

    // Attempt generation with retries and model fallbacks on invalid-model errors
    const maxAttempts = 3;
    const failedModels: string[] = [];
    const failedProviders: string[] = [];
    let attempt = 0;
    let queryText = "";

    while (attempt < maxAttempts) {
      if (!selectedModel) break;
      attempt++;
      const provider = ProviderManager.getProvider(selectedModel.providerId);
      if (!provider)
        throw new Error(
          `Selected provider ${selectedModel.providerId} is not initialized.`
        );

      try {
        const text = await provider.generateCompletion({
          modelId: selectedModel.modelId,
          messages: [{ role: "user", content: finalPrompt }],
          temperature: selectedModel.temperature ?? 0.1,
          max_tokens: selectedModel.maxTokens ?? 1024,
        });

        // Strip markdown code blocks if present
        queryText = (text || "").trim();
        if (queryText.startsWith("```sql")) {
          queryText = queryText
            .replace(/^```sql\s*/, "")
            .replace(/\s*```$/, "");
        } else if (queryText.startsWith("```")) {
          queryText = queryText.replace(/^```\s*/, "").replace(/\s*```$/, "");
        }

        // Success
        break;
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.warn(
          `[AgentService] Model generation failed for ${selectedModel.modelId} (${selectedModel.providerId}): ${errMsg}`
        );

        // If provider says invalid model, blacklist this model and try again
        if (/invalid model|not found|invalid model id/i.test(errMsg)) {
          // Persist the failure
          try {
            await recordModelFailure(
              selectedModel.providerId,
              selectedModel.modelId,
              role?.id
            );
            recordProviderFailure(selectedModel.providerId, role?.id);
          } catch (recErr) {
            console.warn(
              "[AgentService] Failed to persist model/provider failure:",
              recErr
            );
          }

          // Add provider-level fallback
          if (!failedProviders.includes(selectedModel.providerId))
            failedProviders.push(selectedModel.providerId);

          // Also track the failed model id
          if (!failedModels.includes(selectedModel.modelId))
            failedModels.push(selectedModel.modelId);

          // Select a new model avoiding the failed ones
          try {
            selectedModel = await getBestModel(
              role?.id,
              failedModels,
              failedProviders
            );
            if (!selectedModel) {
              console.warn(
                "[AgentService] No alternative model available after failure"
              );
              throw new Error("No alternative models available");
            }
            console.log(
              `[AgentService] Retrying with new model: ${selectedModel.modelId} (${selectedModel.providerId})`
            );
          } catch (selectErr) {
            console.warn(
              "[AgentService] Failed to select alternative model:",
              selectErr
            );
            // Try fallback selection
            try {
              const fallback = await getBestModel(
                role?.id,
                failedModels,
                failedProviders
              );
              if (!fallback) throw new Error("No fallback model available");
              selectedModel = fallback;
              console.log(
                `[AgentService] Retrying with fallback: ${selectedModel.modelId} (${selectedModel.providerId})`
              );
              continue;
            } catch (fallbackErr) {
              console.warn(
                "[AgentService] Fallback selection failed:",
                fallbackErr
              );
            }
          }
        } else {
          throw err;
        }
      }
    }

    if (!queryText)
      throw new Error("Failed to generate query after multiple attempts.");

    return { queryText };
  }
}
