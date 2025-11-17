import { db } from '../db.js';
import { z } from 'zod';
import { modelInputSchema } from '../routers/types.js';

type ModelInput = z.infer<typeof modelInputSchema>;

export class ModelService {
  async saveNormalizedModel(input: ModelInput) {
    const { providerId, modelId, name, isFree, contextWindow, hasVision, hasReasoning, hasCoding, providerData } = input;

    const provider = await db.provider.findUnique({
      where: { id: providerId },
    });

    if (!provider) {
      throw new Error(`Provider with id ${providerId} not found.`);
    }

    const modelData = {
      name,
      isFree,
      contextWindow,
      hasVision,
      hasReasoning,
      hasCoding,
      providerData,
    };

    return db.model.upsert({
      where: {
        modelId_providerId: {
          modelId: modelId,
          providerId: providerId,
        },
      },
      update: modelData,
      create: {
        modelId: modelId,
        providerId: providerId,
        ...modelData,
      },
    });
  }
}
