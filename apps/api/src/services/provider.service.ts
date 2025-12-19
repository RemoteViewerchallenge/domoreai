import { v4 as uuidv4 } from 'uuid';
import { db } from '../db.js';
import { providerConfigs, modelRegistry, modelCapabilities } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { encrypt, decrypt } from '../utils/encryption.js';
import { ProviderFactory, LLMModel } from '../utils/ProviderFactory.js';
import { ProviderManager } from './ProviderManager.js';

export class ProviderService {
  async listProviders() {
    return db.select().from(providerConfigs);
  }

  // [NEW] Manage Providers via UI
  async upsertProviderConfig(input: { id?: string, label: string, type: string, baseURL: string, apiKey?: string }) {
    const encryptedKey = input.apiKey ? encrypt(input.apiKey) : undefined;
    
    if (input.id) {
       return db.update(providerConfigs)
         .set({
           label: input.label,
           type: input.type,
           baseURL: input.baseURL,
           ...(encryptedKey ? { apiKey: encryptedKey } : {}),
           updatedAt: new Date()
         })
         .where(eq(providerConfigs.id, input.id))
         .returning();
    } else {
       return db.insert(providerConfigs).values({
         id: uuidv4(),
         label: input.label,
         type: input.type,
         baseURL: input.baseURL,
         apiKey: encryptedKey || '',
         isEnabled: true,
         updatedAt: new Date()
       }).returning();
    }
  }

  async addProvider(input: { name: string, providerType: string, baseURL: string, apiKey?: string }) {
      return this.upsertProviderConfig({
        label: input.name,
        type: input.providerType,
        baseURL: input.baseURL,
        apiKey: input.apiKey,
      });
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
      providerLabel: providerMap.get(model.providerId || '') || model.providerId || 'unknown',
    }));
  }

  // [UPDATED] Ingest Logic - "Fail-Open" & Populate Capabilities
  async fetchAndNormalizeModels(providerId: string) {
      const providerConfig = await db.query.providerConfigs.findFirst({
        where: eq(providerConfigs.id, providerId),
      });
      if (!providerConfig) throw new Error('Provider not found');

      let apiKey: string;
      try {
        apiKey = decrypt(providerConfig.apiKey);
      } catch (error) {
        console.warn(`Failed to decrypt API key for provider ${providerConfig.id}.`, error);
        throw new Error('Invalid API key configuration');
      }

      const providerInstance = ProviderFactory.createProvider(providerConfig.type, {
        id: providerConfig.id,
        apiKey,
        baseURL: providerConfig.baseURL || undefined,
      });

      console.log(`[Ingestion] Fetching models for ${providerConfig.label} (${providerConfig.type})...`);
      const rawModelList = await providerInstance.getModels();
      console.log(`[Ingestion] Found ${rawModelList.length} models.`);

      // HEURISTIC: Quick detection for Groq/Free models based on ID
      const isLikelyFree = (id: string) => {
         const lower = id.toLowerCase();
         if (providerConfig.type === 'groq') return true; 
         if (lower.includes('free') || lower.includes('beta')) return true;
         return false;
      };

      const upsertPromises = rawModelList.map(async (model: LLMModel) => {
        const modelId = model.id;
        if (!modelId) return;

        // 1. Create/Update the Core Identity
        const results = await db.insert(modelRegistry)
          .values({
            id: uuidv4(),
            modelId: modelId,
            providerId: providerConfig.id,
            modelName: (model.name as string) || modelId,
            isFree: isLikelyFree(modelId),
            providerData: model as any,
            isActive: true,
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: [modelRegistry.modelId, modelRegistry.providerId],
            set: {
              isActive: true,
              lastSeenAt: new Date(),
              providerData: model as any,
              updatedAt: new Date(),
            }
          })
          .returning({ id: modelRegistry.id });

        const dbModel = results[0];
        if (!dbModel) return;

        // 2. Populate/Update the Related Capabilities Table
        // Use safe defaults (4096)
        const contextWindow = (model.specs?.contextWindow as number) || (model.context_window as number) || 4096;
        const maxOutput = (model.specs?.maxOutput as number) || (model.max_tokens as number) || 4096;
        
        const hasVision = modelId.toLowerCase().includes('vision') || 
                         modelId.toLowerCase().includes('vl') || 
                         !!model.specs?.hasVision;
        
        await db.insert(modelCapabilities)
          .values({
            id: uuidv4(),
            modelId: dbModel.id,
            contextWindow,
            maxOutput,
            hasVision,
            hasAudioInput: modelId.toLowerCase().includes('whisper') || modelId.toLowerCase().includes('audio'),
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: [modelCapabilities.modelId],
            set: {
              contextWindow: contextWindow,
              maxOutput: maxOutput,
              hasVision: hasVision,
              updatedAt: new Date(),
            }
          });
      });

      await Promise.all(upsertPromises);
      return { count: rawModelList.length };
  }
}
