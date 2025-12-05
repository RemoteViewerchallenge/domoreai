import { eq } from 'drizzle-orm';
import { db } from '../db.js';
import { providerConfigs, modelRegistry, openAIModels, anthropicModels, googleModels, openRouterModels, genericProviderModels } from '../db/schema.js';
import { decrypt, encrypt } from '../utils/encryption.js';
import { ProviderFactory } from '../utils/ProviderFactory.js';
import { type BaseLLMProvider, type LLMModel } from '../utils/BaseLLMProvider.js';

export class ProviderManager {
  private static providers: Map<string, BaseLLMProvider> = new Map();

  static async initialize() {
    // 1. AUTO-BOOTSTRAP FROM ENV (The "Free Labor" Fix)
    // This checks your .env file and inserts them into the DB if missing
    await this.bootstrapFromEnv();

    // 2. Load from DB
    try {
      const configs = await db.select().from(providerConfigs).where(eq(providerConfigs.isEnabled, true));
      
      this.providers.clear();
      for (const config of configs) {
        try {
          const apiKey = decrypt(config.apiKey);
          const provider = ProviderFactory.createProvider(config.type, {
            id: config.id,
            apiKey,
            baseURL: config.baseURL || undefined,
          });
          this.providers.set(config.id, provider);
          console.log(`[ProviderManager] ✅ Online: ${config.label} (${config.type})`);
        } catch (error) {
          console.error(`[ProviderManager] ❌ Failed to init ${config.label}:`, error);
        }
      }
      
      // 3. Auto-detect Ollama (Local)
      await this.detectLocalOllama();

    } catch (error) {
      console.error('[ProviderManager] Critical Error loading providers:', error);
    }
  }

  private static async bootstrapFromEnv() {
    const { v4: uuidv4 } = await import('uuid');
    const mappings = [
      { env: 'GOOGLE_GENERATIVE_AI_API_KEY', type: 'google', label: 'Google AI Studio (Env)' },
      { env: 'MISTRAL_API_KEY', type: 'mistral', label: 'Mistral API (Env)' },
      { env: 'OPENROUTER_API_KEY', type: 'openrouter', label: 'OpenRouter (Env)', url: 'https://openrouter.ai/api/v1' },
      { env: 'GROQ_API_KEY', type: 'groq', label: 'Groq (Env)', url: 'https://api.groq.com/openai/v1' }
    ];

    for (const map of mappings) {
      const key = process.env[map.env];
      if (key) {
        // Check if already exists to avoid duplicates
        const existing = await db.query.providerConfigs.findFirst({
           where: eq(providerConfigs.label, map.label)
        });

        if (!existing) {
           console.log(`[ProviderManager] 🚀 Bootstrapping ${map.label} from .env...`);
           const now = new Date();
           await db.insert(providerConfigs).values({
             id: uuidv4(),
             label: map.label,
             type: map.type,
             apiKey: encrypt(key),
             baseURL: map.url || '',
             isEnabled: true,
             createdAt: now,
             updatedAt: now
           });
        }
      }
    }
  }

  static getProvider(id: string): BaseLLMProvider | undefined {
    // Allow lookup by "type" as well if ID fails (e.g. "google")
    if (this.providers.has(id)) return this.providers.get(id);
    
    // Fallback: Find first provider of this type
    for (const [_, p] of this.providers) {
        if ((p as any).id === id || (p as any).id.includes(id)) return p;
    }
    return undefined;
  }
  
  static hasProvider(partialId: string): boolean {
      return Array.from(this.providers.keys()).some(k => k.includes(partialId));
  }

  static async getAllModels(): Promise<LLMModel[]> {
    const allModels: LLMModel[] = [];
    for (const provider of this.providers.values()) {
      try {
        const models = await provider.getModels();
        allModels.push(...models);
      } catch (error) {
        console.error(`Failed to fetch models from provider ${provider.id}`);
      }
    }
    return allModels;
  }

  /**
   * Syncs all discovered models to the Drizzle tables.
   * Splits data between Registry (lookup) and Provider Tables (details).
   */
  static async syncModelsToRegistry() {
    console.log('[ProviderManager] Starting Registry Sync (All Models)...');

    // 2. Iterate Providers
    for (const [providerId, provider] of this.providers.entries()) {
      try {
        console.log(`[Registry Sync] Fetching models for ${providerId}...`);
        const models = await provider.getModels();

        if (models.length === 0) continue;

        // Get provider config to check type
        const [providerConfig] = await db.select({ type: providerConfigs.type, label: providerConfigs.label })
          .from(providerConfigs)
          .where(eq(providerConfigs.id, providerId))
          .limit(1);

        if (!providerConfig) continue;

        // 3. Sync ALL models (removed Free Models Only filter)
        // Deduplicate
        const uniqueModels = new Map<string, LLMModel>();
        models.forEach(m => uniqueModels.set(m.id, m));

        console.log(`[Registry Sync] Upserting ${uniqueModels.size} models for ${providerConfig.label || providerId}...`);

        for (const m of uniqueModels.values()) {
          const cost = m.costPer1k as number | undefined;
          const isFree = m.isFree === true || (typeof cost === 'number' && cost === 0);

          // 1. Upsert into Registry (The Phonebook)
          await db.insert(modelRegistry).values({
            modelId: m.id,
            providerId: providerId,
            modelName: (m.name as string) || m.id,
            isFree: isFree,
            costPer1k: cost || 0
          }).onConflictDoUpdate({
            target: [modelRegistry.modelId, modelRegistry.providerId],
            set: {
              modelName: (m.name as string) || m.id,
              isFree: isFree,
              costPer1k: cost || 0
            }
          });

          // 2. Upsert into Provider Specific Table (The Details)
          const rawData = (m.providerData || {}) as Record<string, unknown>; 
          
          if (providerConfig.type === 'openai') {
            await db.insert(openAIModels).values({
              modelId: m.id,
              contextWindow: (m.contextWindow as number) || 0,
              supportsVision: (m.hasVision as boolean) || false,
              rawData: rawData
            }).onConflictDoUpdate({
              target: openAIModels.modelId,
              set: { rawData: rawData }
            });
          } 
          else if (providerConfig.type === 'anthropic') {
            await db.insert(anthropicModels).values({
              modelId: m.id,
              maxTokens: (m.contextWindow as number) || 0, 
              supportsVision: (m.hasVision as boolean) || false,
              rawData: rawData
            }).onConflictDoUpdate({
              target: anthropicModels.modelId,
              set: { rawData: rawData }
            });
          }
          else if (providerConfig.type === 'google') {
            await db.insert(googleModels).values({
              modelId: m.id,
              inputTokenLimit: (m.contextWindow as number) || 0,
              supportsGeminiTools: true,
              rawData: rawData
            }).onConflictDoUpdate({
              target: googleModels.modelId,
              set: { rawData: rawData }
            });
          }
          else if (providerConfig.type === 'openrouter') {
             // Safe access for OpenRouter specific fields
             const pricing = rawData.pricing;
             const topProvider = rawData.top_provider;

             await db.insert(openRouterModels).values({
              modelId: m.id,
              contextLength: (m.contextWindow as number) || 0,
              pricing: pricing, 
              topProvider: topProvider,
              rawData: rawData
            }).onConflictDoUpdate({
              target: openRouterModels.modelId,
              set: { rawData: rawData }
            });
          }
          else {
            // Generic Fallback
            await db.insert(genericProviderModels).values({
              modelId: m.id,
              providerId: providerId,
              rawData: rawData
            }).onConflictDoUpdate({
              target: [genericProviderModels.modelId, genericProviderModels.providerId],
              set: { rawData: rawData }
            });
          }
        }

        console.log(`[Registry Sync] Synced ${uniqueModels.size} models for ${providerConfig.label || providerId}`);

      } catch (error) {
        console.error(`[Registry Sync] Failed for provider ${providerId}:`, error);
      }
    }

    console.log('[ProviderManager] Registry Sync Completed.');
  }

  /**
   * Auto-detects a local Ollama instance and registers it as a provider.
   * This allows "zero-config" usage of local models.
   */
  private static async detectLocalOllama() {
    const ollamaHost = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
    const providerId = 'ollama-local';

    // If already configured in DB, skip auto-detection to respect user config
    if (this.providers.has(providerId)) return;

    try {
        // Try to connect
        const provider = ProviderFactory.createProvider('ollama', {
            id: providerId,
            baseURL: ollamaHost,
        });

        // Test connection by fetching models
        const models = await provider.getModels();
        
        if (models.length > 0) {
            console.log(`[ProviderManager] Auto-detected local Ollama at ${ollamaHost} with ${models.length} models.`);
            this.providers.set(providerId, provider);
        }
    } catch (e) {
        // Silent failure - Ollama just isn't running
        // console.debug(`[ProviderManager] Local Ollama not detected at ${ollamaHost}`);
    }
  }
}


