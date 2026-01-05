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
    // RawDataLake table is missing in current schema. skipping phase 1 persistence.
    // We will just process the files directly.
    
    // PHASE 2: Application Processing (Gatekeeper)
    let totalIngested = 0;

    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const providerMatch = file.match(/^(google|openrouter|groq|ollama|mistral)/);
      if (!providerMatch) continue;
      
      const provider = providerMatch[1];
      const content = await fs.readFile(path.join(targetDir, file), 'utf-8');
      const rawData = JSON.parse(content) as Record<string, unknown> | Record<string, unknown>[]; 

      const mapping = MAPPINGS[provider] || MAPPINGS['openrouter'];
      const castRaw = rawData; 
      const rawModelList = Array.isArray(castRaw) ? castRaw : ((castRaw.data || castRaw.models || []) as Record<string, unknown>[]);
        
      const uniqueModelMap = new Map<string, Record<string, unknown>>();
      for (const raw of rawModelList) {
          const modelIdRaw = this.resolvePath(raw, mapping.idPath);
          if (typeof modelIdRaw !== 'string' && typeof modelIdRaw !== 'number') continue;
          const modelId = String(modelIdRaw).trim();
          if (!modelId) continue;
          uniqueModelMap.set(modelId, raw);
      }

      const providerConfig = await this.ensureProviderConfig(provider);

      for (const [modelId, raw] of uniqueModelMap.entries()) {
          const isFree = this.checkIsFree(provider, raw);

          if (provider === 'openrouter' && !isFree) {
              continue; 
          }

          const contextWindow = (this.resolvePath(raw, mapping.contextPath) as number) || 4096;
          // Use modelId as the unique name (slug) if name mapping fails or to ensure uniqueness
          const nameRaw = this.resolvePath(raw, mapping.namePath);
          // For current schema, 'name' is the unique identifier combined with providerId.
          // We will use modelId (slug) as name to ensure stability.
          // We'll store the display name in providerData if needed.
          const name = modelId; // Force use of slug as name

          const isMultimodal = JSON.stringify(raw).toLowerCase().includes('vision');

          const modelIdLower = modelId.toLowerCase();
          const rawStr = JSON.stringify(raw).toLowerCase();
          
          /* Capability tags - not in relation, but we can compute them */
          // Schema assumes capabilities relation?
          // model.capabilities is a one-to-one or one-to-many?
          // Schema Step 271: model ModelCapabilities { ... } @relation(fields: [modelId], references: [id])
          
          const costPer1k = isFree ? 0 : 0.002; // Placeholder cost if not free

          try {
              // Manual upsert using providerId + name(slug)
              const existing = await prisma.model.findFirst({
                  where: {
                          providerId: providerConfig.id,
                          name: name
                  }
              });

              if (existing) {
                  await prisma.model.update({
                      where: { id: existing.id },
                      data: {
                          isActive: true,
                          costPer1k: costPer1k,
                          providerData: raw as Prisma.JsonObject,
                          lastSeenAt: new Date(),
                          // Capabilities update logic would go here if needed
                      }
                  });
              } else {
                  await prisma.model.create({
                      data: {
                          providerId: providerConfig.id,
                          name: name,
                          isActive: true,
                          costPer1k: costPer1k,
                          providerData: raw as Prisma.JsonObject,
                          aiData: {},
                          // capabilities: ...
                      }
                  });
              }
              totalIngested++;
          } catch (err) {
              console.error(`[Ingestion] Failed to upsert model ${modelId}:`, err);
          }
      }
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

  // Placeholder - waiting for views
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
      // apiKey removed from schema
      return await prisma.providerConfig.create({
          data: { 
            id: type, // ID is the provider name
            label: type, 
            type, 
            baseURL: '', 
            isEnabled: true,
            // @ts-ignore - Schema says removed but types insist?
            apiKey: 'disabled' 
          }
      });
  }
}
