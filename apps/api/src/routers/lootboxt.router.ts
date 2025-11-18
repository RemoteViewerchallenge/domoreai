import { createTRPCRouter, publicProcedure } from '../trpc.js';
import { LootboxService } from '../services/lootbox.service.js';
import { z } from 'zod';

// Initialize the service as a singleton
const lootboxService = new LootboxService();

export const lootboxRouter = createTRPCRouter({
  /**
   * Fetches the list of all available tools from the Registry Server.
   */
  getTools: publicProcedure.query(async () => {
    return await lootboxService.getTools();
  }),

  /**
   * Sends a command to the Proxy Server to execute a tool.
   */
  executeTool: publicProcedure
    .input(
      z.object({
        toolName: z.string(),
        args: z.any(), // We can be more specific later
      })
    )
    .mutation(async ({ input }: { input: any }) => {
      return await lootboxService.executeTool(input.toolName, input.args);
    }),
});