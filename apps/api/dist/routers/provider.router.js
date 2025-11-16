import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc.js';
// !!! TODO: Import your Volcano SDK / Lootbox wrappers here
// import { llmOpenAI, llmLlama, ... } from ' @domoreai/lootbox';
export const providerRouter = createTRPCRouter({
    /**
     * Get all configured providers (except their API keys)
     */
    list: publicProcedure.query(async ({ ctx }) => {
        return ctx.db.provider.findMany({
            select: {
                id: true,
                name: true,
                providerType: true,
                baseURL: true,
            },
        });
    }),
    /**
     * Add a new provider configuration
     */
    add: publicProcedure
        .input(z.object({
        name: z.string().min(1),
        providerType: z.string(),
        baseURL: z.string().url("Must be a valid URL (e.g., http://localhost:11434)"),
        apiKey: z.string().optional(),
    }))
        .mutation(async ({ ctx, input }) => {
        // !!! TODO: API key MUST be encrypted before saving
        const encryptedApiKey = encrypt(input.apiKey); // Implement real encryption!
        const provider = await ctx.db.provider.create({
            data: {
                name: input.name,
                providerType: input.providerType,
                baseURL: input.baseURL,
                encryptedApiKey: encryptedApiKey,
            },
        });
        return provider;
    }),
    /**
     * Step 1: Fetch and Normalize Models (The "Dumb Scrape")
     * Fetches models from the provider's API and upserts them into our DB.
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
        // !!! TODO: Decrypt API key before use
        const apiKey = decrypt(provider.encryptedApiKey); // Implement real decryption!
        // --- This is where Jules's logic goes ---
        // 1. Instantiate the correct Volcano/Lootbox client
        // 2. Call the client's `listModels()` method
        const rawModelList = await getModelsFromProvider(provider.providerType, provider.baseURL, apiKey);
        // --- End of Jules's logic ---
        // Batch "upsert" models into the database
        const upsertPromises = rawModelList.map(model => {
            // Handle different API formats (e.g., model.id vs model.name)
            const modelId = model.id || model.name;
            const modelName = model.name || model.id;
            return ctx.db.model.upsert({
                where: { providerId_modelId: { providerId: provider.id, modelId: modelId } },
                create: {
                    providerId: provider.id,
                    modelId: modelId,
                    name: modelName,
                    // --- This is the key ---
                    providerData: model, // Store the *entire* raw object
                    isFree: model.pricing?.prompt === 0 || false, // Example normalization
                },
                update: {
                    // Just update the raw data and name on subsequent fetches
                    name: modelName,
                    providerData: model,
                    isFree: model.pricing?.prompt === 0 || false,
                }
            });
        });
        await Promise.all(upsertPromises);
        return { count: rawModelList.length };
    }),
});
// --- Helper Functions (Implement these) ---
/**
 * !!! TODO: Implement real encryption/decryption !!!
 * Use the 'crypto' module in Node.js
 */
const encrypt = (text) => `ENCRYPTED:${text || ''}`;
const decrypt = (text) => text?.replace('ENCRYPTED:', '') || '';
/**
 * !!! TODO: Build out this function !!!
 * This function needs to call the *actual* provider APIs.
 * Your Volcano SDK wrappers (`llmOpenAI` etc.) must expose a
 * `listModels()` method that returns the raw JSON array.
 */
async function getModelsFromProvider(type, baseURL, _apiKey) {
    console.log(`Fetching models for type: ${type} at ${baseURL}`);
    // Example:
    // if (type === 'openai' || type === 'llama') {
    //   const client = llmOpenAI({ baseURL, apiKey, model: 'temp-model-name' });
    //   return client.listModels(); // You need to implement listModels()
    // }
    // --- Mock Data Placeholder ---
    // Replace this with your real API calls.
    // This mocks an OpenRouter-style response.
    if (type === 'openai') {
        return [
            { id: 'gpt-4o-mini', name: 'GPT-4o Mini', pricing: { 'prompt': 0.00015 }, 'context_length': 128000 },
            { id: 'openai/gpt-4o', name: 'OpenAI: GPT-4o', pricing: { 'prompt': 0.005 }, 'context_length': 128000 }
        ];
    }
    else if (type === 'llama') {
        return [
            { id: 'llama3:8b', name: 'Llama 3 8B (Ollama)', pricing: { 'prompt': 0 }, 'context_length': 8192 },
        ];
    }
    return [];
}
