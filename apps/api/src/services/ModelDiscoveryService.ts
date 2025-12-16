import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * ModelDiscoveryService
 * 
 * Implements the "Ghost Records" pattern for model discovery:
 * - Tracks models discovered during runtime (INFERENCE source)
 * - Marks stale models as inactive without deleting them
 * - Preserves manually added models (MANUAL source)
 */
export class ModelDiscoveryService {
  
  /**
   * Track a successful model inference
   * 
   * If a job completes successfully with a model that isn't in the DB,
   * or if we want to confirm a model is still working, call this.
   * 
   * @param providerId - The provider config ID
   * @param modelId - The model identifier (e.g., "gpt-4.5-preview")
   * @param modelName - Human-readable name (optional, defaults to modelId)
   * @param metadata - Optional metadata about the successful inference
   */
  static async trackSuccessfulInference(
    providerId: string,
    modelId: string,
    modelName?: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    const now = new Date();
    
    await prisma.model.upsert({
      where: { 
        providerId_modelId: { 
          providerId, 
          modelId 
        } 
      },
      update: { 
        lastSeenAt: now,
        isActive: true,
        // Update metadata if provided
        ...(metadata && {
          aiData: metadata as Prisma.JsonObject
        })
      },
      create: {
        providerId,
        modelId,
        name: modelName || modelId,
        source: 'INFERENCE', // <--- This marks it as a "Ghost" discovery
        firstSeenAt: now,
        lastSeenAt: now,
        isActive: true,
        providerData: { 
          note: "Auto-discovered during runtime",
          discoveredAt: now.toISOString()
        } as Prisma.JsonObject,
        specs: {
          contextWindow: 4096, // Safe default
          maxOutput: 4096,
          isMultimodal: false
        } as Prisma.JsonObject,
        ...(metadata && {
          aiData: metadata as Prisma.JsonObject
        })
      }
    });

    console.log(`✨ [ModelDiscovery] Tracked inference for ${providerId}/${modelId} (source: INFERENCE)`);
  }

  /**
   * Mark stale models as inactive
   * 
   * This is the "soft delete" mechanism. Instead of deleting models that
   * haven't been seen recently, we mark them as inactive. This protects
   * against provider API glitches that return empty model lists.
   * 
   * @param providerId - Optional: Only check models for this provider
   * @param staleThresholdHours - How many hours without being seen = stale (default: 24)
   * @returns Number of models marked as inactive
   */
  static async markStaleModelsInactive(
    providerId?: string,
    staleThresholdHours: number = 24
  ): Promise<number> {
    const staleThreshold = new Date();
    staleThreshold.setHours(staleThreshold.getHours() - staleThresholdHours);

    const result = await prisma.model.updateMany({
      where: {
        ...(providerId && { providerId }),
        lastSeenAt: {
          lt: staleThreshold
        },
        isActive: true, // Only mark currently active models
        // Don't mark MANUAL models as inactive - user added them explicitly
        source: {
          not: 'MANUAL'
        }
      },
      data: {
        isActive: false
      }
    });

    if (result.count > 0) {
      console.log(`⚠️  [ModelDiscovery] Marked ${result.count} stale models as inactive (not seen in ${staleThresholdHours}h)`);
    }

    return result.count;
  }

  /**
   * Reactivate a model (e.g., after user confirms it still works)
   * 
   * @param providerId - The provider config ID
   * @param modelId - The model identifier
   */
  static async reactivateModel(providerId: string, modelId: string): Promise<void> {
    const now = new Date();
    
    await prisma.model.update({
      where: {
        providerId_modelId: { providerId, modelId }
      },
      data: {
        isActive: true,
        lastSeenAt: now
      }
    });

    console.log(`✅ [ModelDiscovery] Reactivated ${providerId}/${modelId}`);
  }

  /**
   * Get statistics about model discovery sources
   * 
   * @returns Breakdown of models by source (INDEX, INFERENCE, MANUAL)
   */
  static async getDiscoveryStats(): Promise<{
    total: number;
    bySource: Record<string, number>;
    active: number;
    inactive: number;
  }> {
    const [total, bySource, active, inactive] = await Promise.all([
      prisma.model.count(),
      prisma.model.groupBy({
        by: ['source'],
        _count: true
      }),
      prisma.model.count({ where: { isActive: true } }),
      prisma.model.count({ where: { isActive: false } })
    ]);

    const sourceBreakdown: Record<string, number> = {};
    bySource.forEach(group => {
      sourceBreakdown[group.source] = group._count;
    });

    return {
      total,
      bySource: sourceBreakdown,
      active,
      inactive
    };
  }

  /**
   * List all inactive models (for review/cleanup)
   * 
   * @param limit - Maximum number of results
   */
  static async listInactiveModels(limit: number = 50) {
    return await prisma.model.findMany({
      where: {
        isActive: false
      },
      include: {
        provider: {
          select: {
            label: true,
            type: true
          }
        }
      },
      orderBy: {
        lastSeenAt: 'desc'
      },
      take: limit
    });
  }

  /**
   * Permanently delete inactive models older than a threshold
   * 
   * WARNING: This is destructive. Only use after confirming models are truly dead.
   * 
   * @param olderThanDays - Delete inactive models not seen in this many days
   * @returns Number of models deleted
   */
  static async deleteOldInactiveModels(olderThanDays: number = 30): Promise<number> {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - olderThanDays);

    const result = await prisma.model.deleteMany({
      where: {
        isActive: false,
        lastSeenAt: {
          lt: threshold
        },
        // Never auto-delete MANUAL models
        source: {
          not: 'MANUAL'
        }
      }
    });

    if (result.count > 0) {
      console.log(`🗑️  [ModelDiscovery] Permanently deleted ${result.count} inactive models (not seen in ${olderThanDays} days)`);
    }

    return result.count;
  }
}
