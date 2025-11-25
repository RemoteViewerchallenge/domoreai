import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc.js';
import { UsageCollector } from '../services/UsageCollector.js';

export const usageRouter = createTRPCRouter({
  getProviderStats: protectedProcedure
    .input(z.object({ providerId: z.string() }))
    .query(async ({ input }) => {
      // This calls the UsageCollector to fetch raw Redis keys
      return await UsageCollector.getProviderStats(input.providerId);
    }),
});
