import { prisma } from '../db.js';
import { BaseLLMProvider, LLMModel } from '../utils/BaseLLMProvider.js';
import { RawModelService } from './RawModelService.js';
import { flattenRawData } from './dataRefinement.service.js';
import { Prisma } from '@prisma/client';

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
        console.log('[RegistrySyncService] Starting Registry Sync (Unified)...');

        const syncedProviders = new Set<string>();
        const activeModelNamesByProvider = new Map<string, Set<string>>();

        for (const [providerId] of providers.entries()) {
            syncedProviders.add(providerId);
            activeModelNamesByProvider.set(providerId, new Set());

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

                // Flatten data
                await this.flattenSnapshot(snapshot.id, providerType, models as RawSnapshotData[]);

                let modelsToSync = models;

                // Filter OpenRouter for free models
                // [REFAC] Using proper typing instead of 'any'
                if (providerType === 'openrouter') {
                    modelsToSync = models.filter(m => {
                        const modelWithPricing = m as RawModelWithPricing;
                        const p = modelWithPricing.pricing;
                        
                        if (!p) return false; // If no pricing info, assume not free? Or strictly check? logic said: isFreePrompt && isFreeComp
                        
                        // Some providers might return strings "0" or numbers 0
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

                // Use a Map keyed by the FINAL DATABASE NAME (mId) to prevent unique constraint errors
                const uniqueModels = new Map<string, RawSnapshotData>();
                modelsToSync.forEach(m => {
                    const mId = (m.id || m.model || m.name) as string;
                    if (mId) {
                        uniqueModels.set(mId, m as RawSnapshotData);
                        activeModelNamesByProvider.get(providerId)?.add(mId);
                    }
                });

                console.log(`[Registry Sync] Upserting ${uniqueModels.size} models for ${providerLabel}...`);

                for (const m of uniqueModels.values()) {
                    // Defensive: Extract model ID from various possible fields
                    const modelId = (m.id || m.model || m.name) as string;
                    if (!modelId) {
                        console.warn(`[Registry Sync] Skipping model with no ID:`, m);
                        continue;
                    }

                    const cost = m.costPer1k;

                    try {
                        await prisma.model.upsert({
                            where: {
                                providerId_name: {
                                    providerId: providerId,
                                    name: modelId // Use STABLE id for search
                                }
                            },
                            create: {
                                providerId: providerId,
                                name: modelId, // Use SAME stable id for creation
                                costPer1k: cost || 0,
                                providerData: m as unknown as Prisma.InputJsonValue,
                                aiData: {}
                            },
                            update: {
                                isActive: true,
                                costPer1k: cost || 0,
                                providerData: m as unknown as Prisma.InputJsonValue,
                                lastSeenAt: new Date()
                            }
                        });
                    } catch (upsertError) {
                        console.error(`[Registry Sync] Individual Upsert Failed for ${providerLabel} - ${modelId}:`, upsertError);
                    }
                }

            } catch (error) {
                const meta = providerMetadata.get(providerId);
                const providerLabel = meta?.label || providerId;
                console.error(`[Registry Sync] Batch Sync Failed for provider ${providerLabel}:`, error);
            }
        }

        await this.cleanupGhostRecords(syncedProviders, activeModelNamesByProvider);

        console.log('[RegistrySyncService] Registry Sync Completed.');
    }

    private static async flattenSnapshot(snapshotId: string, providerType: string, models: RawSnapshotData[]) {
        try {
            const tableName = `${providerType}_models`;
            console.log(`[RegistrySyncService] 🔨 Flattening data into table: ${tableName}...`);
            const result = await flattenRawData({ snapshotId, tableName, rawData: models });
            console.log(`[RegistrySyncService] ✅ Created dynamic table ${result.tableName} with ${result.rowCount} rows.`);
        } catch (error) {
            console.error(`[RegistrySyncService] ❌ Failed to snapshot/flatten data for ${providerType}:`, error);
        }
    }

    private static async cleanupGhostRecords(syncedProviders: Set<string>, activeModelNamesByProvider: Map<string, Set<string>>) {
        console.log('[RegistrySyncService] Starting Cleanup of Ghost Records...');

        const activeProviderIds = Array.from(syncedProviders);
        if (activeProviderIds.length > 0) {
            const deletedProviders = await prisma.model.deleteMany({
                where: {
                    providerId: { notIn: activeProviderIds }
                }
            });
            if (deletedProviders.count > 0) {
                console.log(`[RegistrySyncService] 🧹 Deleted ${deletedProviders.count} models from inactive/removed providers.`);
            }
        }

        for (const [providerId, seenNames] of activeModelNamesByProvider.entries()) {
            const seenList = Array.from(seenNames);
            if (seenList.length > 0) {
                const deletedOrphans = await prisma.model.deleteMany({
                    where: {
                        providerId: providerId,
                        name: { notIn: seenList }
                    }
                });
                if (deletedOrphans.count > 0) {
                    console.log(`[RegistrySyncService] 🧹 Deleted ${deletedOrphans.count} orphaned models for ${providerId}.`);
                }
            }
        }
    }
}
