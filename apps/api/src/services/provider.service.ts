import { v4 as uuidv4 } from 'uuid';
import { db } from '../db.js';
import { providerConfigs, modelRegistry } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { encrypt, decrypt } from '../utils/encryption.js';
import { ProviderFactory } from '../utils/ProviderFactory.js';
import { ProviderManager } from './ProviderManager.js';

export class ProviderService {
  async listProviders() {
    return db.select().from(providerConfigs);
  }

  async addProvider(input: { name: string, providerType: string, baseURL: string, apiKey?: string }) {
      const encryptedApiKey = input.apiKey ? encrypt(input.apiKey) : '';

      const [newProvider] = await db.insert(providerConfigs).values({
        id: uuidv4(),
        label: input.name,
        type: input.providerType,
        baseURL: input.baseURL,
        apiKey: encryptedApiKey,
        isEnabled: true,
      }).returning();

      return newProvider;
  }

  async deleteProvider(id: string) {
    return db.delete(providerConfigs).where(eq(providerConfigs.id, id));
  }

  async listAllAvailableModels() {
    const models = await ProviderManager.getAllModels();

    const providers = await db.query.providerConfigs.findMany({
      columns: { id: true, label: true },
    });
    const providerMap = new Map(providers.map((p) => [p.id, p.label]));

    return models.map((model) => ({
      ...model,
      providerLabel: providerMap.get(model.providerId) || model.providerId,
    }));
  }

  async fetchAndNormalizeModels(providerId: string) {
      // 1. Get Provider Config
      const providerConfig = await db.query.providerConfigs.findFirst({
        where: eq(providerConfigs.id, providerId),
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

      console.log(`[ProviderService] Fetching models for ${providerConfig.label} (${providerConfig.type})...`);
      const rawModelList = await providerInstance.getModels();
      console.log(`[ProviderService] Got ${rawModelList.length} models.`);

      // 4. Batch "upsert" models into the database.
      const upsertPromises = rawModelList.map(async (model) => {
        const modelId = model.id;
        if (!modelId) return;

        const specs = {
          contextWindow: model.contextWindow,
          hasVision: model.hasVision,
          hasReasoning: model.hasReasoning || false,
          hasCoding: model.hasCoding || false,
        };

        // Consolidated upsert into modelRegistry
        await db.insert(modelRegistry)
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
  }
}
