import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc.js';
import { AgentService, startSessionSchema } from '../services/agent.service.js';

const agentService = new AgentService();

export const agentRouter = createTRPCRouter({
  /**
   * Start an agent session
   * This creates an agent runtime and begins execution
   */
  startSession: publicProcedure
    .input(startSessionSchema)
    .mutation(async ({ input }) => {
      return agentService.startSession(input);
    }),

  /**
   * Get session status (placeholder for future implementation)
   */
  getSessionStatus: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ input }) => {
      // TODO: Implement session status tracking in service
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
      // TODO: Implement session termination in service
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
      return agentService.generateQuery(input);
    }),
});
