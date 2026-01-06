import { z } from 'zod';
import { createTRPCRouter, protectedProcedure, publicProcedure } from '../trpc.js';

export const orchestratorRouter = createTRPCRouter({
  getConfig: protectedProcedure.query(async () => {
    return {
      autoHealing: true,
      loadBalancing: true,
      costCap: 100,
      excludeProviders: []
    };
  }),

  updateConfig: protectedProcedure
    .input(z.object({
      autoHealing: z.boolean().optional(),
      loadBalancing: z.boolean().optional(),
      costCap: z.number().optional(),
      excludeProviders: z.array(z.string()).optional()
    }))
    .mutation(async ({ input }) => {
      return { success: true };
    }),

  listModels: protectedProcedure
    .input(z.object({
      capability: z.string().optional(),
      minContext: z.number().optional()
    }))
    .query(async () => {
      // Stubbed return to avoid Prisma dependency issues for now
      return [];
    }),
    
  getActiveRegistryData: publicProcedure.query(async ({ ctx }) => {
     // Return flat list of models for now
     const models = await ctx.prisma.model.findMany();
     return {
         rows: models,
         models: models
     };
  }),

  // Tool Example Management
  getToolExamples: publicProcedure
    .input(z.object({ toolName: z.string() }))
    .query(async ({ input, ctx }) => {
        const tool = await ctx.prisma.tool.findUnique({
            where: { name: input.toolName }
        });
        return { content: tool?.instruction || '' };
    }),

  updateToolExamples: protectedProcedure
    .input(z.object({ toolName: z.string(), content: z.string() }))
    .mutation(async ({ input, ctx }) => {
        return ctx.prisma.tool.update({
            where: { name: input.toolName },
            data: { instruction: input.content }
        });
    })
});
