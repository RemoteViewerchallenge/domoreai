// --- providers.router.ts ---
import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc.js';
import { ProviderService } from '../services/provider.service.js';

const providerService = new ProviderService();

export const providerRouter = createTRPCRouter({
  list: publicProcedure.query(async () => {
    return providerService.listProviders();
  }),

  // [UPDATED] Expanded to support new financial/metadata fields
  upsert: publicProcedure
    .input(z.object({
      id: z.string().optional(),
      name: z.string(),
      providerType: z.string(),
      baseURL: z.string(),
      apiKey: z.string().optional(),
      apiKeyEnvVar: z.string().optional(),
      pricingUrl: z.string().optional(),
      isCreditCardLinked: z.boolean().optional(),
      enforceFreeOnly: z.boolean().optional(),
      monthlyBudget: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      return providerService.upsertProviderConfig({
        id: input.id,
        label: input.name,
        type: input.providerType,
        baseURL: input.baseURL,
        apiKey: input.apiKey,
        apiKeyEnvVar: input.apiKeyEnvVar,
        pricingUrl: input.pricingUrl,
        isCreditCardLinked: input.isCreditCardLinked,
        enforceFreeOnly: input.enforceFreeOnly,
        monthlyBudget: input.monthlyBudget,
      });
    }),

  // [NEW] Trigger the Surveyor for a specific provider
  scout: publicProcedure
    .input(z.object({ providerId: z.string() }))
    .mutation(async ({ input }) => {
      // 1. Fetch models
      await providerService.fetchAndNormalizeModels(input.providerId);
      // 2. Run Surveyor to identify capabilities and populate specialized tables
      const { Surveyor } = await import('../services/Surveyor.js');
      return await Surveyor.surveyAll(); // In a real system, we'd filter Surveyor to just this providerId
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
