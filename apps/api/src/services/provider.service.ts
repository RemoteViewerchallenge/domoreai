import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../db.js';
// import { encrypt, decrypt } from '../utils/encryption.js'; // REMOVED
import { ProviderFactory, LLMModel } from '../utils/ProviderFactory.js';

export class ProviderService {
  async listProviders() {
    return prisma.providerConfig.findMany();
  }

  async getProvider(id: string) {
    return prisma.providerConfig.findUnique({
      where: { id }
    });
  }

  // [NEW] Manage Providers via UI
  async upsertProviderConfig(input: { 
    id?: string, 
    name?: string, 
    type?: string, 
    baseUrl?: string, 
    apiKey?: string,
    apiKeyEnvVar?: string,
    pricingUrl?: string,
    isCreditCardLinked?: boolean,
    enforceFreeOnly?: boolean,
    monthlyBudget?: number,
    serviceCategories?: string[],
    billingRiskLevel?: any,
    promoMonthlyLimit?: number,
    currentScrapedSpend?: number,
    billingDashboardUrl?: string,
    lastScrapeTime?: Date,
    providerClass?: 'FOUNDATIONAL' | 'AGGREGATOR' | 'INFERENCE_ENGINE' | 'LOCAL'
  }) {
    if (input.id) {
      // PARTIAL UPDATE
      const existing = await prisma.providerConfig.findUnique({ where: { id: input.id } });
      if (!existing) throw new Error('Provider not found');

      const data: any = {
        updatedAt: new Date()
      };

      if (input.name !== undefined) data.name = input.name;
      if (input.type !== undefined) data.type = input.type;
      if (input.baseUrl !== undefined) data.baseUrl = input.baseUrl;
      if (input.apiKey !== undefined) data.apiKey = input.apiKey;
      if (input.apiKeyEnvVar !== undefined) data.apiKeyEnvVar = input.apiKeyEnvVar;
      if (input.pricingUrl !== undefined) data.pricingUrl = input.pricingUrl;
      if (input.isCreditCardLinked !== undefined) data.isCreditCardLinked = input.isCreditCardLinked;
      if (input.enforceFreeOnly !== undefined) data.enforceFreeOnly = input.enforceFreeOnly;
      if (input.monthlyBudget !== undefined) data.monthlyBudget = input.monthlyBudget;
      if (input.serviceCategories !== undefined) data.serviceCategories = input.serviceCategories;
      if (input.billingRiskLevel !== undefined) data.billingRiskLevel = input.billingRiskLevel;
      if (input.promoMonthlyLimit !== undefined) data.promoMonthlyLimit = input.promoMonthlyLimit;
      if (input.currentScrapedSpend !== undefined) data.currentScrapedSpend = input.currentScrapedSpend;
      if (input.billingDashboardUrl !== undefined) data.billingDashboardUrl = input.billingDashboardUrl;
      if (input.lastScrapeTime !== undefined) data.lastScrapeTime = input.lastScrapeTime;
      if (input.providerClass !== undefined) data.providerClass = input.providerClass;

      return prisma.providerConfig.update({
        where: { id: input.id },
        data
      });
    } else {
      // CREATE
      if (!input.name || !input.type || !input.baseUrl) {
        throw new Error('Name, type, and baseUrl are required for new providers');
      }

      return prisma.providerConfig.create({
        data: {
          id: uuidv4(),
          name: input.name,
          type: input.type,
          baseUrl: input.baseUrl,
          apiKey: input.apiKey,
          apiKeyEnvVar: input.apiKeyEnvVar,
          pricingUrl: input.pricingUrl,
          isCreditCardLinked: input.isCreditCardLinked ?? false,
          enforceFreeOnly: input.enforceFreeOnly ?? true,
          monthlyBudget: input.monthlyBudget,
          serviceCategories: input.serviceCategories ?? [],
          billingRiskLevel: input.billingRiskLevel ?? 'ZERO_RISK',
          promoMonthlyLimit: input.promoMonthlyLimit,
          currentScrapedSpend: input.currentScrapedSpend,
          billingDashboardUrl: input.billingDashboardUrl,
          lastScrapeTime: input.lastScrapeTime,
          providerClass: input.providerClass || 'FOUNDATIONAL',
          isEnabled: true,
        } as any
      });
    }
  }

  async addProvider(input: { name: string, providerType: string, baseUrl: string, apiKey?: string }) {
    return this.upsertProviderConfig({
      name: input.name,
      type: input.providerType,
      baseUrl: input.baseUrl,
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

    // Background Sync: Controlled by index.ts now to prevent duplication
    /*
    const lastSeen = models[0]?.lastSeenAt;
    const isStale = !lastSeen || (Date.now() - lastSeen.getTime() > 10 * 60 * 1000); // 10 mins

    if (isStale) {
      console.log("[ProviderService] 🕒 Registry is stale. Triggering background sync...");
      // We don't await this to keep the response fast
      void this.syncAll().catch(err => console.error("[ProviderService] Background sync failed:", err));
    }
    */

    return models.map((model) => {
      const capabilities: string[] = ['chat']; // Base capability
      if (model.capabilities?.hasVision) capabilities.push('vision');
      if (model.capabilities?.hasReasoning) capabilities.push('reasoning');
      if (model.capabilities?.hasTTS) capabilities.push('tts');

      return {
        id: model.id, // CUID
        name: model.name, // Display Name
        providerId: model.providerId,
        providerLabel: model.provider.name,
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
        primaryTask: (model.capabilities as any)?.primaryTask || 'chat',
        isMultimodal: !!model.capabilities?.isMultimodal,
        capabilities
      };
    });
  }

  // [UPDATED] Ingest Logic - "Fail-Open" & Populate Capabilities
  async fetchAndNormalizeModels(providerId: string) {
    const { Surveyor } = await import('./Surveyor.js');
    const providerConfig = await prisma.providerConfig.findUnique({
      where: { id: providerId }
    });
    if (!providerConfig) throw new Error('Provider not found');

    // API Key Strategy:
    // 1. Check DB-stored key (highest priority)
    // 2. Check type-based env var (MISTRAL_API_KEY, GOOGLE_API_KEY, etc.)
    // 3. Check generic provider-id-based env var
    let apiKey = (providerConfig as any).apiKey || '';
    if (!apiKey) {
      apiKey = process.env[`${providerConfig.type.toUpperCase()}_API_KEY`] || '';
    }
    if (!apiKey) {
      apiKey = process.env[`${providerConfig.id.toUpperCase()}_API_KEY`] || '';
    }

    // NEW: Validate API key exists for providers that require it
    const requiresApiKey = !['ollama'].includes(providerConfig.type);
    if (requiresApiKey && !apiKey) {
      const errorMsg = 'Missing API key. Please check your environment variables.';
      console.warn(`[Ingestion] Skipping ${providerConfig.name} (${providerConfig.type}): ${errorMsg}`);
      await Surveyor.updateProviderStatus(providerId, 'ERROR', `[Config] ${errorMsg}`);
      return { count: 0, skipped: true, reason: errorMsg };
    }

    const providerInstance = ProviderFactory.createProvider(providerConfig.type, {
      id: providerConfig.id,
      apiKey,
      baseURL: providerConfig.baseUrl || undefined,
    });

    console.log(`[Ingestion] Fetching models for ${providerConfig.name} (${providerConfig.type})...`);
    let rawModelList: any[] = [];
    
    try {
      rawModelList = await providerInstance.getModels();
      console.log(`[Ingestion] Found ${rawModelList.length} models.`);
      
      // [NEW] Clear error state on success
      await Surveyor.updateProviderStatus(providerId, 'ACTIVE', null);
    } catch (error) {
      const errorMsg = Surveyor.formatError(error);
      console.error(`[Ingestion] Failed to fetch models for ${providerConfig.name}: ${errorMsg}`);
      
      // [NEW] Set error state in DB
      await Surveyor.updateProviderStatus(providerId, 'ERROR', errorMsg);
      
      return { count: 0, skipped: true, reason: errorMsg };
    }

    // [NEW] Sanitize the list to remove deprecated/utility junk
    rawModelList = Surveyor.sanitizeModelList(rawModelList);
    console.log(`[Ingestion] After sanitization: ${rawModelList.length} models.`);

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

      const stableId = `${providerConfig.id}:${displayName}`;
      let dbModel;
      if (existingModel) {
        dbModel = await prisma.model.update({
          where: { id: existingModel.id },
          data: {
            isActive: true,
            lastSeenAt: new Date(),
            providerData: model as any,
            underlyingProvider: ((providerConfig as any).providerClass === 'AGGREGATOR' || providerConfig.type === 'openrouter') && modelSlug.includes('/') ? modelSlug.split('/')[0] : providerConfig.name,
            updatedAt: new Date(),
          } as any
        });
      } else {
        dbModel = await prisma.model.create({
          data: {
            id: stableId,
            providerId: providerConfig.id,
            name: displayName,
            providerData: model as any,
            underlyingProvider: ((providerConfig as any).providerClass === 'AGGREGATOR' || providerConfig.type === 'openrouter') && modelSlug.includes('/') ? modelSlug.split('/')[0] : providerConfig.name,
            isActive: true,
            aiData: {},
          } as any
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
        console.error(`[ProviderService] Individual sync failed for ${p.name}:`, e);
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
