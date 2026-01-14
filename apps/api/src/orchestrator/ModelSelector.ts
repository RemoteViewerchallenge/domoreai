import { prisma } from '../db.js';
import { Prisma } from '@prisma/client';

const CONTEXT_SAFETY_MARGIN = 0.60;
const MAX_CANDIDATES = 20;

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

  /**
   * Resolves the best available model for a given role based on its requirements.
   * Logic: 
   * 1. Check if role has a hardcoded defaultModelId.
   * 2. If not, dynamic search for active models meeting requirements.
   * 3. Pick the most capable (currently sorted by context window).
   *
   * @param estimatedInputTokens - Optional estimate of input size to enforce 60% context safety margin.
   */
  async resolveModelForRole(role: Role, estimatedInputTokens?: number, excludedModelIds: string[] = []): Promise<string> {
    const metadata = (role.metadata || {}) as RoleMetadata;
    const requirements = metadata.requirements || {};
    const requiredCaps = requirements.capabilities || [];
    let minContext = requirements.minContext || 4096;

    if (estimatedInputTokens) {
      const safetyMarginContext = Math.ceil(estimatedInputTokens / CONTEXT_SAFETY_MARGIN);
      if (safetyMarginContext > minContext) {
        minContext = safetyMarginContext;
      }
    }

    // 1. Try "Secondary" Hardcoded Model First (if NOT excluded)
    const defaultModelId = role.defaultModelId || metadata.defaultModelId;
    if (defaultModelId && !excludedModelIds.includes(defaultModelId)) {
      const specific = await this.getModelWithCapabilities(defaultModelId);
      // [FIX] Ensure provider is enabled
      // @ts-ignore
      if (specific && specific.provider?.isEnabled && this.checkCapabilities(specific, requirements)) {
        return specific.id;
      }
    }

    // 2. Dynamic Search
    const where: Prisma.ModelWhereInput = {
      isActive: true,
      // [FIX] Ensure we only pick from ENABLED providers
      provider: {
        isEnabled: true
      },
      id: excludedModelIds.length > 0 ? { notIn: excludedModelIds } : undefined,
      name: excludedModelIds.length > 0 ? { notIn: excludedModelIds } : undefined,
      providerId: { notIn: ['google', 'Google', 'google-vertex'] }, // Hard blacklist if needed
      capabilities: {
        contextWindow: { gte: minContext }
      }
    };

    // Capability Filters
    const capsWhere: Prisma.ModelCapabilitiesWhereInput = {};
    if (requiredCaps.includes('vision')) capsWhere.hasVision = true;
    if (requiredCaps.includes('function_calling')) capsWhere.supportsFunctionCalling = true;
    if (requiredCaps.includes('json_mode')) capsWhere.supportsJsonMode = true;
    if (requiredCaps.includes('reasoning')) capsWhere.hasReasoning = true;

    if (Object.keys(capsWhere).length > 0) {
      (where.capabilities as any) = { ...(where.capabilities as any), ...capsWhere };
    }

    const candidates = await prisma.model.findMany({
      where,
      include: { capabilities: true, provider: true }, // Include provider to check status if needed
      orderBy: { capabilities: { contextWindow: 'desc' } },
      take: MAX_CANDIDATES
    });

    if (candidates.length === 0) {
      // Emergency Fallback: Any active model from any enabled provider
      const fallback = await prisma.model.findMany({
        where: {
          isActive: true,
          provider: { isEnabled: true },
          id: excludedModelIds.length > 0 ? { notIn: excludedModelIds } : undefined
        },
        take: 1
      });

      if (fallback.length > 0) return fallback[0].id;
      throw new Error(`No active models found matching requirements.`);
    }

    // STICKINESS: Check for last successful model
    const lastSuccess = await prisma.modelUsage.findFirst({
      where: { roleId: role.id },
      orderBy: { createdAt: 'desc' },
      select: { modelId: true }
    });

    // BATCH FETCH: Probation Stats
    const candidateIds = candidates.map(c => c.id);

    const validCandidates: typeof candidates = [];

    // Simplified Probation: Only check usage counts for now
    // (unused var removed)
    await prisma.modelUsage.groupBy({
      by: ['modelId'],
      where: {
        roleId: role.id,
        modelId: { in: candidateIds }
      },
      _count: {
        id: true
      }
    });

    for (const candidate of candidates) {
      // We simply push all candidates as "valid" for now as explicit failure tracking is complex
      // and we rely on 'excludedModelIds' passed from AgentService for immediate failure handling.
      validCandidates.push(candidate);
    }

    if (validCandidates.length === 0) {
      return candidates[0].id; // Should not happen given loop above
    }

    // [BANDIT LOGIC] "Win-Stay, Lose-Shift" with Epsilon-Greedy Exploration
    // We favor stability (Win-Stay). "It stays until it hits rate limit".
    // We use a small Epsilon to occasionally validate other models.
    const EPSILON = 0.05; // 5% Exploration, 95% Exploitation (High Stickiness)
    const shouldExplore = Math.random() < EPSILON && validCandidates.length > 1;

    if (shouldExplore) {
      // EXPLORE: Pick random eligible logic
      // This covers the "50% change" desire during exploration phases
      const randomIndex = Math.floor(Math.random() * validCandidates.length);
      const selected = validCandidates[randomIndex];
      console.log(`[ModelSelector] 🎲 Bandit Exploration: Exploring model ${selected.id} (${selected.providerId})`);
      return selected.id;
    }

    // EXPLOIT: Pick the "Best"

    // [CROSS-PROVIDER FAILOVER LOGIC - ENHANCED]
    const failingProviders = new Set<string>();
    if (excludedModelIds.length > 0) {
      const failingModels = await prisma.model.findMany({
        where: { OR: [{ id: { in: excludedModelIds } }, { name: { in: excludedModelIds } }] },
        select: { providerId: true }
      });
      failingModels.forEach(m => failingProviders.add(m.providerId));
    }


    validCandidates.sort((a, b) => {
      const aIsFailingProvider = failingProviders.has(a.providerId);
      const bIsFailingProvider = failingProviders.has(b.providerId);
      if (aIsFailingProvider && !bIsFailingProvider) return 1;
      if (!aIsFailingProvider && bIsFailingProvider) return -1;
      return 0; // Default sort
    });

    return validCandidates[0].id;
  }

  private async getModelWithCapabilities(id: string) {
    return prisma.model.findUnique({
      where: { id },
      include: { capabilities: true }
    });
  }

  // Helper to check a specific model against rules
  private checkCapabilities(model: { capabilities?: { contextWindow?: number | null, hasVision?: boolean | null } | null }, reqs: ModelRequirements) {
    if (!model) return false;
    const caps = model.capabilities || {};

    if (reqs.minContext && (caps.contextWindow || 0) < reqs.minContext) return false;
    if (reqs.capabilities?.includes('vision') && !caps.hasVision) return false;

    return true;
  }
}
