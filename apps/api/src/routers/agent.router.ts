import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc.js';
import { AgentRuntime } from '../services/AgentRuntime.js';
import { createVolcanoAgent } from '../services/AgentFactory.js';
import type { CardAgentState } from '../services/AgentFactory.js';
import { ProviderManager } from '../services/ProviderManager.js';

import { prisma } from '../db.js';

/**
 * Agent Router
 * Handles agent session management and execution
 */

const startSessionSchema = z.object({
  roleId: z.string(),
  modelConfig: z.object({
    providerId: z.string().optional(),
    modelId: z.string().optional(),
    temperature: z.number().min(0).max(2).default(0.7),
    maxTokens: z.number().int().min(256).max(32000).default(2048),
  }),
  userGoal: z.string().min(1, 'User goal/prompt is required'),
  cardId: z.string(), // For targeting WebSocket events
});

const BASE_PROMPT_SQL_HELPER = `
You are an expert PostgreSQL Query Generator. Your task is to translate the user's natural language request into a single, clean SQL query that can be executed against the available database tables.

The user is querying the following table schemas:
[TABLE_SCHEMAS_CONTEXT]

User Request: [USER_PROMPT]

Constraints:
1. Only output the raw SQL query text. Do NOT include any markdown, commentary, or explanation (e.g., do not use \`\`\`sql ... \`\`\`).
2. Only use SELECT statements. Do not use INSERT, DELETE, DROP, or ALTER.
`;

async function ensureSqlHelperRole(): Promise<string> {
  const name = 'sql-query-helper';
  let role = await prisma.role.findFirst({ where: { name } });
  if (!role) {
    role = await prisma.role.create({
      data: {
        name,
        basePrompt: BASE_PROMPT_SQL_HELPER,
        needsReasoning: true,
        needsCoding: true,
        defaultTemperature: 0.3,
        defaultMaxTokens: 1024,
      } as any,
    });
  }
  return role.id;
}

export const agentRouter = createTRPCRouter({
  /**
   * Start an agent session
   * This creates an agent runtime and begins execution
   */
  startSession: publicProcedure
    .input(startSessionSchema)
    .mutation(async ({ input }) => {
      const { roleId, modelConfig, userGoal, cardId } = input;

      try {
        // 1.5 Fetch Workspace Prompt
        const card = await prisma.workOrderCard.findUnique({
             where: { id: cardId },
             include: { workspace: true }
        });
        const projectPrompt = card?.systemPrompt || undefined;

        // 1. Create the agent configuration
        const agentConfig: CardAgentState = {
          roleId,
          modelId: modelConfig.modelId || null,
          isLocked: !!modelConfig.modelId, // Lock if model is explicitly provided
          temperature: modelConfig.temperature,
          maxTokens: modelConfig.maxTokens,
          userGoal, // Pass user goal for memory injection
          projectPrompt,
        };

        // 2. Create the Volcano agent
        const agent = await createVolcanoAgent(agentConfig);

        // 2.5 Fetch Role to get Tools and other defaults
        const roleRecord = await prisma.role.findUnique({ where: { id: roleId } });
        const role = roleRecord ? { ...roleRecord } as any : null;
        const tools = (role && role.tools) ? role.tools : [];

        // 3. Create the agent runtime with selected tools
        const runtime = await AgentRuntime.create(undefined, tools);

        // 4. Define the LLM callback that uses our Volcano agent and enriches
        //    the system prompt with role context from the runtime's ContextManager.
        const llmCallback = async (prompt: string): Promise<string> => {
          const basePrompt = role?.basePrompt || '';
          return (await runtime.generateWithContext(agent, basePrompt, prompt, roleId)) as string;
        };

        // 5. Start the agent loop (Synchronous for now to ensure UI update)
        const sessionId = `session-${cardId}-${Date.now()}`;

        // Execute the agent loop and wait for result
        const { result, logs } = await runtime.runAgentLoop(userGoal, llmCallback);
        
        console.log(`[Agent Session ${sessionId}] Completed:`, { result, logs });

        // Get the actual model used
        const usedConfig = agent.getConfig();

        // 6. Return session info and result immediately
        return {
          sessionId,
          status: 'completed' as const,
          cardId,
          result,
          logs,
          modelId: usedConfig.modelId,
          providerId: usedConfig.providerId
        };
      } catch (error) {
        console.error('[Agent Router] Failed to start session:', error);
        throw new Error(
          error instanceof Error 
            ? `Failed to start agent session: ${error.message}` 
            : 'Failed to start agent session'
        );
      }
    }),

  /**
   * Get session status (placeholder for future implementation)
   */
  getSessionStatus: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ input }) => {
      // TODO: Implement session status tracking
      return {
        sessionId: input.sessionId,
        status: 'running' as const,
        message: 'Session status tracking not yet implemented',
      };
    }),

  /**
   * Stop a running session (placeholder for future implementation)
   */
  stopSession: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ input }) => {
      // TODO: Implement session termination
      return {
        sessionId: input.sessionId,
        status: 'stopped' as const,
        message: 'Session termination not yet implemented',
      };
    }),

  // Generate SQL query via dedicated role and model selection
  generateQuery: publicProcedure
    .input(z.object({
      userPrompt: z.string().min(10),
      targetTable: z.string().optional(),
      roleName: z.string().optional().default('sql-query-helper'),
    }))
    .mutation(async ({ input }) => {
      const { userPrompt, targetTable, roleName } = input;

      // 1. Try to find an optional role; fall back to base prompt if none
      let role = null as any;
      if (roleName) {
        role = await prisma.role.findFirst({ where: { name: roleName } });
        if (!role) {
          console.warn(`[AgentRouter] Role "${roleName}" not found; proceeding without role-specific settings.`);
        }
      }

      // 2. Build schema context (lightweight)
      let schemaContext = '';
      if (targetTable) {
        const rows = await prisma.$queryRawUnsafe<any[]>(
          `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '${targetTable}'`
        );
        schemaContext = rows.length
          ? `The primary table is "${targetTable}" with columns: ` + rows.map(r => `${r.column_name} (${r.data_type})`).join(', ')
          : '';
      }

      // 3. Final prompt
      const finalPrompt = ((role && role.basePrompt) || BASE_PROMPT_SQL_HELPER)
        .replace('[TABLE_SCHEMAS_CONTEXT]', schemaContext)
        .replace('[USER_PROMPT]', userPrompt);

      // 4. Select Model using Dynamic Role Criteria
      // This respects the "wiring" where roles select models based on parameters/criteria.
      const { getBestModel } = await import('../services/modelManager.service.js');
      
      let selectedModel;
      try {
        selectedModel = await getBestModel(role?.id, [], []);
      } catch (e) {
        console.warn(`[AgentRouter] Dynamic model selection failed for role ${roleName}:`, e);
      }

      // Fallback if dynamic selection fails (e.g. strict criteria with no matches)
      if (!selectedModel) {
        console.log(`[AgentRouter] Falling back to any enabled model for ${roleName}`);
        const fallback = await prisma.model.findFirst({
          where: { provider: { isEnabled: true } },
          include: { provider: true },
        });
        
        if (fallback) {
            selectedModel = {
                modelId: fallback.modelId,
                providerId: fallback.providerId,
                temperature: role.defaultTemperature ?? 0.1,
                maxTokens: role.defaultMaxTokens ?? 1024
            };
        }
      }

      if (!selectedModel) throw new Error('No suitable models available for SQL generation.');

      console.log(`[AgentRouter] Generating SQL using model: ${selectedModel.modelId} (${selectedModel.providerId})`);

      // Attempt generation with retries and model fallbacks on invalid-model errors
      const maxAttempts = 3;
      const failedModels: string[] = [];
      const failedProviders: string[] = [];
      let attempt = 0;
      let queryText = '';
      while (attempt < maxAttempts) {
        attempt++;
        const provider = ProviderManager.getProvider(selectedModel.providerId);
        if (!provider) throw new Error(`Selected provider ${selectedModel.providerId} is not initialized.`);

        try {
          const text = await provider.generateCompletion({
            modelId: selectedModel.modelId,
            messages: [{ role: 'user', content: finalPrompt }],
            temperature: selectedModel.temperature ?? 0.1,
            max_tokens: selectedModel.maxTokens ?? 1024,
          });

          // Strip markdown code blocks if present
          queryText = (text || '').trim();
          if (queryText.startsWith('```sql')) {
            queryText = queryText.replace(/^```sql\s*/, '').replace(/\s*```$/, '');
          } else if (queryText.startsWith('```')) {
            queryText = queryText.replace(/^```\s*/, '').replace(/\s*```$/, '');
          }

          // Success
          break;
        } catch (err: any) {
          const errMsg = (err && err.message) ? String(err.message) : String(err);
          console.warn(`[AgentRouter] Model generation failed for ${selectedModel.modelId} (${selectedModel.providerId}): ${errMsg}`);

          // If provider says invalid model, blacklist this model and try again
          if (/invalid model|not found|invalid model id/i.test(errMsg)) {
            // Persist the failure so future selections (even after restart) will avoid it
            try {
              const { recordModelFailure, recordProviderFailure } = await import('../services/modelManager.service.js');
              await recordModelFailure(selectedModel.providerId, selectedModel.modelId, role?.id);
              await recordProviderFailure(selectedModel.providerId, role?.id);
            } catch (recErr) {
              console.warn('[AgentRouter] Failed to persist model/provider failure:', recErr);
            }

            // Add provider-level fallback so we don't retry another model from the same provider
            if (!failedProviders.includes(selectedModel.providerId)) failedProviders.push(selectedModel.providerId);

            // Also track the failed model id for good measure
            if (!failedModels.includes(selectedModel.modelId)) failedModels.push(selectedModel.modelId);

            // Select a new model avoiding the failed ones
            try {
              selectedModel = await getBestModel(role?.id, failedModels, failedProviders);
              if (!selectedModel) {
                console.warn('[AgentRouter] No alternative model available after failure');
                throw new Error('No alternative models available');
              }
              console.log(`[AgentRouter] Retrying with new model: ${selectedModel.modelId} (${selectedModel.providerId})`);
            } catch (selectErr) {
              console.warn('[AgentRouter] Failed to select alternative model:', selectErr);
              // Try fallback selection
              try {
                const fallback = await getBestModel(role?.id, failedModels, failedProviders);
                if (!fallback) throw new Error('No fallback model available');
                selectedModel = fallback as any; // update to new candidate
                console.log(`[AgentRouter] Retrying with fallback: ${selectedModel.modelId} (${selectedModel.providerId})`);
                continue; // retry loop
              } catch (fallbackErr) {
                console.warn('[AgentRouter] Fallback selection failed:', fallbackErr);
                // Continue to outer loop until attempts exhausted
              }
            }
          } else {
            throw err; // re-throw if not invalid model
          }
        }
      }

      if (!queryText) throw new Error('Failed to generate query after multiple attempts.');

      return { queryText };
    }),
});
