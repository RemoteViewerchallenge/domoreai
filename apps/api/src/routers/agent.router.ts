import { createTRPCRouter, publicProcedure } from '../trpc.js';
import { z } from 'zod';

export const agentRouter = createTRPCRouter({
  assistTerminal: publicProcedure
    .input(z.object({ command: z.string() }))
    .mutation(async ({ input }) => {
      // In a real implementation, this would call an LLM to get the corrected command.
      // For now, we'll just return a mock response.
      return {
        tool: 'shell',
        args: {
          command: input.command,
        },
      };
    }),
});
