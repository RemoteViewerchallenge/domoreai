// --- providers.router.ts ---
import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc.js';
import { encrypt, decrypt } from '../utils/encryption.js';
import { ProviderFactory } from '../utils/ProviderFactory.js';


export const providerRouter = createTRPCRouter({
  list: publicProcedure.query(async ({ ctx }) => {
    return ctx.prisma.providerConfig.findMany();
  }),
  add: publicProcedure
    .input(z.object({
      name: z.string(),
      providerType: z.string(),
      baseURL: z.string(),
      apiKey: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const encryptedApiKey = input.apiKey ? encrypt(input.apiKey) : ''; // Enforce string
      return ctx.prisma.providerConfig.create({
        data: {
          label: input.name,
          type: input.providerType,
          baseURL: input.baseURL,
          apiKey: encryptedApiKey,
          isEnabled: true,
        },
      });
    }),
  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.providerConfig.delete({
        where: { id: input.id },
      });
    }),

  /**
   * Step 1: Fetch and Normalize Models (The "Dumb Scrape")
   * Fetches models from the provider's API and upserts them into the database.
   */
  fetchAndNormalizeModels: publicProcedure
    .input(z.object({ providerId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const providerConfig = await ctx.prisma.providerConfig.findUnique({
        where: { id: input.providerId },
      });
      if (!providerConfig) {
        throw new Error('Provider not found');
      }

      // 3. Decrypt the API key
      let apiKey: string;
      try {
        apiKey = decrypt(providerConfig.apiKey);
      } catch (error) {
        console.warn(`Failed to decrypt API key for provider ${providerConfig.id}.`, error);
        throw new Error('Invalid API key configuration');
      }

      // 4. Get the models using Volcano SDK
      const providerInstance = ProviderFactory.createProvider(providerConfig.type, {
        id: providerConfig.id,
        apiKey,
        baseURL: providerConfig.baseURL || undefined,
      });

      const rawModelList = await providerInstance.getModels();

      // Batch "upsert" models into the database.
      const upsertPromises = rawModelList.map((model) => {
        const modelId = model.id;
        if (!modelId) {
            return null;
        }
        // Use model.id as name if name is missing (SDK models usually have id)
        const modelName = model.id; 
        
        // We need to cast model to any to access potential extra props if needed, 
        // but SDK returns LLMModel which is strict. 
        // For now, we store the whole model object as providerData.
        return ctx.prisma.model.upsert({
          where: {
            providerId_modelId: { providerId: providerConfig.id, modelId: modelId },
          },
          create: {
            providerId: providerConfig.id,
            modelId: modelId,
            name: modelName,
            providerData: model as any, 
            isFree: false, // Default, logic can be improved
          },
          update: {
            name: modelName,
            providerData: model as any,
          },
        });
      }).filter(p => p !== null);

      await Promise.all(upsertPromises);
      return { count: rawModelList.length };
    }),

  /**
   * Step 2: Raw Data Lake Ingestion (The "Smart Scrape")
   */
  debugFetch: publicProcedure
    .input(z.object({ providerId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const providerConfig = await ctx.prisma.providerConfig.findUnique({
        where: { id: input.providerId },
      });
      if (!providerConfig) {
        throw new Error('Provider not found');
      }

      const apiKey = decrypt(providerConfig.apiKey);

      // Use SDK provider as the "adapter"
      // Note: IngestionService might expect the old LLMAdapter interface.
      // If so, we might need to adapt or update IngestionService.
      // For now, let's assume we can just use the SDK provider's getModels/getRawModels if available.
      // But SDK doesn't have getRawModels. 
      // We'll skip IngestionService for now and just do a direct fetch using the SDK if possible,
      // or throw not implemented if IngestionService is strictly typed to old adapters.
      
      // Let's try to use the SDK provider.
      const providerInstance = ProviderFactory.createProvider(providerConfig.type, {
        id: providerConfig.id,
        apiKey,
        baseURL: providerConfig.baseURL || undefined,
      });

      // If IngestionService expects the old adapter, this will fail.
      // Given the refactor, we should probably update IngestionService too, 
      // but for this file, let's just use the SDK to get data and save to RawDataLake directly.
      
      const models = await providerInstance.getModels();
      
      return ctx.prisma.rawDataLake.create({
        data: {
          provider: providerConfig.type,
          rawData: models as any,
          ingestedAt: new Date(),
        },
      });
    }),

  getRawData: publicProcedure
    .query(async ({ ctx }) => {
      return ctx.prisma.rawDataLake.findMany({
        orderBy: { ingestedAt: 'desc' },
      });
    }),

  deleteRawData: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.rawDataLake.delete({
        where: { id: input.id },
      });
    }),

  createRawData: publicProcedure
    .input(z.object({
      provider: z.string(),
      rawData: z.any(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.rawDataLake.create({
        data: {
          provider: input.provider,
          rawData: input.rawData,
          ingestedAt: new Date(),
        },
      });
    }),
});

