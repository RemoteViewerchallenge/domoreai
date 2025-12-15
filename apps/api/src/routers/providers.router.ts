// --- providers.router.ts ---
import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc.js';
import { ProviderService } from '../services/provider.service.js';

const providerService = new ProviderService();

export const providerRouter = createTRPCRouter({
  list: publicProcedure.query(async () => {
    return providerService.listProviders();
  }),

  add: publicProcedure
    .input(z.object({
      name: z.string(),
      providerType: z.string(),
      baseURL: z.string(),
      apiKey: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return providerService.addProvider(input);
    }),

  listAllAvailableModels: publicProcedure.query(async () => {
    return providerService.listAllAvailableModels();
  }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return providerService.deleteProvider(input.id);
    }),

  fetchAndNormalizeModels: publicProcedure
    .input(z.object({ providerId: z.string() }))
    .mutation(async ({ input }) => {
      return providerService.fetchAndNormalizeModels(input.providerId);
    }),

  // Legacy/Debug endpoints
  getRawData: publicProcedure.query(async () => { return []; }),
  deleteRawData: publicProcedure.input(z.object({ id: z.string() })).mutation(async () => { return null; }),
  createRawData: publicProcedure.input(z.any()).mutation(async () => { return null; }),
});
