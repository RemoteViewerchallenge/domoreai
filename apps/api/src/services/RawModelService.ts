import { db } from '../db.js';
import { decrypt } from '../utils/encryption.js';

export class RawModelService {
  
  static async fetchAndSnapshot(providerConfigId: string) {
    // 1. Get Config
    const config = await db.providerConfig.findUnique({ 
      where: { id: providerConfigId } 
    });
    
    if (!config) throw new Error(`Provider Config ${providerConfigId} not found`);

    // 2. Prepare URL
    let url = config.baseURL;
    if (!url) {
        if (config.type === 'openai') url = 'https://api.openai.com/v1';
        else if (config.type === 'openrouter') url = 'https://openrouter.ai/api/v1';
        else if (config.type === 'mistral') url = 'https://api.mistral.ai/v1';
        else if (config.type === 'groq') url = 'https://api.groq.com/openai/v1';
        else if (config.type === 'anthropic') url = 'https://api.anthropic.com/v1';
    }
    // Remove trailing slash and add /models endpoint
    url = url?.replace(/\/$/, '') || '';
    const fetchUrl = url.endsWith('/models') ? url : `${url}/models`;

    console.log(`[RawModelService] Fetching from: ${fetchUrl}`);

    // 3. Fetch (Raw)
    const apiKey = decrypt(config.apiKey);
    const response = await fetch(fetchUrl, {
      headers: { 
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
        const txt = await response.text();
        throw new Error(`Provider API Error: ${response.status} ${txt}`);
    }
    
    // 4. Get JSON (Yes, it is JSON)
    const rawJson = await response.json();

    // 5. Save to DB (Exact dump)
    // This saves the whole response (e.g., { object: 'list', data: [...] }) as one record.
    const snapshot = await db.rawDataLake.create({
      data: {
        provider: config.type,
        rawData: rawJson, 
        ingestedAt: new Date()
      }
    });

    console.log(`[RawModelService] Saved snapshot ${snapshot.id}`);
    return snapshot;
  }
}
