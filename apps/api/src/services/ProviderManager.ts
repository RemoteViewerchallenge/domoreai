import { db } from '../db.js';
import { decrypt } from '../utils/encryption.js';
import { ProviderFactory } from '../utils/ProviderFactory.js';
import { type BaseLLMProvider, type LLMModel } from '../utils/BaseLLMProvider.js';

export class ProviderManager {
  private static providers: Map<string, BaseLLMProvider> = new Map();

  static async initialize() {
    try {
      const configs = await db.providerConfig.findMany({
        where: { isEnabled: true },
      });

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
          console.log(`Initialized provider: ${config.label} (${config.type})`);
        } catch (error) {
          console.error(`Failed to initialize provider ${config.label}:`, error);
        }
      }
    } catch (error) {
      console.error('Failed to load provider configs:', error);
    }
  }

  static getProvider(id: string): BaseLLMProvider | undefined {
    return this.providers.get(id);
  }

  static async getAllModels(): Promise<LLMModel[]> {
    const allModels: LLMModel[] = [];
    for (const provider of this.providers.values()) {
      try {
        const models = await provider.getModels();
        allModels.push(...models);
      } catch (error) {
        console.error(`Failed to fetch models from provider ${provider.id}:`, error);
      }
    }
    return allModels;
  }

  /**
   * Syncs all discovered models to the active registry table.
   * This turns the DB into a mirror of the API state.
   */
  static async syncModelsToRegistry() {
      console.log('[ProviderManager] Starting Registry Sync...');
      
      // 1. Get Active Table
      const config = await db.orchestratorConfig.findUnique({ where: { id: 'global' } });
      const tableName = config?.activeTableName || 'unified_models';
      
      // 2. Iterate Providers
      for (const [providerId, provider] of this.providers.entries()) {
          try {
              console.log(`[Registry Sync] Fetching models for ${providerId}...`);
              const models = await provider.getModels();
              
              if (models.length === 0) continue;

              // 3. Prepare Data for Insertion
              // We need to map LLMModel fields to the table columns.
              // We'll assume standard columns: model_id, provider_id, context_window, cost, is_free, type
              
              // OPTIONAL: Wipe existing rows for this provider to remove stale models
              await db.$executeRawUnsafe(`DELETE FROM "${tableName}" WHERE provider_id = '${providerId}'`);
              
              // 4. Insert New Rows
              // We construct a massive VALUES string.
              const values = models.map(m => {
                  const safeId = m.id.replace(/'/g, "''");
                  const safeName = (m.name || m.id).replace(/'/g, "''");
                  const context = m.contextWindow || 0;
                  const cost = m.costPer1k || 0;
                  const isFree = m.isFree || (cost === 0);
                  const type = 'chat'; // Default to chat for now
                  
                  return `('${safeId}', '${providerId}', '${safeName}', ${context}, ${cost}, ${isFree}, '${type}')`;
              }).join(', ');
              
              const query = `
                  INSERT INTO "${tableName}" (model_id, provider_id, model_name, context_window, cost, is_free, type)
                  VALUES ${values}
              `;
              
              await db.$executeRawUnsafe(query);
              console.log(`[Registry Sync] Synced ${models.length} models for ${providerId}`);
              
          } catch (error) {
              console.error(`[Registry Sync] Failed for provider ${providerId}:`, error);
          }
      }
      console.log('[ProviderManager] Registry Sync Completed.');
  }
}
