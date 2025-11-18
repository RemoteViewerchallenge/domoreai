import { createRouter, publicProcedure } from '../trpc';
import { z } from 'zod';
import { run } from '@repo/volcano-sdk';

export const agentRouter = createRouter({
  runTask: publicProcedure
    .input(z.object({
      prompt: z.string(),
      roleId: z.string().optional(),
      // Define other inputs for tools as needed
    }))
    .mutation(async ({ input }) => {
      const { prompt, roleId } = input;

      const result = await run({
        prompt,
        roleId,
        tools: [], // Add tools here
      });

      return result;
    }),
});
