import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc.js';
import { AgentRuntime } from '../services/AgentRuntime.js';
import { createVolcanoAgent } from '../services/AgentFactory.js';
import type { CardAgentState } from '../services/AgentFactory.js';
import { ProviderManager } from '../services/ProviderManager.js';
import { selectCandidateModels } from '../lib/modelSelector.js';
import { db } from '../db.js';

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
  let role = await db.role.findFirst({ where: { name } });
  if (!role) {
    role = await db.role.create({
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
        // 1. Create the agent configuration
        const agentConfig: CardAgentState = {
          roleId,
          modelId: modelConfig.modelId || null,
          isLocked: !!modelConfig.modelId, // Lock if model is explicitly provided
          temperature: modelConfig.temperature,
          maxTokens: modelConfig.maxTokens,
        };

        // 2. Create the Volcano agent
        const agent = await createVolcanoAgent(agentConfig);

        // 3. Create the agent runtime
        const runtime = await AgentRuntime.create();

        // 4. Define the LLM callback that uses our Volcano agent
        const llmCallback = async (prompt: string): Promise<string> => {
          return await agent.generate(prompt);
        };

        // 5. Start the agent loop (this will execute asynchronously)
        // In a real implementation, you'd want to:
        // - Store the session in a database
        // - Stream results via WebSocket to the specific cardId
        // - Handle errors and timeouts
        const sessionId = `session-${cardId}-${Date.now()}`;

        // Execute the agent loop in the background
        runtime.runAgentLoop(userGoal, llmCallback)
          .then(({ result, logs }) => {
            console.log(`[Agent Session ${sessionId}] Completed:`, { result, logs });
            // TODO: Emit completion event via WebSocket to cardId
          })
          .catch((error) => {
            console.error(`[Agent Session ${sessionId}] Error:`, error);
            // TODO: Emit error event via WebSocket to cardId
          });

        // 6. Return session info immediately
        return {
          sessionId,
          status: 'started' as const,
          cardId,
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

      // 1. Ensure role exists
      await ensureSqlHelperRole();
      const role = await db.role.findFirstOrThrow({ where: { name: roleName } });

      // 2. Build schema context (lightweight)
      let schemaContext = '';
      if (targetTable) {
        const rows = await db.$queryRawUnsafe<any[]>(
          `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '${targetTable}'`
        );
        schemaContext = rows.length
          ? `The primary table is "${targetTable}" with columns: ` + rows.map(r => `${r.column_name} (${r.data_type})`).join(', ')
          : '';
      }

      // 3. Final prompt
      const finalPrompt = (role.basePrompt || BASE_PROMPT_SQL_HELPER)
        .replace('[TABLE_SCHEMAS_CONTEXT]', schemaContext)
        .replace('[USER_PROMPT]', userPrompt);

      // 4. Pick any enabled model (prefer Ollama), no parameter constraints
      //    This is a temporary bypass to get query generation unblocked.
      const preferred = await db.model.findFirst({
        where: { provider: { isEnabled: true, type: 'ollama' } },
        include: { provider: true },
      });
      const fallback = preferred || await db.model.findFirst({
        where: { provider: { isEnabled: true } },
        include: { provider: true },
      });
      if (!fallback) throw new Error('No suitable models available.');

      const provider = ProviderManager.getProvider(fallback.providerId);
      if (!provider) throw new Error('Selected provider is not initialized.');

      const text = await provider.generateCompletion({
        modelId: fallback.modelId,
        messages: [{ role: 'user', content: finalPrompt }],
        temperature: role.defaultTemperature ?? 0.3,
        max_tokens: role.defaultMaxTokens ?? 1024,
      });
      const queryText = (text || '').trim();
      return { queryText };
    }),
});
