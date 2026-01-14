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
      // 1. Setup Context & Workspace
      const card = await prisma.workOrderCard.findUnique({
        where: { id: cardId },
        include: { workspace: true },
      });
      const projectPrompt = card?.workspace.systemPrompt || undefined;

      let finalUserGoal = userGoal;
      if (context?.targetDir) {
        finalUserGoal = `Context: Target Directory: ${context.targetDir}\n\n${userGoal}`;
      }

      // 2. Initial Model Resolution
      let resolvedModelId = modelConfig.modelId || null;
      let resolvedProviderId = modelConfig.providerId || undefined;

      // [RESILIENCE] Helper to resolve model dynamically if missing or partial
      if (!resolvedModelId || (resolvedProviderId && !ProviderManager.hasProvider(resolvedProviderId))) {
        console.log('[AgentService] 🔍 Resolving dynamic model for role...');
        const selector = new ModelSelector();
        const safeRole = (await prisma.role.findUnique({ where: { id: roleId } })) || ({ id: 'default', metadata: {} } as unknown as Role);
        const bestSlug = await selector.resolveModelForRole(safeRole as any, 0, []);

        const bestModel = await prisma.model.findUnique({ where: { id: bestSlug } });
        if (bestModel) {
          resolvedModelId = bestModel.name;
          resolvedProviderId = bestModel.providerId;
        }
      }

      // 3. Prepare Agent Config
      const agentConfig: AgentConfig = {
        roleId,
        modelId: resolvedModelId,
        providerId: resolvedProviderId,
        isLocked: !!modelConfig.modelId,
        temperature: modelConfig.temperature,
        maxTokens: modelConfig.maxTokens,
        userGoal: finalUserGoal,
        projectPrompt,
      };

      // 4. Load Role & Tools
      const rawRole = await prisma.role.findUnique({
        where: { id: roleId },
        include: { tools: { include: { tool: true } }, variants: { where: { isActive: true }, take: 1 } }
      });

      let role: ExtendedRole | null = rawRole ? { ...rawRole } as ExtendedRole : null;
      // ... (DNA logic for role capabilities - same as before) ...
      if (role && rawRole?.variants?.length) {
        const v = rawRole.variants[0];
        const identity = (v.identityConfig as Record<string, any>) || {};
        if (identity.systemPromptDraft) role.basePrompt = identity.systemPromptDraft;
      }

      let tools = rawRole?.tools.map(rt => rt.tool.name) || [];
      // [FIX] Inject DNA tools
      if (rawRole?.variants?.length) {
        const v = rawRole.variants[0];
        const cortex = (v.cortexConfig as Record<string, any>) || {};
        if (Array.isArray(cortex.tools)) tools = Array.from(new Set([...tools, ...cortex.tools]));
      }

      const runtime = await AgentRuntime.create(undefined, tools);
      const sessionId = input.sessionId || `session-${cardId}-${Date.now()}`;

      // --- RESILIENCE START ---
      // We declare variables outside the loop to persist state across failovers
      let agent: any;
      let initialResponse = "";
      const failedModels: string[] = []; // Track failures in this session
      const MAX_INIT_RETRIES = 3;

      // 5. Initialize Agent & Get First Response (Fail-Open Loop)
      for (let attempt = 0; attempt <= MAX_INIT_RETRIES; attempt++) {
        try {
          // A. Create the Agent (using current config)
          agent = await createVolcanoAgent(agentConfig);

          // B. Attempt Generation
          initialResponse = await runtime.generateWithContext(
            agent,
            role?.basePrompt || "",
            userGoal,
            roleId,
            sessionId
          ) as string;

          break; // Success!

        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          // Catch 429, timeouts, network errors, etc.
          const isRecoverable = /rate limit|429|quota|overloaded|timeout|fetch|connection/i.test(msg);

          if (attempt === MAX_INIT_RETRIES || !isRecoverable) throw err;

          console.warn(`[AgentService] ⚠️ Startup failed (${msg}). Switching models...`);

          // Record failure and switch
          if (agentConfig.modelId) {
            failedModels.push(agentConfig.modelId);
            if (agentConfig.providerId) await recordModelFailure(agentConfig.providerId, agentConfig.modelId, roleId);
          }

          // DYNAMIC RE-SELECTION
          const selector = new ModelSelector();
          const safeRole = role || ({ id: 'default', metadata: {} } as ExtendedRole);
          const fallbackId = await selector.resolveModelForRole(safeRole as any, 0, failedModels);

          const fallback = await prisma.model.findUnique({ where: { id: fallbackId } });
          if (!fallback) throw new Error("No fallback models available via ModelSelector");

          agentConfig.modelId = fallback.name;
          agentConfig.providerId = fallback.providerId;
          console.log(`[AgentService] 🔄 Switched to: ${fallback.name} (${fallback.providerId})`);
        }
      }

      // 6. Run the Agent Loop (The Conversation)
      // This is where "Mid-Work" failures happen.
      const { result, logs } = await runtime.runAgentLoop(
        userGoal,
        initialResponse,
        // This callback is called for every subsequent turn (Turn 2, 3, 4...)
        async (retryPrompt: string) => {
          const MAX_LOOP_RETRIES = 3;

          // Inner Retry Loop for Mid-Work Failures
          for (let attempt = 0; attempt <= MAX_LOOP_RETRIES; attempt++) {
            try {
              // Use the CURRENT agent (which might have been swapped in startup)
              return await runtime.generateWithContext(
                agent,
                role?.basePrompt || "",
                retryPrompt,
                roleId
              ) as string;

            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : String(err);
              const isRecoverable = /rate limit|429|quota|overloaded|timeout|fetch|connection/i.test(msg);

              if (attempt === MAX_LOOP_RETRIES || !isRecoverable) throw err;

              console.warn(`[AgentService] ⚠️ Mid-work failure (Turn ${attempt}). Hot-swapping model...`);

              if (agentConfig.modelId) {
                failedModels.push(agentConfig.modelId);
                if (agentConfig.providerId) await recordModelFailure(agentConfig.providerId, agentConfig.modelId, roleId);
              }

              // HOT-SWAP LOGIC
              // 1. Ask ModelSelector for a NEW candidate fitting the role
              const selector = new ModelSelector();
              const safeRole = role || ({ id: 'default', metadata: {} } as ExtendedRole);
              const fallbackId = await selector.resolveModelForRole(safeRole as any, 0, failedModels);

              const fallback = await prisma.model.findUnique({ where: { id: fallbackId } });
              if (!fallback) throw new Error("No fallback models available for hot-swap");

              // 2. Update Config
              agentConfig.modelId = fallback.name;
              agentConfig.providerId = fallback.providerId;

              // 3. RE-CREATE the Agent Instance
              // The 'agent' variable is a let, so we update the reference. 
              // The next iteration of this loop uses the NEW agent.
              agent = await createVolcanoAgent(agentConfig);

              console.log(`[AgentService] 🔄 Hot-Swap Successful: Now using ${fallback.name}`);
              // Continue loop -> retries generateWithContext with new agent
            }
          }
          throw new Error("Agent loop failed after multiple hot-swaps");
        }
      );

      const usedConfig = agent.getConfig();

      return {
        sessionId,
        status: "completed" as const,
        cardId,
        result,
        logs: [
          {
            message: `Session completed using: ${usedConfig.modelId} (${usedConfig.providerId})`,
            type: 'system',
            timestamp: new Date().toISOString()
          },
          ...logs
        ],
        modelId: usedConfig.modelId,
        providerId: usedConfig.providerId,
      };

    } catch (error) {
      console.error("[AgentService] Failed to start session:", error);
      throw error;
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
        if (/provider|not found|model|rate limit|429|quota|overloaded|busy|capacity|timeout|APIConnectionTimeoutError|fetch|connection|econnrefused|network/i.test(errMsg)) {
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
