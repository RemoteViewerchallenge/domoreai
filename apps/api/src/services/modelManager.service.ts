import { PrismaClient, Prisma } from '@prisma/client';
import { DEFAULT_MODEL_TEMP, DEFAULT_MAX_TOKENS, DEFAULT_MODEL_TAKE_LIMIT } from '../config/constants.js';

// Define a basic interface for the expected data structure.
interface RawProviderOutput {
  modelId: string;
  roleId: string;
  userId: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
  };
  cost?: number;
  [key: string]: unknown; // Using unknown instead of any
}

// Define interface for ModelSelectionResult
export interface ModelSelectionResult {
  modelId: string;
  providerId: string;
  model: unknown; // Using unknown as it could be a Prisma model or a mocked object
  temperature: number;
  maxTokens: number;
}

// This would be your singleton Prisma client, passed in or imported
const prisma = new PrismaClient();

/**
 * This function is the solution to the "messy data" problem.
 * It uses the "rest" operator to catch all unknown fields.
 */
export async function logUsage(data: RawProviderOutput) {
  // 1. Destructure the *known* fields and capture the "rest"
  const {
    modelId,
    roleId,
    userId, // Extract but don't save to DB as column is missing
    usage,
    cost,
    ...metadata 
  } = data;

  // 2. Map the data to the flexible Prisma schema
  try {
    const newLog = await prisma.modelUsage.create({
      data: {
        // userId: userId, // Column missing
        modelId, 
        roleId, 

        promptTokens: usage?.prompt_tokens ?? null,
        completionTokens: usage?.completion_tokens ?? null,

        cost: cost ?? 0.0,

        metadata: { ...metadata, userId } as Prisma.InputJsonValue, // Store userId in metadata
      },
    });
    console.log('Usage log created:', newLog.id);
    return newLog;
  } catch (error) {
    console.error('Failed to log model usage:', error);
  }
}

/**
 * Selects a model from the model_registry based on Role criteria.
 */
export async function selectModelFromRegistry(roleId: string, failedModels: string[] = [], failedProviders: string[] = []) {
  try {
    const role = await prisma.role.findUnique({
      where: { id: roleId }
    });

    if (!role) {
      console.warn(`Role ${roleId} not found`);
      return null;
    }

    const metadata = {}; // (role.metadata as any) || {};
    const _capabilities = ((metadata as Record<string, any>).capabilities as string[]) || [];

    const whereClause: Prisma.ModelWhereInput = {
      isActive: true,
      provider: {
        isEnabled: true
      },
      NOT: [
        ...(failedModels.length > 0 ? [{ id: { in: failedModels } }] : []), // modelId -> id
        ...(failedProviders.length > 0 ? [{ providerId: { in: failedProviders } }] : []),
        { name: { contains: 'embed', mode: 'insensitive' } } // name checked only
      ]
    };

    // Note: capabilityTags not in schema, ignoring filter or need logic update
    // if (capabilities.length > 0) ...

    const candidates = await prisma.model.findMany({
      where: whereClause,
      include: {
        provider: true
      },
      orderBy: [
        { lastSeenAt: 'desc' }, 
      ],
      take: DEFAULT_MODEL_TAKE_LIMIT 
    });

    if (candidates.length === 0) {
      console.warn(`No active models found for role ${roleId}`);
      return null;
    }

    // Intelligent Selection: Provider LRU -> Model LRU
    
    // 1. Fetch usage stats
    const candidateIds = candidates.map(c => c.id);
    const usageStats = await prisma.modelUsage.groupBy({
        by: ['modelId'],
        where: { modelId: { in: candidateIds } },
        _max: { createdAt: true }
    });

    // 2. Map model usages
    const modelUsageMap = new Map<string, number>();
    usageStats.forEach(stat => {
        if (stat.modelId && stat._max.createdAt) {
            modelUsageMap.set(stat.modelId, stat._max.createdAt.getTime());
        }
    });

    // 3. Compute Provider Usage (Max timestamp of any model in that provider)
    const providerUsageMap = new Map<string, number>();
    for (const c of candidates) {
        const mTime = modelUsageMap.get(c.id) || 0;
        const pTime = providerUsageMap.get(c.providerId) || 0;
        if (mTime > pTime) { // We want the *latest* usage to represent the provider's "freshness"
            providerUsageMap.set(c.providerId, mTime);
        }
    }

    // 4. Sort Candidates
    candidates.sort((a, b) => {
        const pTimeA = providerUsageMap.get(a.providerId) || 0;
        const pTimeB = providerUsageMap.get(b.providerId) || 0;

        // Primary Sort: Provider Usage (Oldest first)
        if (pTimeA !== pTimeB) {
            return pTimeA - pTimeB;
        }

        // Secondary Sort: Model Usage (Oldest first)
        const mTimeA = modelUsageMap.get(a.id) || 0;
        const mTimeB = modelUsageMap.get(b.id) || 0;
        return mTimeA - mTimeB;
    });

    // 5. Select Winner
    const selected = candidates[0];
    const isFree = (selected.costPer1k === 0);

    console.log(`✅ Selected model: ${selected.provider.label}/${selected.name} (free: ${isFree})`);

    // Use external ID from providerData, fallback to name, never usage internal CUID
    const externalId = (selected.providerData as unknown as { id?: string })?.id || selected.name;

    return {
      modelId: externalId, 
      internalId: selected.id,
      providerId: selected.providerId,
      name: selected.name,
      isFree: isFree,
      source: 'registry', 
      provider: selected.provider,
      specs: {},
    };
  } catch (error) {
    console.error('Failed to select model from registry:', error);
    return null;
  }
}

export async function getBestModel(roleId?: string, failedModels: string[] = [], failedProviders: string[] = []): Promise<ModelSelectionResult | null> {
  if (!roleId) {
    const fallback = await prisma.model.findFirst({
      where: { provider: { isEnabled: true } },
      include: { provider: true },
    });
    if (!fallback) return null;
    
    const externalId = (fallback.providerData as unknown as { id?: string })?.id || fallback.name;
    
    return {
      modelId: externalId,
      providerId: fallback.providerId,
      model: fallback,
      temperature: DEFAULT_MODEL_TEMP,
      maxTokens: DEFAULT_MAX_TOKENS,
    };
  }

  try {
    const dynamicModel = await selectModelFromRegistry(roleId, failedModels, failedProviders);
    
    if (dynamicModel) {      
        return {        
            modelId: dynamicModel.modelId,
            providerId: dynamicModel.providerId,
            model: dynamicModel, // Passing the shape we constructed
            temperature: DEFAULT_MODEL_TEMP,
            maxTokens: DEFAULT_MAX_TOKENS
        };
    }
  } catch (e: unknown) {
    console.warn("Dynamic selection failed:", e);
  }

  const fallbackModel = await prisma.model.findFirst({
      where: { provider: { isEnabled: true } },
      include: { provider: true }
  });

  if (fallbackModel) {
      const externalId = (fallbackModel.providerData as unknown as { id?: string })?.id || fallbackModel.name;
      return {
          modelId: externalId,
          providerId: fallbackModel.providerId,
          model: fallbackModel,
          temperature: DEFAULT_MODEL_TEMP,
          maxTokens: DEFAULT_MAX_TOKENS
      };
  }

  throw new Error(`No models available for role ${roleId}`);
}

// Failure helpers

/**
 * Increment persistent failure counts for a model (used to avoid retries across restarts)
 */
export async function recordModelFailure(providerId: string, modelId: string, _roleId?: string) {
  try {
    // Manual upsert to avoid type issues with unique constraints
    const existing = await prisma.modelFailure.findFirst({
        where: { providerId, modelId }
    });

    if (existing) {
        await prisma.modelFailure.update({
            where: { id: existing.id },
            data: { failures: { increment: 1 } }
        });
    } else {
        await prisma.modelFailure.create({
            data: { providerId, modelId, failures: 1 }
        });
    }
    console.log(`[Model Failure] Recorded failure for ${modelId} on ${providerId}`);
  } catch (err) {
    console.warn('[Model Failure] Failed to record model failure:', err);
  }
}

export function recordProviderFailure(_providerId: string, _roleId?: string) {
  // ProviderFailure table does not exist in schema.
  // Skipping recording.
  console.warn(`[Provider Failure] Skipping record for provider ${_providerId} (schema table missing)`);
}
