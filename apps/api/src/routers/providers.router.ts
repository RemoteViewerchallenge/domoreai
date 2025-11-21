// --- providers.router.ts ---
import { z } from 'zod'; // Import Zod directly
import { createTRPCRouter, publicProcedure } from '../trpc.js';
import { encrypt, decrypt } from '../utils/encryption.js';
import { IngestionService } from '../services/ingestion.service.js';

// 1. Import your adapters and the base interface
import {
  OpenAIAdapter,
  MistralAdapter,
  LlamaAdapter,
  OllamaAdapter,
  VertexStudioAdapter,
  AnthropicAdapter,
  AzureAIAdapter,
  BedrockAdapter,
  type LLMAdapter,
} from '../llm-adapters.js';

// 2. Create a map to instantiate the correct adapter
const adapterMap: Record<string, new () => LLMAdapter> = {
  'openai': OpenAIAdapter,
  'openrouter': OpenAIAdapter, // OpenRouter uses the same API shape as OpenAI
  'mistral': MistralAdapter,
  'llama': LlamaAdapter,
  'ollama': OllamaAdapter,
  'vertex-studio': VertexStudioAdapter,
  'anthropic': AnthropicAdapter,
  'azure': AzureAIAdapter,
  'bedrock': BedrockAdapter,
};

// Your existing VOLCANO_PROVIDER_TYPES array
// const VOLCANO_PROVIDER_TYPES = [
//   'openai',
//   'anthropic',
//   'vertex-studio', // <-- This is in your adapter. Make them match!
//   'mistral',
//   'llama',
//   'bedrock',
// ] as const;


export const providerRouter = createTRPCRouter({
  list: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.provider.findMany();
  }),
  add: publicProcedure
    .input(z.object({
      name: z.string(),
      providerType: z.string(),
      baseURL: z.string(),
      apiKey: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const encryptedApiKey = input.apiKey ? encrypt(input.apiKey) : null;
      return ctx.db.provider.create({
        data: {
          name: input.name,
          providerType: input.providerType,
          baseURL: input.baseURL,
          encryptedApiKey,
        },
      });
    }),
  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.provider.delete({
        where: { id: input.id },
      });
    }),
  // ... your list and add procedures ...

  /**
   * Step 1: Fetch and Normalize Models (The "Dumb Scrape")
   * Fetches models from the provider's API and upserts them into the database.
   */
  fetchAndNormalizeModels: publicProcedure
    .input(z.object({ providerId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const provider = await ctx.db.provider.findUnique({
        where: { id: input.providerId },
      });
      if (!provider) {
        throw new Error('Provider not found');
      }

      // 3. Decrypt the API key
      let apiKey: string | undefined;
      try {
        apiKey = provider.encryptedApiKey
          ? decrypt(provider.encryptedApiKey)
          : undefined;
      } catch (error) {
        console.warn(`Failed to decrypt API key for provider ${provider.id}. It may be using an old key.`, error);
        // Proceed without API key (or maybe we should fail? But user wants to delete/debug)
        apiKey = undefined; 
      }

      // --- This is where Jules's logic goes ---
      // 4. Get the models using your new helper function
      const rawModelList = await getModelsFromProvider(
        provider.providerType,
        provider.baseURL,
        apiKey,
      );
      // --- End of Jules's logic ---

      // Batch "upsert" models into the database.
      const upsertPromises = rawModelList.map((model) => {
        // Handle different API formats (e.g., model.id vs model.name)
        const modelId = model.id || model.name;
        if (!modelId) {
            console.warn('Skipping model without id or name:', model);
            return null;
        }
        const modelName = model.name || modelId;
        return ctx.db.model.upsert({
          where: {
            providerId_modelId: { providerId: provider.id, modelId: modelId },
          },
          create: {
            providerId: provider.id,
            modelId: modelId,
            name: modelName,
            // --- This is the key ---
            providerData: model, // Store the *entire* raw object
            isFree: model.pricing?.prompt === 0 || false, // Example normalization
          },
          update: {
            // Just update the raw data and name on subsequent fetches.
            name: modelName,
            providerData: model,
            isFree: model.pricing?.prompt === 0 || false,
          },
        });
      }).filter(p => p !== null);
      await Promise.all(upsertPromises);
      await Promise.all(upsertPromises);
      return { count: rawModelList.length };
    }),

  /**
   * Step 2: Raw Data Lake Ingestion (The "Smart Scrape")
   * Fetches raw JSON from the provider and saves it to the RawDataLake table.
   * This is the first step of the new pipeline.
   */
  debugFetch: publicProcedure
    .input(z.object({ providerId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const provider = await ctx.db.provider.findUnique({
        where: { id: input.providerId },
      });
      if (!provider) {
        throw new Error('Provider not found');
      }

      const apiKey = provider.encryptedApiKey
        ? decrypt(provider.encryptedApiKey)
        : undefined;

      const AdapterClass = adapterMap[provider.providerType];
      if (!AdapterClass) {
        throw new Error(`No adapter found for provider type: ${provider.providerType}`);
      }

      const adapter = new AdapterClass();
      const ingestionService = new IngestionService();

      const record = await ingestionService.ingestProviderData(
        provider.providerType,
        adapter,
        { apiKey, baseURL: provider.baseURL }
      );

      return { success: true, recordId: record.id };
    }),

  getRawData: publicProcedure
    .query(async ({ ctx }) => {
      return ctx.db.rawDataLake.findMany({
        orderBy: { ingestedAt: 'desc' },
      });
    }),

  deleteRawData: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.rawDataLake.delete({
        where: { id: input.id },
      });
    }),
});

// --- Helper Functions (Implement these) ---

/**
 * !!! TODO: Build out this function with real API calls. !!!
 * This function needs to call the *actual* provider APIs.
 * Your Volcano SDK wrappers (`llmOpenAI` etc.) must expose a
 * `listModels()` method that returns the raw JSON array.
 */
// 5. This is your fully implemented helper function
async function getModelsFromProvider(
  type: string,
  baseURL: string,
  apiKey?: string,
): Promise<
  Array<{
    id?: string;
    name?: string;
    pricing?: { prompt?: number };
    context_length?: number;
  }>
> {
  console.log(`Fetching models for type: ${type} at ${baseURL}`);

  // Find the adapter class from the map
  const AdapterClass = adapterMap[type];
  if (!AdapterClass) {
    console.error(`No adapter found for provider type: ${type}`);
    return []; // No adapter implementation yet
  }

  try {
    // Instantiate the adapter
    const adapter = new AdapterClass();
    
    // Call its getModels method with the correct config
    // Your adapters expect a config object with apiKey and baseURL
    const models = await adapter.getModels({
      apiKey: apiKey,
      baseURL: baseURL,
      // Note: Some adapters (like Vertex) might need more config,
      // but your current implementation only passes apiKey/baseURL.
    });

    return models;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error(`Failed to fetch models for ${type}:`, message);
    throw new Error(`Failed to fetch models for ${type}: ${message}`);
  }
}
