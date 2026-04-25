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
      name: z.string().optional(),
      providerType: z.string().optional(),
      baseUrl: z.string().optional(),
      apiKey: z.string().optional(),
      apiKeyEnvVar: z.string().optional(),
      pricingUrl: z.string().optional(),
      isCreditCardLinked: z.boolean().optional(),
      enforceFreeOnly: z.boolean().optional(),
      monthlyBudget: z.number().optional(),
      serviceCategories: z.array(z.string()).optional(),
      billingRiskLevel: z.enum(['ZERO_RISK', 'PROMO_BURN', 'CC_ON_FILE']).optional(),
      promoMonthlyLimit: z.number().optional(),
      currentScrapedSpend: z.number().optional(),
      billingDashboardUrl: z.string().optional(),
      lastScrapeTime: z.date().optional(),
      providerClass: z.enum(['FOUNDATIONAL', 'AGGREGATOR', 'INFERENCE_ENGINE', 'LOCAL']).optional(),
    }))
    .mutation(async ({ input }) => {
      return providerService.upsertProviderConfig({
        id: input.id,
        name: input.name,
        type: input.providerType,
        baseUrl: input.baseUrl,
        apiKey: input.apiKey,
        apiKeyEnvVar: input.apiKeyEnvVar,
        pricingUrl: input.pricingUrl,
        isCreditCardLinked: input.isCreditCardLinked,
        enforceFreeOnly: input.enforceFreeOnly,
        monthlyBudget: input.monthlyBudget,
        serviceCategories: input.serviceCategories,
        billingRiskLevel: input.billingRiskLevel,
        promoMonthlyLimit: input.promoMonthlyLimit,
        currentScrapedSpend: input.currentScrapedSpend,
        billingDashboardUrl: input.billingDashboardUrl,
        lastScrapeTime: input.lastScrapeTime,
        providerClass: input.providerClass,
      });
    }),

  // [NEW] Trigger the Surveyor for a specific provider
  scout: publicProcedure
    .input(z.object({ providerId: z.string() }))
    .mutation(async ({ input }) => {
      // 1. Fetch models
      const syncResult = await providerService.fetchAndNormalizeModels(input.providerId);
      
      // 2. Run Surveyor to identify capabilities and populate specialized tables
      const { Surveyor } = await import('../services/Surveyor.js');
      const surveyResult = await Surveyor.surveyAll(); 

      // 3. Return combined result with updated provider state
      const provider = await providerService.getProvider(input.providerId);
      return {
        ...syncResult,
        ...surveyResult,
        provider
      };
    }),

  // [NEW] Scrape billing balance
  scrapeBalance: publicProcedure
    .input(z.object({ providerId: z.string() }))
    .mutation(async ({ input }) => {
      const { BillingScraper } = await import('../services/billingScraper.js');
      const scraper = new BillingScraper();
      return scraper.scrapeAndSyncBalance(input.providerId);
    }),

  // [NEW] Save billing session
  saveBillingSession: publicProcedure
    .input(z.object({
      providerId: z.string(),
      dashboardUrl: z.string(),
      cookies: z.array(z.object({
        name: z.string(),
        value: z.string(),
        domain: z.string(),
        path: z.string(),
        secure: z.boolean().optional(),
        httpOnly: z.boolean().optional(),
        expires: z.number().optional(),
        sameSite: z.enum(["Strict", "Lax", "None"]).optional()
      }))
    }))
    .mutation(async ({ input }) => {
      const { providerId, dashboardUrl, cookies } = input;
      const fs = await import('fs');
      const path = await import('path');
      const { prisma } = await import('../db.js');

      // Save cookies to .userData folder (using Playwright context dir structure)
      const userDataDir = path.resolve(process.cwd(), '.userData', providerId);
      if (!fs.existsSync(userDataDir)) {
        fs.mkdirSync(userDataDir, { recursive: true });
      }
      fs.writeFileSync(path.join(userDataDir, 'cookies.json'), JSON.stringify(cookies, null, 2));

      // Update provider config
      await prisma.providerConfig.update({
        where: { id: providerId },
        data: {
          billingDashboardUrl: dashboardUrl,
          sessionValid: true,
          billingRiskLevel: 'PROMO_BURN' // Upgrading risk due to authenticated session
        }
      });

      return { success: true };
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
      const syncResult = await providerService.fetchAndNormalizeModels(input.providerId);
      const provider = await providerService.getProvider(input.providerId);
      return {
        ...syncResult,
        provider
      };
    }),

  // Legacy/Debug endpoints
  getRawData: publicProcedure.query(async () => { return []; }),
  deleteRawData: publicProcedure.input(z.object({ id: z.string() })).mutation(async () => { return null; }),
  createRawData: publicProcedure.input(z.any()).mutation(async () => { return null; }),
});
