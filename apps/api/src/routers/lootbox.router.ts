import { z } from 'zod'; // Import Zod directly
import { createTRPCRouter, publicProcedure } from '../trpc.js';
import { LootboxService } from '../services/lootbox.service.js';

const lootboxService = new LootboxService();

export const lootboxRouter = createTRPCRouter({
  getTools: publicProcedure
    .query(async () => {
      return lootboxService.getTools();
    }),

  executeTool: publicProcedure
    .input(z.object({ toolName: z.string(), args: z.any() }))
    .mutation(async ({ input }) => {
      return lootboxService.executeTool(input.toolName, input.args);
    }),
});
