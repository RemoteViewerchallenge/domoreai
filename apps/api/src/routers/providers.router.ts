// --- providers.router.ts ---
import { z } from 'zod'; // Import Zod directly
import { createTRPCRouter, publicProcedure } from '../trpc.js';

// 1. Import your adapters and the base interface
import {
  OpenAIAdapter,
  MistralAdapter,
  LlamaAdapter,
  VertexStudioAdapter,
  type LLMAdapter,
} from '../llm-adapters.js';

// 2. Create a map to instantiate the correct adapter
const adapterMap: Record<string, new () => LLMAdapter> = {
  'openai': OpenAIAdapter,
  'mistral': MistralAdapter,
  'llama': LlamaAdapter,
  'vertex-studio': VertexStudioAdapter, // Make sure your types match
  // 'anthropic': AnthropicAdapter, // Add these as you build them
  // 'bedrock': BedrockAdapter,
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
      const apiKey = provider.encryptedApiKey
        ? decrypt(provider.encryptedApiKey)
        : undefined; // Implement real decryption!

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
      return { count: rawModelList.length };
    }),
});

// --- Helper Functions (Implement these) ---
/**
 * !!! SECURITY WARNING: Implement real encryption/decryption. !!!
 * This placeholder is NOT secure. Use Node.js 'crypto' module with a secret key.
 */
const encrypt = (text?: string) => `ENCRYPTED:${text || ''}`;
const decrypt = (text?: string) => text?.replace('ENCRYPTED:', '') || '';

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
