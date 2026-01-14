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

    // 60% Context Guard
    if (estimatedInputTokens) {
      const safetyMarginContext = Math.ceil(estimatedInputTokens / CONTEXT_SAFETY_MARGIN);
      if (safetyMarginContext > minContext) {
        minContext = safetyMarginContext;
        console.log(`[ModelSelector] Increased minContext to ${minContext} based on estimated input of ${estimatedInputTokens} (60% rule).`);
      }
    }

    // 1. Try "Secondary" Hardcoded Model First (if defined in role metadata)
    const defaultModelId = role.defaultModelId || metadata.defaultModelId;
    if (defaultModelId) {
      const specific = await this.getModelWithCapabilities(defaultModelId);
      if (specific && this.checkCapabilities(specific, requirements)) {
        return specific.id;
      }
      console.warn(`[ModelSelector] Default model ${defaultModelId} failed requirements or not found. Falling back to dynamic resolution.`);
    }

    // 2. Dynamic Search (The "Fit" Logic)
    // Find all active models that meet criteria

    // Build where clause
    const where: Prisma.ModelWhereInput = {
      isActive: true,
      id: excludedModelIds.length > 0 ? { notIn: excludedModelIds } : undefined,
      name: excludedModelIds.length > 0 ? { notIn: excludedModelIds } : undefined,
      // Blacklist Google via strict ID check (insensitive to be safe)
      providerId: { notIn: ['google', 'Google', 'google-vertex', 'vertex'] },
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

    // Merge capabilities filters
    if (Object.keys(capsWhere).length > 0) {
      // We need to ensure where.capabilities includes this. 
      // Prisma where clause for relation:
      (where.capabilities as any) = { ...(where.capabilities as any), ...capsWhere };
    }

    const candidates = await prisma.model.findMany({
      where,
      include: {
        capabilities: true
      },
      orderBy: {
        capabilities: {
          contextWindow: 'desc'
        }
      },
      take: MAX_CANDIDATES
    });

    if (candidates.length === 0) {
      // Emergency Fallback
      const fallback = await prisma.model.findMany({
        where: { isActive: true },
        take: 1
      });

      if (fallback.length > 0) return fallback[0].id;
      throw new Error(`No model found matching requirements: ${JSON.stringify(requirements)}`);
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

    // 3. Pick the Best
    // [CROSS-PROVIDER FAILOVER LOGIC]
    // If we have excluded models, we should try to avoid their providers too if possible.
    const failingProviders = new Set<string>();
    if (excludedModelIds.length > 0) {
      // We need to look up the providerIds for these excluded models
      const failingModels = await prisma.model.findMany({
        where: {
          OR: [
            { id: { in: excludedModelIds } },
            { name: { in: excludedModelIds } }
          ]
        },
        select: { providerId: true }
      });
      failingModels.forEach(m => failingProviders.add(m.providerId));
    }

    // 3b. Sort Candidates
    // Priority 1: NOT from a failing provider
    // Priority 2: Stickiness (Last Success) - Crucial for "It stays until rate limit"
    // Priority 3: Context Window (Original Order)
    validCandidates.sort((a, b) => {
      const aIsFailingProvider = failingProviders.has(a.providerId);
      const bIsFailingProvider = failingProviders.has(b.providerId);

      // If one is from a failing provider and the other isn't, the safe one wins
      if (aIsFailingProvider && !bIsFailingProvider) return 1; // a is worse
      if (!aIsFailingProvider && bIsFailingProvider) return -1; // a is better

      // Stickiness: If we have a 'lastSuccess' and it's not failing, PREFER IT.
      // This implements "Once set, it stays".
      if (lastSuccess) {
        if (a.id === lastSuccess.modelId) return -1;
        if (b.id === lastSuccess.modelId) return 1;
      }

      // Otherwise keep original sort (context window desc)
      return 0;
    });

    // COLD START TRICK: "50% stay 50% change provider" interpretation
    // If we have NO history (lastSuccess matches nothing in valid set) and multiple valid candidates,
    // we randomly pick one of the top 3 instead of always #1 to distribute load.
    const topCandidate = validCandidates[0];
    const isStickyMatch = lastSuccess && topCandidate.id === lastSuccess.modelId;

    if (!isStickyMatch && validCandidates.length > 1 && !shouldExplore) {
      // We are in a "Cold Start" or "Forced Switch" scenario.
      // HEURISTIC: Try to offer diversity. 
      // Find the best alternative that represents a DIFFERENT provider if possible.
      const topProviderId = topCandidate.providerId;
      const alternativeCandidate = validCandidates.find(c => c.providerId !== topProviderId);

      if (alternativeCandidate) {
        // 50/50 Chance between the Best (e.g. Google) and the Best Alternative (e.g. Anthropic)
        // This fulfills the "50% change provider" request naturally.
        const useAlternative = Math.random() < 0.5;
        console.log(`[ModelSelector] ❄️ Cold Start Diversity: Picking between ${topCandidate.providerId} and ${alternativeCandidate.providerId}. Winner: ${useAlternative ? alternativeCandidate.providerId : topCandidate.providerId}`);
        return useAlternative ? alternativeCandidate.id : topCandidate.id;
      }

      // Fallback: No diverse provider found, just random top 2
      const spread = Math.min(validCandidates.length, 2);
      const idx = Math.floor(Math.random() * spread);
      return validCandidates[idx].id;
    }

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
