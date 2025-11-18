import { createTRPCRouter, publicProcedure } from '../trpc';
import { z } from 'zod';
import { run } from '@repo/volcano-sdk';

export const agentRouter = createTRPCRouter({
  runTask: publicProcedure
    .input(
      z.object({
        prompt: z.string(),
        activeRoleId: z.string().nullable(),
      }),
    )
    .mutation(async ({ input }) => {
      const { prompt, activeRoleId } = input;

      // The backend logic can now use it:
      const result = await run({
        prompt,
        roleId: activeRoleId,
        // tools: [], // Add tools here if needed
      });

      return result;
    }),
});
