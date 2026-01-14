import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../db.js';
import { encrypt, decrypt } from '../utils/encryption.js';
import { ProviderFactory, LLMModel } from '../utils/ProviderFactory.js';

export class ProviderService {
  async listProviders() {
    return prisma.providerConfig.findMany();
  }

  // [NEW] Manage Providers via UI
  async upsertProviderConfig(input: { id?: string, label: string, type: string, baseURL: string, apiKey?: string }) {
    const encryptedKey = input.apiKey ? encrypt(input.apiKey) : undefined;

    // Note: apiKey is removed from DB schema, but we keep the logic structure 
    // in case we restore it or for consistency with how it was called.
    // If apiKey column is gone, we cannot save it.
    // We will assume environment variables handle the key, but we still accept label/type/baseURL.

    // If 'apiKey' really is gone from ProviderConfig, we skip saving it.
    // If we want to support storing keys, we need the column back.
    // Given the migration "Move Keys to Env", we assume DB does NOT store keys.

    const data = {
      label: input.label,
      type: input.type,
      baseURL: input.baseURL,
      isEnabled: true,
      // apiKey: encryptedKey, // Omitted
    };

    if (input.id) {
      return prisma.providerConfig.update({
        where: { id: input.id },
        data: {
          ...data,
          updatedAt: new Date()
        }
      });
    } else {
      return prisma.providerConfig.create({
        data: {
          id: uuidv4(),
          ...data
        }
      });
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
    return prisma.providerConfig.delete({
      where: { id }
    });
  }

  async listAllAvailableModels() {
    const models = await prisma.model.findMany({
      where: { isActive: true },
      include: {
        provider: true,
        capabilities: true
      },
      orderBy: { lastSeenAt: 'desc' }
    });

    // Background Sync: If no models seen recently or 0 models, trigger a sync
    const lastSeen = models[0]?.lastSeenAt;
    const isStale = !lastSeen || (Date.now() - lastSeen.getTime() > 10 * 60 * 1000); // 10 mins

    if (isStale) {
      console.log("[ProviderService] 🕒 Registry is stale. Triggering background sync...");
      // We don't await this to keep the response fast
      void this.syncAll().catch(err => console.error("[ProviderService] Background sync failed:", err));
    }

    return models.map((model) => {
      const capabilities: string[] = ['chat']; // Base capability
      if (model.capabilities?.hasVision) capabilities.push('vision');
      if (model.capabilities?.hasReasoning) capabilities.push('reasoning');
      if (model.capabilities?.hasTTS) capabilities.push('tts');

      return {
        id: model.id, // CUID
        name: model.name, // Display Name
        providerId: model.providerId,
        providerLabel: model.provider.label,
        contextWindow: model.capabilities?.contextWindow || 0,
        // Frontend expects these flattened or in specs
        specs: {
          contextWindow: model.capabilities?.contextWindow || 0,
          maxOutput: model.capabilities?.maxOutput || 0,
          hasVision: !!model.capabilities?.hasVision,
          hasReasoning: !!model.capabilities?.hasReasoning,
          hasEmbedding: !!(model.capabilities as any)?.hasEmbedding || !!(model.capabilities?.specs as any)?.embedding,
          hasImageGen: !!(model.capabilities as any)?.hasImageGen,
          hasOCR: !!(model.capabilities as any)?.hasOCR,
          // @ts-ignore - Dynamic specs
          uncensored: !!model.capabilities?.specs?.uncensored,
          // @ts-ignore - Dynamic specs
          coding: !!model.capabilities?.specs?.coding
        },
        capabilities
      };
    });
  }

  // [UPDATED] Ingest Logic - "Fail-Open" & Populate Capabilities
  async fetchAndNormalizeModels(providerId: string) {
    const providerConfig = await prisma.providerConfig.findUnique({
      where: { id: providerId }
    });
    if (!providerConfig) throw new Error('Provider not found');

    // API Key Strategy:
    // 1. Check type-based env var (MISTRAL_API_KEY, GOOGLE_API_KEY, etc.)
    // 2. Check generic provider-id-based env var
    let apiKey = process.env[`${providerConfig.type.toUpperCase()}_API_KEY`] || '';
    if (!apiKey) {
      apiKey = process.env[`${providerConfig.id.toUpperCase()}_API_KEY`] || '';
    }

    // NEW: Validate API key exists for providers that require it
    const requiresApiKey = !['ollama'].includes(providerConfig.type);
    if (requiresApiKey && !apiKey) {
      console.warn(`[Ingestion] Skipping ${providerConfig.label} (${providerConfig.type}): No API key found`);
      return { count: 0, skipped: true, reason: 'Missing API key' };
    }

    const providerInstance = ProviderFactory.createProvider(providerConfig.type, {
      id: providerConfig.id,
      apiKey,
      baseURL: providerConfig.baseURL || undefined,
    });

    console.log(`[Ingestion] Fetching models for ${providerConfig.label} (${providerConfig.type})...`);
    const rawModelList = await providerInstance.getModels();
    console.log(`[Ingestion] Found ${rawModelList.length} models.`);

    const isLikelyFree = (id: string) => {
      const lower = id.toLowerCase();
      if (providerConfig.type === 'groq') return true;
      if (lower.includes('free') || lower.includes('beta')) return true;
      return false;
    };

    const upsertPromises = rawModelList.map(async (model: LLMModel) => {
      const modelSlug = model.id; // slug from provider
      if (!modelSlug) return;

      // [USER-REQ] OpenRouter: Only ingest FREE models to reduce noise (user reports 513 -> 163 models)
      if (providerConfig.type === 'openrouter') {
        // 'isFree' populated by OpenAIProvider (patched) or isLikelyFree
        if (!model.isFree) return;
      }

      // 1. Create/Update the Core Identity
      // We calculate display name
      const displayName = (model.name as string) || modelSlug;

      // Upsert by [providerId, name] unique constraint
      // Note: Prisma 5.x upsert requires simple unique input. 
      // If providerId_name is not generated in types yet, we might have issues.
      // We will try standard access.

      // Manual upsert because providerId_name constraint might not be recognized by client types yet
      const existingModel = await prisma.model.findFirst({
        where: {
          providerId: providerConfig.id,
          name: displayName
        }
      });

      let dbModel;
      if (existingModel) {
        dbModel = await prisma.model.update({
          where: { id: existingModel.id },
          data: {
            isActive: true,
            lastSeenAt: new Date(),
            providerData: model as any,
            updatedAt: new Date(),
          }
        });
      } else {
        dbModel = await prisma.model.create({
          data: {
            providerId: providerConfig.id,
            name: displayName,
            providerData: model as any,
            isActive: true,
            aiData: {},
          }
        });
      }

      // 2. Populate/Update the Related Capabilities Table
      const contextWindow = (model.specs?.contextWindow as number) || (model.context_window as number) || 4096;
      const maxOutput = (model.specs?.maxOutput as number) || (model.max_tokens as number) || 2048;

      const hasVision = modelSlug.toLowerCase().includes('vision') ||
        modelSlug.toLowerCase().includes('vl') ||
        !!model.specs?.hasVision;

      const hasReasoning = modelSlug.toLowerCase().includes('reasoning') ||
        modelSlug.toLowerCase().includes('o1') || modelSlug.toLowerCase().includes('o3');

      const hasEmbedding = modelSlug.toLowerCase().includes('embedding') || modelSlug.toLowerCase().includes('embed');
      const hasImageGen = modelSlug.toLowerCase().includes('dall-e') || modelSlug.toLowerCase().includes('stable-diffusion');
      const hasModeration = modelSlug.toLowerCase().includes('moderation');
      const hasOCR = modelSlug.toLowerCase().includes('ocr') || (hasVision && !!model.specs?.hasOCR);
      const hasTTS = modelSlug.toLowerCase().includes('tts') || modelSlug.toLowerCase().includes('whisper');

      await (prisma.modelCapabilities as any).upsert({
        where: { modelId: dbModel.id },
        update: {
          modelName: displayName,
          contextWindow,
          maxOutput,
          hasVision,
          hasReasoning,
          hasTTS,
          hasImageGen,
          hasEmbedding,
          hasOCR,
          hasModeration,
          hasReward: false,
          supportsFunctionCalling: !!model.specs?.supportsFunctionCalling,
          supportsJsonMode: !!model.specs?.supportsJsonMode,
          isMultimodal: hasVision || !!model.specs?.hasAudioInput,
          updatedAt: new Date(),
        },
        create: {
          modelId: dbModel.id,
          modelName: displayName,
          contextWindow,
          maxOutput,
          hasVision,
          hasReasoning,
          hasTTS,
          hasImageGen,
          hasEmbedding,
          hasOCR,
          hasModeration,
          hasReward: false,
          supportsFunctionCalling: !!model.specs?.supportsFunctionCalling,
          supportsJsonMode: !!model.specs?.supportsJsonMode,
          isMultimodal: hasVision || !!model.specs?.hasAudioInput,
        }
      });
    });

    await Promise.all(upsertPromises);
    return { count: rawModelList.length };
  }

  async syncAll() {
    const providers = await this.listProviders();
    const results = [];
    for (const p of providers) {
      if (!p.isEnabled) continue;
      try {
        const res = await this.fetchAndNormalizeModels(p.id);
        results.push({ id: p.id, ...res });
      } catch (e) {
        console.error(`[ProviderService] Individual sync failed for ${p.label}:`, e);
      }
    }

    // Also trigger Surveyor to identify capabilities
    try {
      const { Surveyor } = await import('./Surveyor.js');
      await Surveyor.surveyAll();
    } catch (e) {
      console.error("[ProviderService] Surveyor failed after sync:", e);
    }

    return results;
  }
}
