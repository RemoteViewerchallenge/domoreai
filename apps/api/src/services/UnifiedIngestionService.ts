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
          chunk: chunk
        }
      });
    }

    await vectorStore.add(vectors);
  }
  
  static async ingestAllModels(modelsDir?: string, force: boolean = false): Promise<void> {
    const targetDir = modelsDir || path.join(process.cwd(), 'latest_models');
    let files: string[] = [];
    try { files = await fs.readdir(targetDir); } catch { return; }

    console.log(`🚀 Starting Unified Ingestion...`);

    // PHASE 1: Raw Data Lake (Anti-Corruption)
    try {
        const { autoLoadRawJsonFiles } = await import('./RawJsonLoader.js');
        await autoLoadRawJsonFiles();
    } catch (err) {
        console.error('Phase 1 (Raw Data Lake) failed:', err);
    }
    
    // Check if we need to ingest (36h Cooldown)
    // NOTE: We only skip if we have models. If DB is empty, we must run.
    const lastUpdate = await prisma.model.findFirst({
        select: { updatedAt: true },
        orderBy: { updatedAt: 'desc' }
    });

    const thirtySixHoursAgo = new Date(Date.now() - 36 * 60 * 60 * 1000);
    
    if (!force && lastUpdate && lastUpdate.updatedAt > thirtySixHoursAgo) {
        console.log(`[UnifiedIngestionService] Skipping ingestion. Last update was ${lastUpdate.updatedAt.toISOString()} (within 36h).`);
        return;
    }

    console.log('[UnifiedIngestionService] Starting Smart Sync Ingestion...');
    
    // PHASE 2 & 3: Application Processing & Reconciliation
    let totalIngested = 0;
    const validModelIdsByProvider: Record<string, Set<string>> = {};

    // 1. Collect Valid Models from Raw Sources
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
        
      // Initialize Set for this provider if not exists
      if (!validModelIdsByProvider[provider]) validModelIdsByProvider[provider] = new Set();
      
      const uniqueModelMap = new Map<string, Record<string, unknown>>();
      for (const raw of rawModelList) {
          const modelIdRaw = this.resolvePath(raw, mapping.idPath);
          if (typeof modelIdRaw !== 'string' && typeof modelIdRaw !== 'number') continue;
          const modelId = String(modelIdRaw).trim();
          if (!modelId) continue;
          uniqueModelMap.set(modelId, raw);
      }

      const providerConfig = await this.ensureProviderConfig(provider);

      // Upsert Valid & Track
      for (const [modelId, raw] of uniqueModelMap.entries()) {
          const isFree = this.checkIsFree(provider, raw);

          // STRICT FILTER: OpenRouter (Must be truly free)
          // Other providers are Fail-Open (assumed free/valid if not explicitly paid)
          if (provider === 'openrouter' && !isFree) { continue; }

          // Track VALID Slug for Reconciliation
          validModelIdsByProvider[provider].add(modelId);

          // ALIGNMENT: Context Window
          const contextWindow = (this.resolvePath(raw, mapping.contextPath) as number) || 4096;
          const nameRaw = this.resolvePath(raw, mapping.namePath);
          const displayName = (typeof nameRaw === 'string' && nameRaw.length > 0) ? nameRaw : modelId;
          const slug = modelId; // DB 'name' column is the unique slug
          const cost = isFree ? 0 : 0.002; 
          
          try {
              // Upsert Model
              const model = await prisma.model.upsert({
                where: {
                  providerId_name: {
                    providerId: providerConfig.id,
                    name: slug
                  }
                },
                update: {
                  isActive: true,
                  costPer1k: cost,
                  providerData: { ...(raw as object), displayName } as Prisma.JsonObject,
                  lastSeenAt: new Date(), // Mark as seen now
                  updatedAt: new Date()
                },
                  create: {
                      providerId: providerConfig.id,
                      name: slug,
                      // displayName: displayName, // NOT IN SCHEMA
                      isActive: true,
                      costPer1k: cost,
                      providerData: { ...(raw as object), displayName } as Prisma.JsonObject,
                      aiData: {}
                  }
              });

              // Upsert Capabilities
              await prisma.modelCapabilities.upsert({
                  where: { modelId: model.id },
                  create: {
                      modelId: model.id,
                      contextWindow: contextWindow,
                      isMultimodal: JSON.stringify(raw).toLowerCase().includes('vision'),
                  },
                  update: {
                      contextWindow: contextWindow
                  }
              });
              
              totalIngested++;
          } catch (err) {
              console.error(`[Ingestion] Failed to upsert model ${modelId}:`, err);
          }
      }
    }

    // 2. RECONCILIATION: Delete/Archive models not in valid set
    console.log('[UnifiedIngestionService] Running Reconciliation (Diff Sync)...');
    
    // Iterate over known providers to clean up
    const providers = Object.keys(MAPPINGS);
    for (const provider of providers) {
        const validSlugs = validModelIdsByProvider[provider] || new Set();
        
        // Find DB Models for this provider
        // We use the slug (name column) for comparison
        const dbModels = await prisma.model.findMany({
            where: { providerId: provider },
            select: { id: true, name: true } 
        });

        const toRemove = dbModels.filter(m => !validSlugs.has(m.name));
        
        if (toRemove.length > 0) {
            console.log(`[UnifiedIngestionService] ${provider}: Found ${toRemove.length} obsolete/invalid models. Cleanup started.`);
            const idsToRemove = toRemove.map(m => m.id);
            
            // Delete Unused
            const deleted = await prisma.model.deleteMany({
                where: {
                    id: { in: idsToRemove },
                    modelUsage: { none: {} },
                    knowledgeVectors: { none: {} }
                }
            });
            console.log(`[UnifiedIngestionService] ${provider}: Hard Deleted ${deleted.count} unused models.`);
            
            // Deactivate Used but Obsolete
            const deactivated = await prisma.model.updateMany({
                where: {
                    id: { in: idsToRemove },
                    isActive: true
                },
                data: { isActive: false }
            });
            if (deactivated.count > 0) {
                 console.log(`[UnifiedIngestionService] ${provider}: Deactivated ${deactivated.count} used models.`);
            }
        }
    }

    console.log(`✅ Ingestion Complete. Total Valid Models: ${totalIngested}`);
  }

  // The Logic you specifically asked for
  private static checkIsFree(provider: string, raw: Record<string, unknown>): boolean {
      // 1. OpenRouter Policy: Strict Price Filter
      if (provider === 'openrouter') {
          const pricing = raw.pricing as Record<string, unknown> | undefined;
          if (!pricing) return false; // If no pricing info, assume paid/invalid
          
          const prompt = Number(pricing.prompt);
          const completion = Number(pricing.completion);
          
          // STRICT: Both must be exactly 0
          return prompt === 0 && completion === 0;
      }

      // 2. Everyone Else (Google, Groq, Ollama, Mistral): Assumed Free
      // We interpret "Free" as "Available to use without per-token charges in this context"
      // or simply complying with the user's request to treat them as free.
      return true;
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
      const existing = await prisma.providerConfig.findUnique({ where: { id: type } });
      if (existing) return existing;
      
      const likely = await prisma.providerConfig.findFirst({ where: { type } });
      if (likely) return likely;

      return await prisma.providerConfig.create({
          data: { 
            id: type, 
            label: type, 
            type, 
            baseURL: '', 
            isEnabled: true
          }
      });
  }
}
