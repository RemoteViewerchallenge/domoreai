import { z } from "zod";
import * as fs from 'fs/promises';
import * as path from 'path';
import { AgentRuntime } from "./AgentRuntime.js";
import { createVolcanoAgent, VolcanoAgent, type AgentConfig } from "./VolcanoAgent.js";
import { LLMSelector, type Role as SelectorRole } from "../orchestrator/LLMSelector.js";
import { ProviderManager } from "./ProviderManager.js";
import { prisma } from "../db.js";
import type { Role } from "@prisma/client";
import {
  getBestModel,
  recordModelFailure,
  recordProviderFailure,
  type ModelSelectionResult
} from "./modelManager.service.js";

// [RESILIENCE] Standard schema, no changes needed here
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
      targetFile: z.string().optional(),
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

export interface ExtendedRole extends Omit<Role, 'basePrompt'> {
  needsVision?: boolean;
  needsCoding?: boolean;
  needsReasoning?: boolean;
  needsTools?: boolean;
  basePrompt?: string;
  variants?: unknown[];
}

export class AgentService {
  async startSession(input: StartSessionInput) {
    const { roleId, modelConfig, userGoal, cardId, context } = input;
    const sessionId = input.sessionId || `session-${cardId}-${Date.now()}`;

    try {
      // 1. Setup Context (Database fetch - usually safe)
      const card = await prisma.workOrderCard.findUnique({
        where: { id: cardId },
        include: { workspace: true },
      });
      const projectPrompt = card?.workspace.systemPrompt || undefined;

      let finalUserGoal = userGoal;
      if (context?.targetDir) {
        finalUserGoal = `Context: Target Directory: ${context.targetDir}\n\n${userGoal}`;
      }

      // 3. Prepare Initial Config (with Fail-Safe Resolution)
      let resolvedModelId = modelConfig.modelId || null;
      let resolvedProviderId = modelConfig.providerId || undefined;

      // 2. Resolve Role & Tools
      const rawRole = await prisma.role.findUnique({
        where: { id: roleId },
        include: { tools: { include: { tool: true } }, variants: { where: { isActive: true }, take: 1 } }
      });

      // Flatten DNA (Shared Logic with Router)
      // Flatten DNA (Shared Logic with Router)
      const role: ExtendedRole | null = rawRole ? { ...rawRole } as ExtendedRole : null;
      let tools = rawRole?.tools.map(rt => rt.tool.name) || [];
      
      if (role && rawRole?.variants?.length) {
        const v = rawRole.variants[0];
        const cortex = (v.cortexConfig as Record<string, unknown>) || {};
        const identity = (v.identityConfig as Record<string, unknown>) || {};
        const caps = (Array.isArray(cortex.capabilities) ? cortex.capabilities : []) as string[];

        role.needsVision = caps.includes('vision');
        role.needsCoding = caps.includes('coding');
        role.needsReasoning = caps.includes('reasoning');
        role.needsTools = caps.includes('tools');

        if (typeof identity.systemPromptDraft === 'string' && identity.systemPromptDraft) {
            role.basePrompt = identity.systemPromptDraft;
        }
        
        if (Array.isArray(cortex.tools)) {
             const extraTools = cortex.tools as string[];
             tools = Array.from(new Set([...tools, ...extraTools]));
        }

      }



      // If user provided a specific model, verify it exists/provider is active. If not, clear it to force auto-selection.
      if (resolvedModelId) {
        // [FIX] More robust CUID detection. Stable IDs (provider:name) usually don't start with 'c' 
        // and have colons. CUIDs start with 'c' and are 25 chars.
        const isCuid = resolvedModelId.length === 25 && resolvedModelId.startsWith('c');
        
        if (isCuid) {
             console.log(`[AgentService] 🔍 Detected CUID: ${resolvedModelId}. Attempting to resolve to stable ID...`);
             const modelRecord = await prisma.model.findUnique({ 
                 where: { id: resolvedModelId },
                 include: { provider: true }
             });
             if (modelRecord) {
                 resolvedModelId = modelRecord.name;
                 resolvedProviderId = modelRecord.providerId;
             }
        }

        if (resolvedProviderId && !ProviderManager.hasProvider(resolvedProviderId)) {
          console.warn(`[AgentService] ⚠️ Provider '${resolvedProviderId}' not found in memory. Switching to auto-selection.`);
          resolvedModelId = null;
          resolvedProviderId = undefined;
        }
      }

      // Auto-Select if needed
      if (!resolvedModelId) {
        const selector = new LLMSelector();
        const safeRole = role || ({ id: 'default', metadata: {} } as ExtendedRole);
        try {
          const bestSlug = await selector.resolveModelForRole(safeRole as unknown as SelectorRole, 0, []);
          const bestModel = await prisma.model.findUnique({ 
            where: { id: bestSlug },
            include: { provider: true }
          });
          if (bestModel) {
            resolvedModelId = bestModel.name; // Use technical name (e.g. gpt-4o)
            resolvedProviderId = bestModel.providerId;
          }
        } catch (e) {
          console.error("[AgentService] Critical: Could not resolve ANY model from DB. Using emergency fallback.", e);
          resolvedModelId = "llama3";
          resolvedProviderId = "ollama";
        }
      }

      const agentConfig: AgentConfig = {
        roleId,
        modelId: resolvedModelId!,
        providerId: resolvedProviderId,
        isLocked: false,
        temperature: modelConfig.temperature,
        maxTokens: modelConfig.maxTokens,
        userGoal: finalUserGoal,
        projectPrompt,
      };


      const runtime = await AgentRuntime.create(undefined, tools);

      // --- RESILIENCE LOOP ---
      let agent: VolcanoAgent | undefined;
      let initialResponse = "";
      const failedModels: string[] = [];
      const failedProviders: string[] = [];
      const MAX_RETRIES = 4; // Generous retries

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          console.log(`[AgentService] 🚀 Start Attempt ${attempt + 1}/${MAX_RETRIES + 1} with ${agentConfig.modelId} (${agentConfig.providerId})`);

          // [STEP A] Create Agent
          // This creates the provider instance. If API key is missing, this throws.
          agent = await createVolcanoAgent(agentConfig);

          // [STEP B] Execute
          // This makes the network call. If network fails, this throws.
          initialResponse = await runtime.generateWithContext(
            agent,
            role?.basePrompt || "",
            finalUserGoal,
            roleId,
            sessionId
          ) as string;

          // Success!
          break;

        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          console.warn(`[AgentService] ⚠️ Attempt ${attempt + 1} failed: "${msg}"`);

          // [CRITICAL FIX] Catch-all for "fetch", "key", "config", "provider", "found"
          // Added 'capacity' to catch Mistral/Cerebras capacity errors
          const isRecoverable = /fetch|network|connect|timeout|refused|key|config|provider|found|credential|rate|limit|quota|capacity|401|403|404|429|500|503/i.test(msg);

          if (attempt === MAX_RETRIES) {
            console.error("[AgentService] ❌ Exhausted all retries.");
            // [FAIL-OPEN] Return a safe error message to the UI conversation instead of throwing 500
            return {
              sessionId,
              status: "completed",
              cardId,
              result: `**System Alert**: I encountered a critical connection error after multiple attempts. \n\nDebug Info: \n- Last attempted model: ${agentConfig.modelId}\n- Error: ${msg}\n\nPlease check your provider settings or try a local model (Ollama).`,
              logs: [],
              modelId: agentConfig.modelId,
              providerId: agentConfig.providerId
            };
          }

          if (!isRecoverable) {
            console.error(`[AgentService] Non-recoverable error: ${msg}`);
            throw err; // Logic bugs (e.g. "undefined is not a function") should still crash
          }

          // [STEP C] Failover Logic
          if (agentConfig.modelId) {
            failedModels.push(agentConfig.modelId);
            if (agentConfig.providerId) {
              // Async record failure so we don't block
              recordModelFailure(agentConfig.providerId, agentConfig.modelId, roleId).catch(console.error);
            }
          }

          try {
            const selector = new LLMSelector();
            const safeRole = role || ({ id: 'default', metadata: {} } as ExtendedRole);

            // [RESILIENCE] If provider capacity exceeded or 429, blacklist provider for this session too
            if (agentConfig.providerId && /capacity|quota|rate|limit|429/i.test(msg)) {
                failedProviders.push(agentConfig.providerId);
                console.log(`[AgentService] 🛑 Provider '${agentConfig.providerId}' seems overloaded. Blacklisting for this session.`);
            }

            const fallbackId = await selector.resolveModelForRole(safeRole as unknown as SelectorRole, 0, failedModels, failedProviders);
            const fallback = await prisma.model.findUnique({ where: { id: fallbackId } });

            if (fallback) {
              agentConfig.modelId = fallback.name;
              agentConfig.providerId = fallback.providerId;
              console.log(`[AgentService] 🔄 Switching to fallback: ${fallback.name}`);
            } else {
              throw new Error("Selector returned no model");
            }
          } catch {
            console.warn("[AgentService] 🛑 Selector failed to find backup. Trying generic local fallback.");
            // Emergency Hardcoded Fallbacks if DB selection fails
            if (agentConfig.providerId !== 'ollama') {
              agentConfig.providerId = 'ollama';
              agentConfig.modelId = 'llama3';
            } else {
              agentConfig.modelId = 'mistral'; // Try a different local model
            }
          }
        }
      }

      // [RESILIENCE] Conversation Loop with Hot-Swap
      const { result, logs } = await runtime.runAgentLoop(
        finalUserGoal,
        initialResponse,
        async (retryPrompt: string) => {
          // Inner loop for multi-turn reliability
          for (let i = 0; i < 3; i++) {
            try {
              return await runtime.generateWithContext(agent!, role?.basePrompt || "", retryPrompt, roleId) as string;
            } catch (e: unknown) {
              const errMsg = e instanceof Error ? e.message : String(e);
              console.warn(`[AgentService] Mid-conversation error: ${errMsg}. Retrying...`);
              // Simple retry for now, full hot-swap logic can be added here if needed
              if (i === 2) throw e;
            }
          }
          throw new Error("Agent loop failed");
        }
      );

      // [USER REQUEST] Save swappable card to file
      try {
        let filePath: string;

        if (context?.targetFile) {
          // User specified a target file — respect it (absolute or relative)
          filePath = path.isAbsolute(context.targetFile)
            ? context.targetFile
            : path.resolve(process.cwd(), context.targetFile);
        } else {
          // Default fallback: chats/{cardId}.md
          const chatsDir = path.join(process.cwd(), 'chats');
          await fs.mkdir(chatsDir, { recursive: true });
          filePath = path.join(chatsDir, `${cardId}.md`);
        }

        // Ensure directory exists for target file
        await fs.mkdir(path.dirname(filePath), { recursive: true });

        await fs.writeFile(filePath, result, 'utf-8');
        console.log(`[AgentService] 💾 Saved session result to ${filePath}`);
      } catch (saveErr) {
        console.error('[AgentService] Failed to save card file:', saveErr);
      }

      return {
        sessionId,
        status: "completed",
        cardId,
        result,
        logs,
        modelId: agent?.getConfig().modelId || resolvedModelId!,
        providerId: agent?.getConfig().providerId || resolvedProviderId,
      };

    } catch (error) {
      console.error("[AgentService] Session Fatal Error:", error);
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
