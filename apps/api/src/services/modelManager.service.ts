import { PrismaClient } from '@prisma/client';
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

        metadata: { ...metadata, userId } as any, // Store userId in metadata
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
    const capabilities = (metadata as any).capabilities || [];

    const whereClause: any = {
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

    const selected = candidates[Math.floor(Math.random() * candidates.length)];
    const isFree = (selected.costPer1k === 0);

    console.log(`✅ Selected model: ${selected.provider.label}/${selected.name} (free: ${isFree})`);

    return {
      modelId: selected.id, // Map id -> modelId
      internalId: selected.id,
      providerId: selected.providerId,
      name: selected.name,
      isFree: isFree,
      source: 'registry', 
      provider: selected.provider,
      specs: {}, // Capabilities in relation, fetch if needed
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
    return {
      modelId: fallback.id,
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
      return {
          modelId: fallbackModel.id,
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
export async function recordModelFailure(providerId: string, modelId: string, roleId?: string) {
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

export async function recordProviderFailure(providerId: string, roleId?: string) {
  // ProviderFailure table does not exist in schema.
  // Skipping recording.
  console.warn(`[Provider Failure] Skipping record for provider ${providerId} (schema table missing)`);
}
