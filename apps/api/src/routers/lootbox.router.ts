import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc.js';
import { McpOrchestrator } from '../services/McpOrchestrator.js';

const orchestrator = new McpOrchestrator();

export const lootboxRouter = createTRPCRouter({
  getTools: publicProcedure
    .query(async () => {
      return orchestrator.getTools();
    }),

  executeTool: publicProcedure
    .input(z.object({ 
      toolName: z.string(), 
      args: z.any(),
      clientId: z.string().optional() // Add optional clientId for MCP routing
    }))
    .mutation(async ({ input }) => {
      return orchestrator.executeTool(input.toolName, input.args, input.clientId);
    }),

  // New: Management endpoints
  spawnServer: publicProcedure
    .input(z.object({ id: z.string(), command: z.string(), args: z.array(z.string()) }))
    .mutation(async ({ input }) => {
      return orchestrator.spawnServer(input.id, input.command, input.args);
    }),

  connectServer: publicProcedure
    .input(z.object({ id: z.string(), url: z.string() }))
    .mutation(async ({ input }) => {
      return orchestrator.connectServer(input.id, input.url);
    }),
});
