import { db } from '../db.js';
import { decrypt } from '../utils/encryption.js';

export class RawModelService {
  
  static async fetchAndSnapshot(providerConfigId: string) {
    // 1. Get Credentials
    const config = await db.providerConfig.findUnique({ 
      where: { id: providerConfigId } 
    });
    
    if (!config) throw new Error(`Provider Config ${providerConfigId} not found`);

    // 2. Determine URL (Add more providers here as needed)
    let url = config.baseURL;
    if (!url) {
        if (config.type === 'openai') url = 'https://api.openai.com/v1';
        if (config.type === 'openrouter') url = 'https://openrouter.ai/api/v1';
        if (config.type === 'anthropic') url = 'https://api.anthropic.com/v1';
    }
    // Clean trailing slash
    url = url?.replace(/\/$/, '') || url;

    console.log(`[RawModelService] Fetching models from ${url}...`);

    // 3. Fetch Data
    const apiKey = decrypt(config.apiKey);
    const response = await fetch(`${url}/models`, {
      headers: { 
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
        const txt = await response.text();
        throw new Error(`Provider fetch failed: ${response.status} ${txt}`);
    }
    
    const rawJson = await response.json();

    // 4. Save Snapshot to Prisma
    const snapshot = await db.rawDataLake.create({
      data: {
        provider: config.type,
        rawData: rawJson as any,
        ingestedAt: new Date()
      }
    });

    return snapshot;
  }
}
