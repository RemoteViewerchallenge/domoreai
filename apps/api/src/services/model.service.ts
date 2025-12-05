import { prisma } from '../db.js';
import { z } from 'zod';
import { modelInputSchema } from '@repo/api-contract';
import type { Prisma } from '@prisma/client';

type ModelInput = z.infer<typeof modelInputSchema>;

export class ModelService {
  async saveNormalizedModel(input: ModelInput) {
    const { providerId, modelId, name, isFree, contextWindow, hasVision, hasReasoning, hasCoding, providerData } = input;

    // [RESILIENCE] Pack strict columns into the Triple Layer (specs)
    const specsData = {
        contextWindow,
        hasVision,
        hasReasoning,
        hasCoding,
        lastUpdated: new Date().toISOString()
    };

    // Simple implementation with our JSON DB
    return prisma.model.upsert({
      where: {
        providerId_modelId: { providerId, modelId },
      },
      update: {
        name,
        isFree,
        // Update JSON layers instead of (possibly removed) columns
        specs: specsData as Prisma.InputJsonValue,
        providerData: providerData as Prisma.InputJsonValue,
      },
      create: {
        providerId,
        modelId,
        name,
        isFree,
        specs: specsData as Prisma.InputJsonValue,
        providerData: providerData as Prisma.InputJsonValue,
      },
    });
  }

  async listModels() {
    return prisma.model.findMany({
      include: {
        provider: true,
      },
    });
  }
}
