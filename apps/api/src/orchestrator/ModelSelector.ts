import { prisma } from '../db.js';
import { Prisma } from '@prisma/client';
import { ProviderManager } from '../services/ProviderManager.js';

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

  async resolveModelForRole(role: Role, estimatedInputTokens?: number, excludedModelIds: string[] = [], excludedProviderIds: string[] = []): Promise<string> {
    const metadata = (role.metadata || {}) as RoleMetadata;
    const requirements = metadata.requirements || {};
    const minContext = requirements.minContext || 0;
    const requiredCaps = requirements.capabilities || [];

    // 1. Basic Filters
    const where: Prisma.ModelWhereInput = {
      isActive: true,
      provider: {
        isEnabled: true,
        id: excludedProviderIds.length > 0 ? { notIn: excludedProviderIds } : undefined
      },
      id: excludedModelIds.length > 0 ? { notIn: excludedModelIds } : undefined,
      name: excludedModelIds.length > 0 ? { notIn: excludedModelIds } : undefined,
    };

    // 2. Try to find models with capabilities (SOFT FILTER)
    // We filter in-memory since capability logic involves multiple tables
    let candidates = await prisma.model.findMany({
      where,
      include: { capabilities: true },
      // [FIX] Favor efficiency: Cheapest first, then Smallest sufficient context.
      // This avoids picking overkill models like "Pro/Ultra" or huge context models unnecessary for small tasks.
      orderBy: [
        { costPer1k: 'asc' },
        { capabilities: { contextWindow: 'asc' } }
      ],
      take: 100 // Grab more candidates since we might filter many out
    });

    // [RUNTIME CHECK] Filter out offline providers AND de-prioritize Google if requested
    const validCandidates: typeof candidates = [];
    const googleCandidates: typeof candidates = [];

    for (const m of candidates) {
      if (!ProviderManager.getProvider(m.providerId)) continue;

      // [USER PREF] "Continuous use of google... where is it getting api key"
      // User clearly wants to avoid Google if possible (likely due to rate limits/reliability).
      // We separate them to use only as a fallback.
      if (m.providerId.includes('google')) {
        googleCandidates.push(m);
      } else {
        validCandidates.push(m);
      }
    }

    // Prefer non-google models first
    if (validCandidates.length > 0) {
      candidates = validCandidates;
    } else if (googleCandidates.length > 0) {
      // Fallback to Google if nothing else exists
      console.warn("[ModelSelector] ⚠️ Only Google models available. Using Google despite preference.");
      candidates = googleCandidates;
    } else {
      candidates = [];
    }

    // In-Memory Capability Filter
    if (requiredCaps.length > 0) {
      const capableCandidates = candidates.filter(m => {
        const caps = (m.capabilities || {}) as Record<string, unknown>;

        if (requiredCaps.includes('vision')) {
          if (caps.hasVision === true) return true;
          return false;
        }

        if (requiredCaps.includes('reasoning')) {
          if (caps.hasReasoning === true) return true;
          return false;
        }

        return true;
      });

      if (capableCandidates.length > 0) {
        candidates = capableCandidates;
      } else {
        // SOFT FALLBACK:
        console.warn(`[ModelSelector] ⚠️ Could not find model with capabilities [${requiredCaps.join(',')}]. Falling back to any available model.`);
      }
    }

    // Context Window Filter
    if (minContext > 0) {
      const largeEnough = candidates.filter(m => {
        const caps = (m.capabilities || {}) as Record<string, unknown>;
        const capContext = (caps.contextWindow as number) || 0;
        return capContext >= minContext;
      });
      if (largeEnough.length > 0) {
        candidates = largeEnough;
      } else {
        console.warn(`[ModelSelector] ⚠️ Could not find model with context >= ${minContext}. Using largest available.`);
      }
    }

    candidates = candidates.slice(0, 20); // Top 20 after filtering

    // [RESILIENCE] If strict filtering found nothing (e.g. all excluded), loosen restrictions
    if (candidates.length === 0) {
      console.warn("[ModelSelector] Strict search returned 0 candidates. Loosening filters...");
      // Try again, ignoring specific model exclusions but keeping provider enabled check
      candidates = await prisma.model.findMany({
        where: {
          isActive: true,
          provider: { isEnabled: true }
        },
        include: { capabilities: true },
        take: 5
      });
    }

    if (candidates.length === 0) {
      // [RESILIENCE] Last resort: Is there ANY model in the DB?
      const anyModel = await prisma.model.findFirst({
        where: { isActive: true },
        include: { capabilities: true }
      });
      if (anyModel) return anyModel.id;

      throw new Error("No active models found in database.");
    }

    // 3. Simple Random selection from top candidates (Bandit logic can go here)
    const selected = candidates[Math.floor(Math.random() * candidates.length)];
    return selected.id;
  }
}
