import { db } from '../db.js';
import { type LLMAdapter } from '../llm-adapters.js';

export class IngestionService {
  /**
   * Fetches raw models from a provider and saves them to the Raw Data Lake.
   * @param providerName The name of the provider (e.g., "openrouter")
   * @param adapter The adapter instance to use for fetching
   * @param config The configuration for the adapter (apiKey, etc.)
   */
  async ingestProviderData(providerName: string, adapter: LLMAdapter, config: any) {
    console.log(`[IngestionService] Starting ingestion for ${providerName}...`);
    
    try {
      // 1. Fetch raw data using the new getRawModels method
      // Note: We need to ensure the adapter implements this.
      if (!adapter.getRawModels) {
        throw new Error(`Adapter for ${providerName} does not implement getRawModels`);
      }

      const rawData = await adapter.getRawModels(config);

      // 2. Save to RawDataLake table
      const record = await db.rawDataLake.create({
        data: {
          provider: providerName,
          rawData: rawData as any, // Prisma Json type
        },
      });

      console.log(`[IngestionService] Successfully ingested data for ${providerName}. Record ID: ${record.id}`);
      return record;
    } catch (error: any) {
      console.error(`[IngestionService] Failed to ingest data for ${providerName}:`, error);
      throw error;
    }
  }
}
