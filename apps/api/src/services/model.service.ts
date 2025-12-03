import { prisma } from '../db.js';
import { z } from 'zod';
import { modelInputSchema } from '@repo/api-contract';
import type { Prisma } from '@prisma/client';

type ModelInput = z.infer<typeof modelInputSchema>;

export class ModelService {
  async saveNormalizedModel(input: ModelInput) {
    const { providerId, modelId, name, isFree, contextWindow, hasVision, hasReasoning, hasCoding, providerData } = input;

    // Simple implementation with our JSON DB
    return prisma.model.upsert({
      where: {
        providerId_modelId: { providerId, modelId },
      },
      update: {
        name,
        isFree,
        contextWindow,
        hasVision,
        hasReasoning,
        hasCoding,
        providerData: providerData as Prisma.InputJsonValue,
      },
      create: {
        providerId,
        modelId,
        name,
        isFree,
        contextWindow,
        hasVision,
        hasReasoning,
        hasCoding,
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
