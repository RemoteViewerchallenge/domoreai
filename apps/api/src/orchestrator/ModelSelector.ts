import { prisma } from '../db.js';
import { Prisma } from '@prisma/client';

export interface ModelRequirements {
  minContext?: number;
  capabilities?: string[];
}

export interface RoleMetadata {
  requirements?: ModelRequirements;
  defaultModelId?: string;
}

export interface Role {
  id: string;
  metadata?: RoleMetadata | Record<string, unknown>;
  defaultModelId?: string;
}

export class ModelSelector {

  async resolveModelForRole(role: Role, estimatedInputTokens?: number, excludedModelIds: string[] = []): Promise<string> {
    const metadata = (role.metadata || {}) as RoleMetadata;

    // 1. Basic Filters
    const where: Prisma.ModelWhereInput = {
      isActive: true,
      provider: {
        isEnabled: true // [FIX] Never select from disabled providers
      },
      id: excludedModelIds.length > 0 ? { notIn: excludedModelIds } : undefined,
      name: excludedModelIds.length > 0 ? { notIn: excludedModelIds } : undefined,
    };

    // 2. Try to find models
    let candidates = await prisma.model.findMany({
      where,
      orderBy: { capabilities: { contextWindow: 'desc' } }, // Prefer larger context
      take: 20
    });

    // [RESILIENCE] If strict filtering found nothing (e.g. all excluded), loosen restrictions
    if (candidates.length === 0) {
      console.warn("[ModelSelector] Strict search returned 0 candidates. Loosening filters...");
      // Try again, ignoring specific model exclusions but keeping provider enabled check
      candidates = await prisma.model.findMany({
        where: {
          isActive: true,
          provider: { isEnabled: true }
        },
        take: 5
      });
    }

    if (candidates.length === 0) {
      // [RESILIENCE] Last resort: Is there ANY model in the DB?
      const anyModel = await prisma.model.findFirst({ where: { isActive: true } });
      if (anyModel) return anyModel.id;

      throw new Error("No active models found in database.");
    }

    // 3. Simple Random selection from top candidates (Bandit logic can go here)
    // We purposefully avoid complex scoring if we are in a fallback scenario
    const selected = candidates[Math.floor(Math.random() * candidates.length)];
    return selected.id;
  }
}
