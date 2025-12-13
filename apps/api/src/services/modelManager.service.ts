import { PrismaClient } from '@prisma/client';
// import type { RawProviderOutput } from './modelManager.mocks.ts';

// Define a basic interface for the expected data structure.
interface RawProviderOutput {
  modelConfigId: string;
  roleId: string;
  userId: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
  };
  cost?: number;
  [key: string]: any; // Allow for other unknown properties
}

// This would be your singleton Prisma client, passed in or imported
const prisma = new PrismaClient();

/**
 * The "Metadata Parsing" function.
 * This function is the solution to the "messy data" problem.
 * It uses the "rest" operator to catch all unknown fields.
 */
export async function logUsage(data: RawProviderOutput) {
  // 1. Destructure the *known* fields and capture the "rest"
  const {
    modelConfigId,
    roleId,
    userId,
    usage,
    cost,
    ...metadata // This catches `router_metadata` or any other unknown fields
  } = data;

  // 2. Map the data to the flexible Prisma schema
  try {
    const newLog = await prisma.modelUsage.create({
      data: {
        userId,
        modelConfigId, // Relation to ModelConfig
        roleId,          // Relation to Role

        // Handle null usage from free providers
        promptTokens: usage?.prompt_tokens ?? null,
        completionTokens: usage?.completion_tokens ?? null,

        // Handle null cost
        cost: cost ?? 0.0,

        // This is the "escape hatch."
        // All leftover fields are stored in the Json blob.
        metadata: metadata,
      },
    });
    console.log('Usage log created:', newLog.id);
    return newLog;
  } catch (error) {
    console.error('Failed to log model usage:', error);
    // Handle specific Prisma errors if needed
  }
}

/**
 * The "Brain" for model selection.
 * Finds the best, non-rate-limited model for a given role.
 */
/**
 * Selects a model from the ACTIVE REGISTRY based on Role criteria.
 * Supports "Exhaustive Fallback" by excluding failed models (not providers).
 * This allows other models from the same provider to remain active.
 */
import fs from 'fs';
import path from 'path';

// Helper to load models from JSON at runtime
function loadModelsFromJson() {
  // Use import.meta.url for ESM compatibility
  const url = new URL('../../latest_models/models.json', import.meta.url);
  try {
    const raw = fs.readFileSync(url, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load models from JSON:', e);
    return [];
  }
}

export async function selectModelFromRegistry(roleId: string, failedModels: string[] = [], failedProviders: string[] = []) {
  // Load models from JSON instead of DB
  const allModels = loadModelsFromJson();
  // Exclude failed models/providers
  const candidates = allModels.filter(m =>
    (!failedModels.includes(m.model_id || m.modelId || m.id)) &&
    (!failedProviders.includes(m.provider || m.providerId))
  );
  if (candidates.length === 0) return null;
  // Pick random for load balancing
  const selected = candidates[Math.floor(Math.random() * candidates.length)];
  return {
    modelId: selected.model_id || selected.modelId || selected.id,
    internalId: selected.id || selected.model_id || selected.modelId,
    providerId: selected.provider || selected.providerId,
    ...selected
  };
}

/**
 * The "Brain" for model selection.
 * Finds the best, non-rate-limited model for a given role.
 * UPDATED: Uses Dynamic Registry first, falls back to legacy preferredModels.
 */
export async function getBestModel(roleId?: string, failedModels: string[] = [], failedProviders: string[] = []) {
  // If a roleId wasn't provided, fall back to selecting any enabled model.
  if (!roleId) {
    const fallback = await prisma.model.findFirst({
      where: { provider: { isEnabled: true } },
      include: { provider: true },
    });
    if (!fallback) return null;
    return {
      modelId: fallback.modelId,
      providerId: fallback.providerId,
      model: fallback,
      temperature: 0.7,
      maxTokens: 2048,
    } as any;
  }

  // --- HARDCODED OVERRIDE ---
  // First, check if the role has a specific model assigned to it.
  // This bypasses all dynamic selection logic.
  const roleWithOverride = await prisma.role.findUnique({
    where: { id: roleId },
    select: { hardcodedModelId: true, hardcodedProviderId: true }
  });

  if (roleWithOverride?.hardcodedModelId && roleWithOverride.hardcodedProviderId) {
    const { hardcodedModelId, hardcodedProviderId } = roleWithOverride;
    console.log(`[Model Selection] ✅ Using hardcoded override for role ${roleId}: ${hardcodedModelId} from ${hardcodedProviderId}`);
    
    // Return the model in the format AgentFactory expects.
    // This structure ensures compatibility with the rest of the system.
    return {
      modelId: hardcodedModelId,
      providerId: hardcodedProviderId,
      model: {
        id: hardcodedModelId,
        providerId: hardcodedProviderId,
        provider: {
          id: hardcodedProviderId,
          type: hardcodedProviderId.split('-')[0] || 'unknown' // Infer type from ID
        }
      },
      temperature: 0.7, // Default values
      maxTokens: 4096   // Default values
    };
  }

  // 1. Try Dynamic Registry
  try {
    const dynamicModel = await selectModelFromRegistry(roleId, failedModels, failedProviders);
    if (dynamicModel) {      
      // We need to return it in a format compatible with the rest of the system.
      // The system expects a ModelConfig-like object with a nested 'model' and 'provider'.
      // Since we are bypassing the strict Prisma relations, we might need to mock that structure 
      // OR update the caller to handle raw objects.
      
      // Let's check if this provider/model exists in our strict DB to return a proper object
      const strictModel = await prisma.model.findUnique({
        where: { providerId_modelId: { providerId: dynamicModel.providerId as string, modelId: dynamicModel.modelId as string } },
        include: { provider: true }
      });

      if (strictModel) {
        return {
          modelId: strictModel.modelId,
          providerId: strictModel.providerId,
          model: strictModel,
          // Mock config values
          temperature: 0.7,
          maxTokens: 2048
        };
      }
      
      // If not in strict DB, we might be in "SimpleDB" mode or using a raw table.
      // We'll return a constructed object and hope the caller (AgentFactory) can handle it.
      // AgentFactory looks up the provider via ProviderManager, so as long as providerId is valid, we are good.
      return {        
        modelId: dynamicModel.modelId,
        providerId: dynamicModel.providerId,
        model: {
            id: dynamicModel.modelId,
            providerId: dynamicModel.providerId,
            provider: { id: dynamicModel.providerId, type: (dynamicModel.providerId as string)?.split('-')[0] || 'unknown' } // Mock provider
        },
        temperature: 0.7,
        maxTokens: 2048
      };
    }
  } catch (e: unknown) {
    console.warn("Dynamic selection failed, falling back to legacy:", e);
  }

  // Exported helper: record a failure for a model

// Failure helpers (moved to file bottom to avoid being inside getBestModel)

  // 2. Legacy Fallback (Original Logic)
  const role = await prisma.role.findUnique({
    where: { id: roleId },
    include: {
      preferredModels: {
        include: {
          model: { // Include the Model relation
            include: {
              provider: true // Then include the Provider through the Model
            }
          }
        }
      }
    },
  });

  if (!role) {
    throw new Error(`Role not found: ${roleId}`);
  }

  if (!role.preferredModels || role.preferredModels.length === 0) {
    // If dynamic failed AND legacy failed, we are truly out of options
    throw new Error(`Role has no preferred models and no dynamic matches found: ${roleId}`);
  }

  const oneMinuteAgo = new Date(Date.now() - 60000);

  // Go through preferred models and find the first one that isn't rate-limited
  for (const modelConfig of role.preferredModels) {
    const provider = modelConfig.model.provider; // Access provider through model
    const modelId = modelConfig.model.modelId;
    
    // Skip failed models (Circuit Breaker Fix)
    if (failedModels.includes(modelId)) continue;

    // If provider has no rate limit defined, it's good to go
    const rpm = provider.requestsPerMinute ?? Infinity;

    // If provider declares no RPM limit in DB, treat as unlimited and pick it
    if (rpm === Infinity) {
      return modelConfig;
    }

    // Check usage in the last minute
    const usageCount = await prisma.modelUsage.count({
      where: {
        modelConfig: { // Filter through modelConfig
          model: { // Then through model
            providerId: provider.id
          }
        },
        createdAt: { gte: oneMinuteAgo }, // Use createdAt instead of timestamp
      },
    });

    // If usage is *under* the limit, this model is available
    if (usageCount < rpm) {
      return modelConfig; // This is a valid model
    }
  }

  // If we looped through all models and all are rate-limited
  throw new Error(`All preferred models for role ${role.name} are rate-limited or failed.`);
}

/**
 * Increment persistent failure counts for a model (used to avoid retries across restarts)
 */
export async function recordModelFailure(providerId: string, modelId: string, roleId?: string) {
  try {
    // Use role-scoped unique constraint; roleId may be undefined/null to record global failure
    await prisma.modelFailure.upsert({
      where: { providerId_modelId_roleId: { providerId, modelId, roleId: (roleId ?? null) as string } },
      update: { failures: { increment: 1 } },
      create: { providerId, modelId, roleId: (roleId ?? null) as string, failures: 1 }
    });
    console.log(`[Model Failure] Recorded failure for ${modelId} on ${providerId} (role=${roleId ?? 'global'})`);
  } catch (err) {
    console.warn('[Model Failure] Failed to record model failure:', err);
  }
}

export async function recordProviderFailure(providerId: string, roleId?: string) {
  try {
    await prisma.providerFailure.upsert({
      where: { providerId_roleId: { providerId, roleId: (roleId ?? null) as string } },
      update: { failures: { increment: 1 } },
      create: { providerId, roleId: (roleId ?? null) as string, failures: 1 }
    });
    console.log(`[Provider Failure] Recorded failure for provider ${providerId} (role=${roleId ?? 'global'})`);
  } catch (err) {
    console.warn('[Provider Failure] Failed to record provider failure:', err);
  }
}
