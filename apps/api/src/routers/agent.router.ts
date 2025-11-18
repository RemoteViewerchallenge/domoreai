import { createRouter, publicProcedure } from '../trpc';
import { z } from 'zod';

export const agentRouter = createRouter({
  runTask: publicProcedure
    .input(z.object({ prompt: z.string() }))
    .mutation(async ({ input }) => {
      // TODO: Implement actual agent logic
      console.log(`Received prompt: ${input.prompt}`);
      return {
        output: `Received prompt: ${input.prompt}`,
      };
    }),
});
