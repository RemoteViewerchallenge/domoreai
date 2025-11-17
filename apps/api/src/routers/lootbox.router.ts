import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc.js';
import { LootboxService } from '../services/lootbox.service.js';

const lootboxService = new LootboxService();

const executeToolInputSchema = z.object({
  toolName: z.string(),
  args: z.any(),
});

export const lootboxRouter = createTRPCRouter({
  getTools: protectedProcedure
    .query(() => {
      return lootboxService.getTools();
    }),
  executeTool: protectedProcedure
    .input(executeToolInputSchema)
    .mutation(({ input }) => {
      return lootboxService.executeTool(input.toolName, input.args);
    }),
});
