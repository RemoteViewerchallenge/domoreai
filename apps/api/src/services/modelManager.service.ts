import { PrismaClient } from '@prisma/client';
import { RawProviderOutput } from './modelManager.mocks';

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
export async function getBestModel(roleId: string) {
  const role = await prisma.role.findUnique({
    where: { id: roleId },
    include: {
      preferredModels: {
        include: {
          provider: true // Include the provider to check its rate limits
        }
      }
    },
  });

  if (!role) {
    throw new Error(`Role not found: ${roleId}`);
  }

  if (!role.preferredModels || role.preferredModels.length === 0) {
    throw new Error(`Role has no preferred models: ${roleId}`);
  }

  const oneMinuteAgo = new Date(Date.now() - 60000);

  // Go through preferred models and find the first one that isn't rate-limited
  for (const modelConfig of role.preferredModels) {
    const provider = modelConfig.provider;

    // If provider has no rate limit defined, it's good to go
    if (!provider.requestsPerMinute) {
      return modelConfig; // This is a valid model
    }

    // Check usage in the last minute
    const usageCount = await prisma.modelUsage.count({
      where: {
        model: { providerId: provider.id },
        timestamp: { gte: oneMinuteAgo },
      },
    });

    // If usage is *under* the limit, this model is available
    if (usageCount < provider.requestsPerMinute) {
      return modelConfig; // This is a valid model
    }
  }

  // If we looped through all models and all are rate-limited
  throw new Error(`All preferred models for role ${role.name} are rate-limited.`);
}
