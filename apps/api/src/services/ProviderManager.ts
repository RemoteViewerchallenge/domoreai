import { db } from '../db.js';
import { decrypt } from '../utils/encryption.js';
import { ProviderFactory, BaseLLMProvider, LLMModel } from '@repo/volcano-sdk';

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
}
