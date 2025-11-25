import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc.js';
import { AgentRuntime } from '../services/AgentRuntime.js';
import { createVolcanoAgent } from '../services/AgentFactory.js';
import type { CardAgentState } from '../services/AgentFactory.js';

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
});
