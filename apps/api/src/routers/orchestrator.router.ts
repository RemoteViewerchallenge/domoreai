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
    })
});
