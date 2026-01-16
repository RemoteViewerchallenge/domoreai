import { prisma } from '../db.js';
import { BaseLLMProvider, LLMModel } from '../utils/BaseLLMProvider.js';
import { RawModelService } from './RawModelService.js';
import { flattenRawData } from './dataRefinement.service.js';
import { Prisma } from '@prisma/client';
import crypto from 'crypto';

interface RawSnapshotData extends LLMModel {
    [key: string]: unknown;
}

interface ProviderMetadata {
    label: string;
    type: string;
}

// Interface for pricing structure to avoid 'any'
interface ModelPricing {
    prompt?: string | number;
    completion?: string | number;
}

interface RawModelWithPricing extends LLMModel {
    pricing?: ModelPricing;
}

export class RegistrySyncService {
    
    /**
     * Syncs models from all active providers to the registry.
     */
    static async syncModels(
        providers: Map<string, BaseLLMProvider>,
        providerMetadata: Map<string, ProviderMetadata>
    ) {
        console.log('[RegistrySyncService] Starting Smart Registry Sync...');

        const syncedProviders = new Set<string>();
        const activeModelIds = new Set<string>();

        for (const [providerId] of providers.entries()) {
            syncedProviders.add(providerId);

            try {
                // 1. Get readable name for logs
                const meta = providerMetadata.get(providerId);
                const providerLabel = meta?.label || providerId;
                const providerType = meta?.type || 'unknown';

                // --- UNIFIED FETCH LOGIC ---
                console.log(`[RegistrySyncService] Fetching models for ${providerLabel}...`);
                
                const snapshot = await RawModelService.fetchAndSnapshot(providerId);

                if (!snapshot || !Array.isArray(snapshot.rawData)) {
                    console.error(`[RegistrySyncService] Failed to get a valid snapshot for ${providerLabel}.`);
                    continue;
                }
                const models = snapshot.rawData as LLMModel[];
                console.log(`[RegistrySyncService] Got ${models.length} models from ${providerLabel}.`);

                // Flatten data (Legacy support, maybe optional now?)
                await this.flattenSnapshot(snapshot.id, providerType, models as RawSnapshotData[]);

                let modelsToSync = models;

                // Filter OpenRouter for free models
                if (providerType === 'openrouter') {
                    modelsToSync = models.filter(m => {
                        const modelWithPricing = m as RawModelWithPricing;
                        const p = modelWithPricing.pricing;
                        if (!p) return false; 
                        const isFreePrompt = p.prompt === '0' || p.prompt === 0;
                        const isFreeComp = p.completion === '0' || p.completion === 0;
                        return isFreePrompt && isFreeComp;
                    });
                    console.log(`[RegistrySyncService] Filtered OpenRouter models: ${models.length} -> ${modelsToSync.length} (Free Only)`);
                }

                if (modelsToSync.length === 0) {
                    console.warn(`[RegistrySyncService] No models to sync for ${providerLabel} after filtering`);
                    continue; 
                }

                console.log(`[Registry Sync] Upserting ${modelsToSync.length} models for ${providerLabel}...`);

                for (const m of modelsToSync) {
                    // Defensive: Extract model name
                    const rawName = (m.id || m.model || m.name) as string;
                    if (!rawName) {
                        console.warn(`[Registry Sync] Skipping model with no Name/ID:`, m);
                        continue;
                    }

                    // [READABLE ID] Construct deterministic ID: provider:model
                    const stableId = `${providerId}:${rawName}`;
                    activeModelIds.add(stableId);

                    const cost = m.costPer1k;
                    const providerData = m as unknown as Prisma.InputJsonValue;
                    
                    // [DIFF-BASED UPDATE] Calculate checksum
                    const currentChecksum = this.calculateChecksum(providerData);

                    try {
                        const existing = await prisma.model.findUnique({
                            where: { id: stableId },
                            select: { providerData: true, capabilities: { select: { source: true, confidence: true } } }
                        });

                        if (existing) {
                            // Check diff
                            const existingChecksum = this.calculateChecksum(existing.providerData as Prisma.InputJsonValue);
                            
                            if (existingChecksum === currentChecksum) {
                                // No change in provider data. Ensure it's active and update seen time.
                                // Do NOT touch aiData or Capabilities.
                                await prisma.model.update({
                                    where: { id: stableId },
                                    data: { 
                                        isActive: true, 
                                        lastSeenAt: new Date() 
                                    }
                                });
                                // console.log(`[Registry Sync] Skipped update for ${stableId} (No Change)`);
                                continue;
                            } else {
                                console.log(`[Registry Sync] Detected Data Change for ${stableId}. Updating providerData...`);
                            }
                        }

                        // Upsert Logic (New or Changed)
                        // Note: Prisma update will only touch specified fields.
                        await prisma.model.upsert({
                            where: { id: stableId },
                            create: {
                                id: stableId,
                                providerId: providerId,
                                name: rawName,
                                costPer1k: cost || 0,
                                providerData: providerData,
                                aiData: {}, // Empty for new
                                isActive: true
                            },
                            update: {
                                isActive: true,
                                costPer1k: cost || 0,
                                providerData: providerData, // Update source truth
                                lastSeenAt: new Date()
                                // aiData and capabilities are implicitly preserved by NOT being here
                            }
                        });

                        // [SPECIALIZATION] Populate Specialized Tables
                        await this.populateSpecializedTables(stableId, rawName, m);

                    } catch (upsertError) {
                        console.error(`[Registry Sync] Individual Upsert Failed for ${stableId}:`, upsertError);
                    }
                }

            } catch (error) {
                const meta = providerMetadata.get(providerId);
                const providerLabel = meta?.label || providerId;
                console.error(`[Registry Sync] Batch Sync Failed for provider ${providerLabel}:`, error);
            }
        }

        await this.cleanupGhostRecords(Array.from(activeModelIds));

        console.log('[RegistrySyncService] Registry Sync Completed.');
    }

    private static calculateChecksum(data: Prisma.InputJsonValue): string {
        return crypto.createHash('md5').update(JSON.stringify(data)).digest('hex');
    }

    public static async populateSpecializedTables(modelId: string, modelName: string, rawData: RawSnapshotData) {
        const lowerName = modelName.toLowerCase();
        let matchFound = false;
        // console.log(`[Specialization] Checking ${modelId} (${lowerName}) for detailed capabilities...`);

        // 1. Embedding
        if (lowerName.includes('embed')) {
            console.log(`[Specialization] MATCH EMBEDDING: ${modelId}`);
            await prisma.embeddingModel.upsert({
                where: { modelId: modelId },
                create: { modelId: modelId, dimensions: (rawData as any).embedding_length || 1536 },
                update: {} // Don't overwrite if exists
            });
            matchFound = true;
        }

        // 2. Audio / TTS
        if (lowerName.includes('tts') || lowerName.includes('speech') || lowerName.includes('audio')) {
             console.log(`[Specialization] MATCH AUDIO: ${modelId}`);
             await prisma.audioModel.upsert({
                where: { modelId: modelId },
                create: { modelId: modelId },
                update: {}
            });
            matchFound = true;
        }

        // [NEW] Unknown Model Fallback
        if (!matchFound) {
             console.log(`[Specialization] UNKNOWN: ${modelId} (No specialized traits found). Adding to UnknownModel.`);
             await prisma.unknownModel.upsert({
                 where: { modelId: modelId },
                 create: { modelId: modelId, reason: 'uncategorized' },
                 update: {}
             });
        }
    }

    private static async flattenSnapshot(snapshotId: string, providerType: string, models: RawSnapshotData[]) {
        try {
            const tableName = `${providerType}_models`;
            // console.log(`[RegistrySyncService] 🔨 Flattening data into table: ${tableName}...`);
            await flattenRawData({ snapshotId, tableName, rawData: models });
        } catch (error) {
            console.error(`[RegistrySyncService] ❌ Failed to snapshot/flatten data for ${providerType}:`, error);
        }
    }

    private static async cleanupGhostRecords(activeIds: string[]) {
        // [FAIL OPEN] We do NOT delete models immediately. We mark them as offline.
        // We only touch models that were NOT in the activeIds list but ARE in the DB for known providers.
        // Since we don't know "known providers" easily without the map, we'll simple set all "not seen" to inactive.
        
        if (activeIds.length === 0) return;

        console.log('[RegistrySyncService] Marking Ghost Records as Offline...');
        
        const result = await prisma.model.updateMany({
            where: {
                id: { notIn: activeIds },
                isActive: true // Only update if currently active
            },
            data: {
                isActive: false
            }
        });

        if (result.count > 0) {
            console.log(`[RegistrySyncService] 💤 Marked ${result.count} models as Offline (Ghosts).`);
        }
    }
}
