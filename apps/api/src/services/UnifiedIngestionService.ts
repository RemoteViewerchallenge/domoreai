import { PrismaClient, Prisma } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';
import { chunkText, createEmbedding, vectorStore } from './vector.service.js';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

const MAPPINGS: Record<string, { contextPath: string; namePath: string; idPath: string; pricingPath?: string }> = {
  google: { contextPath: 'inputTokenLimit', namePath: 'displayName', idPath: 'name' },
  openrouter: { contextPath: 'context_length', namePath: 'name', idPath: 'id', pricingPath: 'pricing' },
  groq: { contextPath: 'context_window', namePath: 'id', idPath: 'id' },
  ollama: { contextPath: 'details.context_length', namePath: 'name', idPath: 'name' },
  mistral: { contextPath: 'max_context_length', namePath: 'name', idPath: 'id' }
};

export class UnifiedIngestionService {

  static async processContent(payload: {
    source: string;
    content: string;
    type: string;
    metadata?: any
  }): Promise<void> {
    const chunks = chunkText(payload.content);
    const vectors = [];

    for (const chunk of chunks) {
      const embedding = await createEmbedding(chunk);
      vectors.push({
        id: uuidv4(),
        vector: embedding,
        metadata: {
          ...payload.metadata,
          source: payload.source,
          type: payload.type,
          chunk: chunk // duplicating content in metadata as per vector.service example
        }
      });
    }

    await vectorStore.add(vectors);
  }
  
  static async ingestAllModels(modelsDir?: string): Promise<void> {
    const targetDir = modelsDir || path.join(process.cwd(), 'latest_models');
    let files: string[] = [];
    try { files = await fs.readdir(targetDir); } catch { return; }

    console.log(`🚀 Starting Unified Ingestion...`);

    // PHASE 1: Raw Data Lake (Anti-Corruption)
    // We save the file content FIRST. If the app crashes later, we still have this.
    const rawRecords = [];
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const providerMatch = file.match(/^(google|openrouter|groq|ollama|mistral)/);
      if (!providerMatch) continue;
      
      const providerName = providerMatch[1];
      const content = await fs.readFile(path.join(targetDir, file), 'utf-8');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rawData = JSON.parse(content) as Record<string, unknown> | Record<string, unknown>[]; // Parsing only to validate JSON validity

      // Insert into RawDataLake
      const record = await prisma.rawDataLake.create({
        data: {
          provider: providerName,
          fileName: file,
          rawData: rawData as Prisma.JsonObject, // <--- THE SOURCE OF TRUTH
          processed: false
        }
      });
      rawRecords.push({ id: record.id, provider: providerName, rawData });
    }

    // PHASE 2: Application Processing (Gatekeeper)
    let totalIngested = 0;
    
    for (const { id, provider, rawData } of rawRecords) {
        const mapping = MAPPINGS[provider] || MAPPINGS['openrouter'];
        const castRaw = rawData; 
        const rawModelList = Array.isArray(castRaw) ? castRaw : ((castRaw.data || castRaw.models || []) as Record<string, unknown>[]);
        
        // DEDUPLICATE within the list to avoid duplicate upserts in the same batch
        const uniqueModelMap = new Map<string, Record<string, unknown>>();
        for (const raw of rawModelList) {
            const modelIdRaw = this.resolvePath(raw, mapping.idPath);
            if (typeof modelIdRaw !== 'string' && typeof modelIdRaw !== 'number') continue;
            const modelId = String(modelIdRaw).trim(); // Normalize: Trim
            if (!modelId) continue;
            uniqueModelMap.set(modelId, raw);
        }

        const providerConfig = await this.ensureProviderConfig(provider);

        for (const [modelId, raw] of uniqueModelMap.entries()) {
            // ...
            const isFree = this.checkIsFree(provider, raw);

            // Gatekeeping: If OpenRouter AND Paid, SKIP IT.
            if (provider === 'openrouter' && !isFree) {
                continue; 
            }

            // Normalization
            const contextWindow = (this.resolvePath(raw, mapping.contextPath) as number) || 4096;
            const nameRaw = this.resolvePath(raw, mapping.namePath);
            const name = (typeof nameRaw === 'string' || typeof nameRaw === 'number') ? String(nameRaw).trim() : modelId;
            const isMultimodal = JSON.stringify(raw).toLowerCase().includes('vision');

            // 3. CAPABILITY EXTRACTION
            const modelIdLower = modelId.toLowerCase();
            const rawStr = JSON.stringify(raw).toLowerCase();
            const capsData = {
                contextWindow,
                maxOutput: 4096,
                hasVision: isMultimodal || modelIdLower.includes('vision') || modelIdLower.includes('vl'),
                hasAudioInput: modelIdLower.includes('audio') || modelIdLower.includes('whisper'),
                hasAudioOutput: modelIdLower.includes('tts') || rawStr.includes('text-to-speech'),
                hasTTS: modelIdLower.includes('tts'),
                hasImageGen: modelIdLower.includes('dall-e') || modelIdLower.includes('imagen'),
                isMultimodal,
                supportsFunctionCalling: rawStr.includes('function') || rawStr.includes('tool'),
                supportsJsonMode: rawStr.includes('json_mode') || rawStr.includes('json')
            };

            // 4. UPSERT WITH CAPABILITIES (The Missing Link)
            try {
                await prisma.model.upsert({
                    where: { providerId_modelId: { providerId: providerConfig.id, modelId } },
                    create: {
                        providerId: providerConfig.id,
                        modelId,
                        name,
                        isFree: true,
                        isActive: true,
                        providerData: raw as Prisma.JsonObject,
                        specs: { contextWindow, isMultimodal },
                        source: 'INDEX',
                        capabilities: {
                            create: capsData
                        }
                    },
                    update: {
                        isActive: true,
                        isFree: true,
                        providerData: raw as Prisma.JsonObject,
                        lastSeenAt: new Date(),
                        capabilities: {
                            upsert: {
                                create: capsData,
                                update: capsData
                            }
                        }
                    }
                });
                totalIngested++;
            } catch (err: unknown) {
                const prismaError = err as { code?: string; message?: string };
                if (prismaError.code === 'P2002') {
                    console.warn(`[Ingestion] Skipping model ${modelId} due to unique constraint conflict (likely race condition or duplicate ID in index).`);
                } else {
                    console.error(`[Ingestion] Failed to upsert model ${modelId}:`, err);
                }
            }
        }
        // Mark Raw Record Processed
        await prisma.rawDataLake.update({ where: { id }, data: { processed: true } });
    }
    console.log(`✅ Ingestion Complete. Available Models: ${totalIngested}`);
  }

  // The Logic you specifically asked for
  private static checkIsFree(provider: string, raw: Record<string, unknown>): boolean {
      // Whitelist
      if (['groq', 'ollama', 'mistral', 'google'].includes(provider)) return true;

      // Strict OpenRouter Check
      if (provider === 'openrouter') {
          // If pricing is missing, assume paid.
          const pricing = raw.pricing as Record<string, unknown> | undefined;
          if (!pricing) return false;
          
          // Cast values to ensure we aren't fooled by strings
          const prompt = Number(pricing.prompt);
          const completion = Number(pricing.completion);
          
          // EXACT ZERO CHECK
          return prompt === 0 && completion === 0;
      }
      return false;
  }

  // Helpers
  private static resolvePath(obj: Record<string, unknown>, path: string): unknown {
      return path.split('.').reduce((o: unknown, k) => {
          if (o && typeof o === 'object' && k in o) {
             return (o as Record<string, unknown>)[k];
          }
          return undefined;
      }, obj);
  }

  private static async ensureProviderConfig(type: string) {
      const existing = await prisma.providerConfig.findFirst({ where: { type } });
      if (existing) return existing;
      return await prisma.providerConfig.create({
          data: { label: type, type, baseURL: '', apiKey: 'PLACEHOLDER', isEnabled: true }
      });
  }
}
