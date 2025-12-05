import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { db, prisma } from '../db.js';
import { providerConfigs, modelRegistry } from '../db/schema.js';
import { decrypt, encrypt } from '../utils/encryption.js';
import { ProviderFactory } from '../utils/ProviderFactory.js';
import { type BaseLLMProvider, type LLMModel } from '../utils/BaseLLMProvider.js';

export class ProviderManager {
  private static providers: Map<string, BaseLLMProvider> = new Map();
  private static unhealthyProviders: Map<string, number> = new Map(); // providerId -> cooldownEndTime
  // NEW: Store metadata for logging and filtering
  private static providerMetadata: Map<string, { label: string; type: string }> = new Map();

  public static markUnhealthy(providerId: string, cooldownSeconds: number) {
    this.unhealthyProviders.set(providerId, Date.now() + cooldownSeconds * 1000);
    console.warn(`[ProviderManager] Marked ${providerId} as unhealthy. Cooldown for ${cooldownSeconds}s.`);
  }

  public static isHealthy(providerId: string): boolean {
      const cooldownEndTime = this.unhealthyProviders.get(providerId);
      if (!cooldownEndTime) {
          return true;
      }
      if (Date.now() > cooldownEndTime) {
          this.unhealthyProviders.delete(providerId);
          console.log(`[ProviderManager] ${providerId} is healthy again.`);
          return true;
      }
      return false;
  }

  static async initialize() {
    // 1. AUTO-BOOTSTRAP FROM ENV (The "Free Labor" Fix)
    // This checks your .env file and inserts them into the DB if missing
    await this.bootstrapFromEnv();

    // 2. Load from DB
    try {
      const configs = await db.select().from(providerConfigs).where(eq(providerConfigs.isEnabled, true));
      
      this.providers.clear();
      this.providerMetadata.clear(); // Clear metadata

      for (const config of configs) {
        try {
          const apiKey = decrypt(config.apiKey);
          const provider = ProviderFactory.createProvider(config.type, {
            id: config.id,
            apiKey,
            baseURL: config.baseURL || undefined,
          });
          this.providers.set(config.id, provider);
          
          // STORE METADATA HERE
          this.providerMetadata.set(config.id, { label: config.label, type: config.type });
          
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
    console.log('[ProviderManager] Starting Registry Sync (Unified)...');

    for (const [providerId, provider] of this.providers.entries()) {
      try {
        // 1. Get readable name for logs
        const meta = this.providerMetadata.get(providerId);
        const providerLabel = meta?.label || providerId;
        const providerType = meta?.type || 'unknown';

        console.log(`[ProviderManager] Fetching models from ${providerLabel} (${providerType})...`);
        let models = await provider.getModels();
        console.log(`[ProviderManager] Got ${models.length} models from ${providerLabel}`);

        // SAVE RAW UNFILTERED DATA IMMEDIATELY TO JSON FILE
        try {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
          const filename = `${providerType}_models_${timestamp}.json`;
          // Use process.cwd() - this is where node is actually running from
          const cwd = process.cwd();
          const filepath = join(cwd, filename);
          console.log(`[ProviderManager] 📝 CWD=${cwd}`);
          console.log(`[ProviderManager] 📝 Saving ${models.length} models to: ${filepath}`);
          await writeFile(filepath, JSON.stringify(models, null, 2), 'utf8');
          console.log(`[ProviderManager] ✅ Successfully saved ${models.length} records to: ${filename}`);
        } catch (fileErr) {
          console.error(`[ProviderManager] ❌ FAILED TO SAVE FILE:`, fileErr);
        }

        // 2. Apply provider-specific filters AFTER saving raw data
        if (providerType === 'openrouter') {
            const originalCount = models.length;
            models = models.filter(m => m.id.endsWith(':free'));
            console.log(`[Registry Sync] Filtered OpenRouter: Kept ${models.length} free models (dropped ${originalCount - models.length})`);
        }

        if (models.length === 0) {
          console.warn(`[ProviderManager] No models to sync for ${providerLabel} after filtering`);
          continue;
        }

        const uniqueModels = new Map<string, LLMModel>();
        models.forEach(m => uniqueModels.set(m.id, m));

        // 3. Log with readable name
        console.log(`[Registry Sync] Upserting ${uniqueModels.size} models for ${providerLabel}...`);

        for (const m of uniqueModels.values()) {
          const cost = m.costPer1k as number | undefined;
          const isFree = m.isFree === true || (typeof cost === 'number' && cost === 0);
          const now = new Date();

          const specs = {
            contextWindow: m.contextWindow,
            hasVision: m.hasVision,
            hasReasoning: m.hasReasoning || false,
            hasCoding: m.hasCoding || false
          };

          await db.insert(modelRegistry).values({
            id: uuidv4(),
            modelId: m.id,
            providerId: providerId,
            modelName: (m.name as string) || m.id,
            isFree: isFree,
            costPer1k: cost || 0,
            updatedAt: now,
            providerData: (m.providerData || {}),
            specs: specs as any,
            aiData: {} as any
          }).onConflictDoUpdate({
            target: [modelRegistry.modelId, modelRegistry.providerId],
            set: {
              modelName: (m.name as string) || m.id,
              isFree: isFree,
              costPer1k: cost || 0,
              updatedAt: now,
              providerData: (m.providerData || {}),
              specs: specs as any
            }
          });
        }

      } catch (error: any) {
        const meta = this.providerMetadata.get(providerId);
        const providerLabel = meta?.label || providerId;
        if (error.cause?.code === 'ETIMEDOUT') {
          console.error(`[Registry Sync] Failed for provider ${providerLabel}: Connection timed out.`);
          console.error(`If you are behind a firewall, please ensure the HTTPS_PROXY environment variable is correctly configured.`);
        } else {
          console.error(`[Registry Sync] Failed for provider ${providerLabel}:`, error);
        }
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

            // Ensure the ProviderConfig exists in the DB so FK constraints succeed
            try {
              const existing = await db.query.providerConfigs.findFirst({ where: eq(providerConfigs.id, providerId) });
              if (!existing) {
                const now = new Date();
                await db.insert(providerConfigs).values({
                  id: providerId,
                  label: 'Ollama (Local)',
                  type: 'ollama',
                  apiKey: encrypt(''),
                  baseURL: ollamaHost,
                  isEnabled: true,
                  requestsPerMinute: 0,
                  createdAt: now,
                  updatedAt: now
                });
                console.log('[ProviderManager] Registered local Ollama provider in DB.');
              }
            } catch (dbErr) {
              console.warn('[ProviderManager] Failed to ensure Ollama provider in DB:', dbErr);
            }

            this.providers.set(providerId, provider);
        }
    } catch (e) {
        // Silent failure - Ollama just isn't running
        // console.debug(`[ProviderManager] Local Ollama not detected at ${ollamaHost}`);
    }
  }
}
