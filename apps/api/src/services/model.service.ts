import { prisma } from '../db.js';
import { z } from 'zod';
import { modelInputSchema } from '@repo/api-contract';
import type { Prisma } from '@prisma/client';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
    // Read directly from models.json
    const modelsPath = join(__dirname, '../../latest_models/models.json');
    const modelsData = JSON.parse(readFileSync(modelsPath, 'utf-8'));
    
    // Transform to match expected format with provider relation
    return modelsData.map((model: any) => ({
      id: `${model.provider}_${model.model_id}`,
      providerId: model.provider,
      modelId: model.model_id,
      name: model.name,
      isFree: model.is_free,
      contextWindow: model.context_window,
      type: model.type,
      provider: {
        id: model.provider,
        name: model.provider.charAt(0).toUpperCase() + model.provider.slice(1),
      },
    }));
  }
}
