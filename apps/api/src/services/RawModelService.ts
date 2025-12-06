import { prisma } from '../db.js';
import { decrypt } from '../utils/encryption.js';

export class RawModelService {
  
  static async fetchAndSnapshot(providerConfigId: string) {
    // 1. Get Config
    const config = await prisma.providerConfig.findUnique({ 
      where: { id: providerConfigId } 
    });
    
    if (!config) throw new Error(`Provider Config ${providerConfigId} not found`);

    // 2. Prepare URL with provider-aware defaults and normalization
    let url = config.baseURL;
    if (!url) {
        if (config.type === 'openai') url = 'https://api.openai.com/v1';
        else if (config.type === 'openrouter') url = 'https://openrouter.ai/api/v1';
        else if (config.type === 'mistral') url = 'https://api.mistral.ai/v1';
        else if (config.type === 'groq') url = 'https://api.groq.com/openai/v1';
        else if (config.type === 'anthropic') url = 'https://api.anthropic.com/v1';
        else if (config.type === 'ollama') url = 'http://localhost:11434';
        else if (config.type === 'google') url = 'https://generativelanguage.googleapis.com/v1beta';
    }

    // Normalize Ollama URL (strip trailing /v1 if present)
    const looksLikeOllama = config.type === 'ollama' || /:11434(\/|$)/.test(url || '');
    if (looksLikeOllama && url) {
      url = url.replace(/\/?v1\/?$/, '');
    }

    // Remove trailing slash and add endpoint
    url = url?.replace(/\/$/, '') || '';
    
    let fetchUrl = '';
    if (looksLikeOllama) {
        fetchUrl = url.endsWith('/api/tags') ? url : `${url}/api/tags`;
    } else if (config.type === 'google') {
        // CORRECTED: Use the v1 endpoint which provides the full model catalog,
        // not the v1beta endpoint which only lists a small subset.
        fetchUrl = 'https://generativelanguage.googleapis.com/v1/models?pageSize=100';
    } else {
        // OpenAI Compatible
        fetchUrl = url.endsWith('/models') ? url : `${url}/models`;
    }

    console.log(`[RawModelService] Attempting to fetch models from provider endpoint: ${fetchUrl}`);

    // 3. Fetch (Raw)
    const allModels: any[] = [];
    let nextUrl: string | undefined = fetchUrl;
    const apiKey = decrypt(config.apiKey);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      
      if (apiKey) {
          if (config.type === 'google') {
              headers['x-goog-api-key'] = apiKey;
          } else if (!looksLikeOllama) {
              headers.Authorization = `Bearer ${apiKey}`;
          }
      }

      // --- PAGINATION LOOP ---
      while (nextUrl) {
        console.log(`[RawModelService] Fetching page: ${nextUrl}`);
        const response = await fetch(nextUrl, {
          headers,
          signal: controller.signal
        });

        if (!response.ok) {
            const txt = await response.text();
            throw new Error(`Provider API Error: ${response.status} ${txt}`);
        }
        
        const pageJson = await response.json();
        
        // Extract models from the current page
        const pageModels = pageJson.models || [];
        allModels.push(...pageModels);

        // Check for the next page token
        if (pageJson.nextPageToken) {
          // Construct the URL for the next page
          const baseUrl = fetchUrl.split('?')[0];
          nextUrl = `${baseUrl}?pageSize=100&pageToken=${pageJson.nextPageToken}`;
        } else {
          nextUrl = undefined; // No more pages, exit loop
        }
      }

      // 5. Save to DB (Exact dump)
      const snapshot = await prisma.rawDataLake.create({
        data: {
          provider: config.type,
          rawData: allModels, // Save the complete, accumulated list
          ingestedAt: new Date()
        }
      });

      console.log(`[RawModelService] Saved snapshot ${snapshot.id}`);
      return snapshot;

    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error(`[RawModelService] Fetch failed for ${fetchUrl}:`, error);
      throw new Error(`Failed to fetch models: ${error.message}`);
    }
  }
}
