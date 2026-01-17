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

// Interface for model specs to avoid 'any'
interface ModelSpecs {
    context_window?: number;
    max_context_length?: number;
    embedding_length?: number;
    [key: string]: unknown;
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
                        const modelRecord = await prisma.model.upsert({
                            where: { id: stableId },
                            create: {
                                id: stableId,
                                providerId: providerId,
                                name: rawName,
                                costPer1k: cost || 0,
                                providerData: providerData,
                                aiData: {}, 
                                isActive: true
                            },
                            update: {
                                isActive: true,
                                costPer1k: cost || 0,
                                providerData: providerData, 
                                lastSeenAt: new Date()
                            },
                            include: { provider: true }
                        });

                        // [NATIVE SURVEY] Proactively identify capabilities if new or changed
                        const { Surveyor } = await import('./Surveyor.js');
                        await Surveyor.surveyModel(modelRecord);

                        // [LEGACY SPECIALIZATION] Keep for backward compat with specialized tables
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

        await this.cleanupGhostRecords(Array.from(activeModelIds), Array.from(syncedProviders));

        console.log('[RegistrySyncService] Registry Sync Completed.');
    }

    private static calculateChecksum(data: Prisma.InputJsonValue): string {
        return crypto.createHash('md5').update(JSON.stringify(data)).digest('hex');
    }

    public static async populateSpecializedTables(modelId: string, modelName: string, rawData: RawSnapshotData) {
        const lowerName = modelName.toLowerCase();
        // console.log(`[Specialization] Checking ${modelId} (${lowerName}) for detailed capabilities...`);

        // 1. Chat
        // Most models are chat models unless explicitly specialized
        const isNotChat = lowerName.includes('embed') || 
                         lowerName.includes('reward') || 
                         lowerName.includes('moderation') || 
                         lowerName.includes('whisper') ||
                         lowerName.includes('tts-');

        if (!isNotChat) {
            const specs = rawData as unknown as ModelSpecs;
            await prisma.chatModel.upsert({
                where: { modelId: modelId },
                create: { 
                    modelId: modelId, 
                    contextWindow: specs.context_window || specs.max_context_length || 4096 
                },
                update: {
                    contextWindow: specs.context_window || specs.max_context_length || 4096
                }
            });
        }

        // 2. Embedding
        if (lowerName.includes('embed')) {
            console.log(`[Specialization] MATCH EMBEDDING: ${modelId}`);
            const specs = rawData as unknown as ModelSpecs;
            await prisma.embeddingModel.upsert({
                where: { modelId: modelId },
                create: { modelId: modelId, dimensions: specs.embedding_length || 1536 },
                update: {} // Don't overwrite if exists
            });
        }

        // 3. Vision
        if (lowerName.includes('vision') || lowerName.includes('pixtral') || lowerName.includes('vl') || lowerName.includes('omni')) {
            await prisma.visionModel.upsert({
                where: { modelId: modelId },
                create: { modelId: modelId },
                update: {}
            });
        }

        // 4. Audio / TTS
        if (lowerName.includes('tts') || lowerName.includes('speech') || lowerName.includes('audio') || lowerName.includes('whisper') || lowerName.includes('voxtral') || lowerName.includes('orpheus')) {
             console.log(`[Specialization] MATCH AUDIO: ${modelId}`);
             await prisma.audioModel.upsert({
                where: { modelId: modelId },
                create: { modelId: modelId },
                update: {}
            });
        }

        // 4.5 Image
        if (lowerName.includes('image') || lowerName.includes('flux') || lowerName.includes('stable-diffusion') || lowerName.includes('dall-e')) {
            await prisma.imageModel.upsert({
                where: { modelId: modelId },
                create: { modelId: modelId },
                update: {}
            });
        }

        // 5. Compliance / Safety
        if (lowerName.includes('moderation') || lowerName.includes('guard') || lowerName.includes('shield')) {
            await prisma.complianceModel.upsert({
                where: { modelId: modelId },
                create: { modelId: modelId },
                update: {}
            });
        }

        // 6. Reward
        if (lowerName.includes('reward')) {
            await prisma.rewardModel.upsert({
                where: { modelId: modelId },
                create: { modelId: modelId },
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

    private static async cleanupGhostRecords(activeIds: string[], syncedProviderIds: string[]) {
        try {
            // [FAIL OPEN] We only mark as offline if we actually successfully synced some providers.
            if (activeIds.length === 0 || syncedProviderIds.length === 0) return;

            console.log(`[RegistrySyncService] Marking Ghost Records as Offline for ${syncedProviderIds.length} synced providers...`);
            
            const result = await prisma.model.updateMany({
                where: {
                    providerId: { in: syncedProviderIds },
                    id: { notIn: activeIds },
                    isActive: true 
                },
                data: {
                    isActive: false
                }
            });

            if (result.count > 0) {
                console.log(`[RegistrySyncService] 💤 Marked ${result.count} models as Offline (Ghosts).`);
            }
        } catch (error) {
            console.warn('[RegistrySyncService] ⚠️ Ghost cleanup failed (non-critical).', error);
        }
    }
}
