// --- providers.router.ts ---
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { createTRPCRouter, publicProcedure } from '../trpc.js';
import { encrypt, decrypt } from '../utils/encryption.js';
import { ProviderFactory } from '../utils/ProviderFactory.js';
import { providerConfigs, modelRegistry } from '../db/schema.js';
import { eq } from 'drizzle-orm';

export const providerRouter = createTRPCRouter({
  list: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.select().from(providerConfigs);
  }),

  add: publicProcedure
    .input(z.object({
      name: z.string(),
      providerType: z.string(),
      baseURL: z.string(),
      apiKey: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const encryptedApiKey = input.apiKey ? encrypt(input.apiKey) : '';
      
      // Insert into Drizzle table
      const [newProvider] = await ctx.db.insert(providerConfigs).values({
        id: uuidv4(),
        label: input.name,
        type: input.providerType,
        baseURL: input.baseURL,
        apiKey: encryptedApiKey,
        isEnabled: true,
      }).returning();

      return newProvider;
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.delete(providerConfigs).where(eq(providerConfigs.id, input.id));
    }),

  /**
   * Step 1: Fetch and Normalize Models (The "Smart Scrape")
   * Fetches models from the provider's API and upserts them into the database.
   * STORES RAW DATA to avoid "wiping" or "misaligning" data.
   */
  fetchAndNormalizeModels: publicProcedure
    .input(z.object({ providerId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // 1. Get Provider Config
      const providerConfig = await ctx.db.query.providerConfigs.findFirst({
        where: eq(providerConfigs.id, input.providerId),
      });

      if (!providerConfig) {
        throw new Error('Provider not found');
      }

      // 2. Decrypt the API key
      let apiKey: string;
      try {
        apiKey = decrypt(providerConfig.apiKey);
      } catch (error) {
        console.warn(`Failed to decrypt API key for provider ${providerConfig.id}.`, error);
        throw new Error('Invalid API key configuration');
      }

      // 3. Get the models using Volcano SDK
      const providerInstance = ProviderFactory.createProvider(providerConfig.type, {
        id: providerConfig.id,
        apiKey,
        baseURL: providerConfig.baseURL || undefined,
      });

      console.log(`[ProviderRouter] Fetching models for ${providerConfig.label} (${providerConfig.type})...`);
      const rawModelList = await providerInstance.getModels();
      console.log(`[ProviderRouter] Got ${rawModelList.length} models.`);

      // 4. Batch "upsert" models into the database.
      // We store TWO things:
      // A. The RAW DATA (for flexibility)
      // B. The REGISTRY ENTRY (for routing)

      const upsertPromises = rawModelList.map(async (model) => {
        const modelId = model.id;
        if (!modelId) return;

        const specs = {
          contextWindow: model.contextWindow,
          hasVision: model.hasVision,
          hasReasoning: model.hasReasoning || false,
          hasCoding: model.hasCoding || false,
        };

        // Consolidated upsert into modelRegistry including providerData/specs
        await ctx.db.insert(modelRegistry)
          .values({
            id: uuidv4(),
            modelId: modelId,
            providerId: providerConfig.id,
            modelName: (model.name as string) || modelId,
            isFree: model.isFree || false,
            costPer1k: model.costPer1k || 0,
            providerData: model as any,
            specs: specs as any,
            aiData: {},
          })
          .onConflictDoUpdate({
            target: [modelRegistry.modelId, modelRegistry.providerId],
            set: {
              modelName: (model.name as string) || modelId,
              isFree: model.isFree || false,
              costPer1k: model.costPer1k || 0,
              providerData: model as any,
              specs: specs as any,
            },
          });
      });

      await Promise.all(upsertPromises);
      return { count: rawModelList.length };
    }),

  // Legacy/Debug endpoints (kept for compatibility or removed if unused)
  getRawData: publicProcedure.query(async () => { return []; }),
  deleteRawData: publicProcedure.input(z.object({ id: z.string() })).mutation(async () => { return null; }),
  createRawData: publicProcedure.input(z.any()).mutation(async () => { return null; }),
});


