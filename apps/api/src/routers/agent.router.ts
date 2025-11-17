import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc.js';

export const agentRouter = createTRPCRouter({
  assistTerminal: publicProcedure
    .input(z.object({ command: z.string() }))
    .mutation(({ input }) => {
      // In a real implementation, this would call an AI to correct the command.
      // For now, we'll just return the command as is.
      return input.command;
    }),
});
