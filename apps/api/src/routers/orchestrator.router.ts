import { z } from 'zod';
import { createTRPCRouter, publicProcedure, protectedProcedure } from '../trpc.js';

export const orchestratorRouter = createTRPCRouter({
  getConfig: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.orchestratorConfig.upsert({
      where: { id: 'global' },
      update: {},
      create: { activeTableName: 'unified_models' }
    });
  }),

  updateConfig: protectedProcedure
    .input(z.object({ activeTableName: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.orchestratorConfig.update({
        where: { id: 'global' },
        data: { activeTableName: input.activeTableName }
      });
    }),

  triggerProbe: protectedProcedure
    .input(z.object({ providerId: z.string(), modelId: z.string() }))
    .mutation(async ({ input }) => {
      // Import dynamically to avoid circular deps if any, or just import at top
      const { ProviderProbeService } = await import('../services/ProviderProbeService.js');
      await ProviderProbeService.probe(input.providerId, input.modelId);
      return { success: true };
    }),
});
