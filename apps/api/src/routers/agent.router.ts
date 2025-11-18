import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc.js';
import { run } from '@repo/volcano-sdk';

const runTaskSchema = z.object({
  prompt: z.string(),
  roleId: z.string().optional(),
});

export const agentRouter = createTRPCRouter({
  runTask: publicProcedure
    .input(runTaskSchema)
    .mutation(async ({ ctx, input }) => {
      let finalPrompt = input.prompt;

      if (input.roleId) {
        const role = await ctx.db.role.findUnique({
          where: { id: input.roleId },
        });
        if (role) {
          finalPrompt = `${role.basePrompt}\n\n${input.prompt}`;
        }
      }

      // Assuming volcano-sdk has a `run` function
      const result = await run({ prompt: finalPrompt });
      return result;
    }),
});
