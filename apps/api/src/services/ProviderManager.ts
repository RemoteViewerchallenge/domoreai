import { decrypt, encrypt } from '../utils/encryption.js';
import { ProviderFactory } from '../utils/ProviderFactory.js';
import { type BaseLLMProvider, type LLMModel } from '../utils/BaseLLMProvider.js';
import { IProviderManager } from '../interfaces/IProviderManager.js';
import { IProviderRepository } from '../interfaces/IProviderRepository.js';
import { ProviderRepository } from '../repositories/ProviderRepository.js';
import { OLLAMA_DEFAULT_HOST, OLLAMA_PROVIDER_ID, OPENROUTER_API_URL, GROQ_API_URL, DEFAULT_FETCH_TIMEOUT_MS } from '../config/constants.js';

const MS_PER_SECOND = 1000;


interface RawSnapshotData extends LLMModel {
    [key: string]: unknown;
}

export class ProviderManager implements IProviderManager {
  private providers: Map<string, BaseLLMProvider> = new Map();
  private unhealthyProviders: Map<string, number> = new Map(); // providerId -> cooldownEndTime
  // NEW: Store metadata for logging and filtering
  private providerMetadata: Map<string, { label: string; type: string }> = new Map();

  private repository: IProviderRepository;

  constructor(repository?: IProviderRepository) {
      this.repository = repository || new ProviderRepository();
  }

  public markUnhealthy(providerId: string, cooldownSeconds: number) {
    this.unhealthyProviders.set(providerId, Date.now() + cooldownSeconds * MS_PER_SECOND);
    console.warn(`[ProviderManager] Marked ${providerId} as unhealthy. Cooldown for ${cooldownSeconds}s.`);
  }

  public isHealthy(providerId: string): boolean {
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

  async initialize() {
    // 1. AUTO-BOOTSTRAP FROM ENV (The "Free Labor" Fix)
    // This checks your .env file and inserts them into the DB if missing
    await this.bootstrapFromEnv();

    // 2. Load from DB
    try {
      const configs = await this.repository.getEnabledProviderConfigs();
      
      this.providers.clear();
      this.providerMetadata.clear(); // Clear metadata

      // Environment variable mappings for direct access
      const envMappings: Record<string, string> = {
        'google': 'GOOGLE_GENERATIVE_AI_API_KEY',
        'mistral': 'MISTRAL_API_KEY',
        'openrouter': 'OPENROUTER_API_KEY',
        'groq': 'GROQ_API_KEY',
        'ollama': 'OLLAMA_API_KEY' // Usually empty for local Ollama
      };

      for (const config of configs) {
        try {
          // Try to use environment variable first (avoids decryption issues)
          let apiKey = '';
          const envVar = envMappings[config.type];
          
          if (config.type === 'ollama') {
            // Ollama is local and doesn't need an API key
            apiKey = process.env.OLLAMA_API_KEY || '';
          } else if (envVar && process.env[envVar]) {
            // Use environment variable directly
            apiKey = process.env[envVar] || '';
            console.log(`[ProviderManager] Using ${envVar} from environment for ${config.label}`);
          } else {
            // Fall back to decrypting from database
            apiKey = decrypt(config.apiKey);
          }
          

          // Fix for Ollama: If baseURL is missing in DB, default to local.
          // This prevents "Ollama requires a baseURL" initialization errors.
          let baseURL = config.baseURL || undefined;
          if (config.type === 'ollama' && !baseURL) {
             baseURL = process.env.OLLAMA_HOST || OLLAMA_DEFAULT_HOST;
          }

          const provider = ProviderFactory.createProvider(config.type, {
            id: config.id,
            apiKey,
            baseURL,
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

  private async bootstrapFromEnv() {
    const mappings = [
      { env: 'GOOGLE_GENERATIVE_AI_API_KEY', type: 'google', label: 'Google AI Studio (Env)' },
      { env: 'MISTRAL_API_KEY', type: 'mistral', label: 'Mistral API (Env)' },
      { env: 'OPENROUTER_API_KEY', type: 'openrouter', label: 'OpenRouter (Env)', url: OPENROUTER_API_URL },
      { env: 'GROQ_API_KEY', type: 'groq', label: 'Groq (Env)', url: GROQ_API_URL }
    ];

    for (const map of mappings) {
      const key = process.env[map.env];
      if (key) {
        // Check if already exists to avoid duplicates
        const existing = await this.repository.findProviderConfigByLabel(map.label);

        if (!existing) {
           console.log(`[ProviderManager] 🚀 Bootstrapping ${map.label} from .env...`);
           // Create a stable, human-readable ID instead of a random UUID.
           // e.g., "OpenRouter (Env)" -> "openrouter-env"
           const stableId = `${map.type}-${map.label.split(' ')[1].toLowerCase().replace(/[^a-z0-9]/g, '')}`;

           const now = new Date();
           await this.repository.createProviderConfig({
             id: stableId,
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

  getProvider(id: string): BaseLLMProvider | undefined {
    // Allow lookup by "type" as well if ID fails (e.g. "google")
    if (this.providers.has(id)) return this.providers.get(id);
    
    // Fallback: Find first provider of this type
    for (const [_, p] of this.providers) {
        if (p.id === id || p.id.includes(id)) return p;
    }
    return undefined;
  }
  
  hasProvider(partialId: string): boolean {
      return Array.from(this.providers.keys()).some(k => k.includes(partialId));
  }

  async getAllModels(): Promise<LLMModel[]> {
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
  async syncModelsToRegistry() {
    console.log('[ProviderManager] Starting Registry Sync (Unified)...');

    for (const [providerId] of this.providers.entries()) {
      try {
        // 1. Get readable name for logs
        const meta = this.providerMetadata.get(providerId);
        const providerLabel = meta?.label || providerId;
        const providerType = meta?.type || 'unknown';

        // --- UNIFIED FETCH LOGIC ---
        // We will now use RawModelService to handle all fetching,
        // ensuring pagination and correct endpoints are always used.
        console.log(`[ProviderManager] Fetching models for ${providerLabel} via RawModelService...`);
        const { RawModelService } = await import('./RawModelService.js');
        const snapshot = await RawModelService.fetchAndSnapshot(providerId);
        
        if (!snapshot || !Array.isArray(snapshot.rawData)) {
          console.error(`[ProviderManager] Failed to get a valid snapshot for ${providerLabel}.`);
          continue;
        }
        const models = snapshot.rawData as LLMModel[];
        console.log(`[ProviderManager] Got ${models.length} models from ${providerLabel}.`);

        // The snapshot is already created by RawModelService. We just need to flatten.
        // We pass the snapshot ID to ensure we use the exact data that was saved.
        await this.flattenSnapshot(snapshot.id, providerType, models);

        if (models.length === 0) {
          console.warn(`[ProviderManager] No models to sync for ${providerLabel} after filtering`);
          continue;
        }

        const uniqueModels = new Map<string, RawSnapshotData>();
        models.forEach(m => uniqueModels.set(m.id, m as RawSnapshotData));

        // 3. Log with readable name
        console.log(`[Registry Sync] Upserting ${uniqueModels.size} models for ${providerLabel}...`);

        for (const m of uniqueModels.values()) {
          // Defensive: Extract model ID from various possible fields
          const modelId = (m.id || m.model || m.name) as string;
          if (!modelId) {
            console.warn(`[Registry Sync] Skipping model with no ID:`, m);
            continue;
          }

          const cost = m.costPer1k;
          const isFree = m.isFree === true || (typeof cost === 'number' && cost === 0);

          const specs = {
            contextWindow: m.contextWindow,
            hasVision: m.hasVision,
            hasReasoning: m.hasReasoning || false,
            hasCoding: m.hasCoding || false
          };

          await this.repository.upsertModel({
            where: {
              providerId_modelId: {
                providerId: providerId,
                modelId: modelId
              }
            },
            create: {
              providerId: providerId,
              modelId: modelId,
              name: (m.name as string) || modelId,
              isFree: isFree,
              costPer1k: cost || 0,
              providerData: m, // Store full raw model object
              specs: specs as unknown as Record<string, unknown>,
              aiData: {}
            },
            update: {
              name: (m.name as string) || modelId,
              isFree: isFree,
              costPer1k: cost || 0,
              providerData: m, // Store full raw model object
              specs: specs as unknown as Record<string, unknown>
            }
          });
        }

      } catch (error) {
        const meta = this.providerMetadata.get(providerId);
        const providerLabel = meta?.label || providerId;
        const err = error as Error & { cause?: { code: string } };
        if (err.cause?.code === 'ETIMEDOUT') {
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
   * Helper to flatten provider data from a snapshot into a dynamic table.
   * The snapshotting part is now handled by RawModelService.
   */
  private async flattenSnapshot(snapshotId: string, providerType: string, models: RawSnapshotData[]) {
    // Flatten into a dynamic table. This is the critical step.
    // Table name convention: "{providerType}_models" (e.g. google_models)
    try {
      const tableName = `${providerType}_models`;
      
      const { flattenRawData } = await import('./dataRefinement.service.js');
      
      console.log(`[ProviderManager] 🔨 Flattening data into table: ${tableName}...`);
      // Pass both snapshotId and the in-memory rawData.
      // flattenRawData is smart enough to use the rawData if the snapshotId lookup fails for any reason.
      const result = await flattenRawData({ snapshotId, tableName, rawData: models });
      console.log(`[ProviderManager] ✅ Created dynamic table ${result.tableName} with ${result.rowCount} rows.`);
      
    } catch (error) {
      console.error(`[ProviderManager] ❌ Failed to snapshot/flatten data for ${providerType}:`, error);
    }
  }

  /**
   * Auto-detects a local Ollama instance and registers it as a provider.
   * This allows "zero-config" usage of local models.
   */
  private async detectLocalOllama() {
    const ollamaHost = process.env.OLLAMA_HOST || OLLAMA_DEFAULT_HOST;
    const providerId = OLLAMA_PROVIDER_ID;

    // If already configured in DB, skip auto-detection to respect user config
    if (this.providers.has(providerId)) return;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_FETCH_TIMEOUT_MS);
    try {
        // A simple fetch to the root endpoint is enough to see if Ollama is running.
        const response = await fetch(ollamaHost, { signal: controller.signal });
        const text = await response.text();

        if (response.ok && text.includes('Ollama is running')) {
            console.log(`[ProviderManager] ✅ Auto-detected local Ollama at ${ollamaHost}.`);

            // Ensure the provider config exists in the database.
            const existing = await this.repository.findProviderConfigById(providerId);
            if (!existing) {
              const now = new Date();
              await this.repository.createProviderConfig({
                id: providerId,
                label: 'Ollama (Local)',
                type: 'ollama',
                apiKey: encrypt(''),
                baseURL: ollamaHost,
                isEnabled: true,
                createdAt: now,
                updatedAt: now
              });
              console.log('[ProviderManager] Registered local Ollama provider in DB.');
            }

            // Add the provider to the active list. The main sync loop will handle fetching its models.
            const provider = ProviderFactory.createProvider('ollama', { id: providerId, baseURL: ollamaHost });
            this.providers.set(providerId, provider);
        }
    } catch (e) {
        // Silent failure - Ollama just isn't running
        // console.debug(`[ProviderManager] Local Ollama not detected at ${ollamaHost}`);
    } finally {
        clearTimeout(timeoutId);
    }
  }

  // --- STATIC FACADE ---
  // Uses the default repository implementation for backward compatibility
  private static instance = new ProviderManager();

  public static getInstance() {
      return this.instance;
  }

  public static markUnhealthy(providerId: string, cooldownSeconds: number) {
      this.instance.markUnhealthy(providerId, cooldownSeconds);
  }

  public static isHealthy(providerId: string): boolean {
      return this.instance.isHealthy(providerId);
  }

  static async initialize() {
      await this.instance.initialize();
  }

  static getProvider(id: string) {
      return this.instance.getProvider(id);
  }

  static hasProvider(partialId: string) {
      return this.instance.hasProvider(partialId);
  }

  static async getAllModels(): Promise<LLMModel[]> {
      return this.instance.getAllModels();
  }

  static async syncModelsToRegistry() {
      await this.instance.syncModelsToRegistry();
  }
}
