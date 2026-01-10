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
      capabilities: {
        contextWindow: { gte: minContext }
      }
    };

    // Capability Filters
    const capsWhere: Prisma.ModelCapabilitiesWhereInput = {};
    if (requiredCaps.includes('vision')) capsWhere.hasVision = true;
    
    if (requiredCaps.includes('function_calling')) capsWhere.supportsFunctionCalling = true;
    if (requiredCaps.includes('json_mode')) capsWhere.supportsJsonMode = true;

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
    const usageCounts = await prisma.modelUsage.groupBy({
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

    // 3. Pick the Best
    // [CROSS-PROVIDER FAILOVER LOGIC]
    // If we have excluded models, we should try to avoid their providers too if possible.
    // This prevents "Google -> Google -> Google" loops when the entire provider is rate limited.

    // 3a. Identify Failing Providers from excluded list
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
        if (failingProviders.size > 0) {
            console.log(`[ModelSelector] Cross-Provider Failover Active. Deprioritizing providers: ${Array.from(failingProviders).join(', ')}`);
        }
    }

    // 3b. Sort Candidates
    // Priority 1: NOT from a failing provider
    // Priority 2: Stickiness (Last Success)
    // Priority 3: Context Window (Original Order)
    validCandidates.sort((a, b) => {
        const aIsFailingProvider = failingProviders.has(a.providerId);
        const bIsFailingProvider = failingProviders.has(b.providerId);

        // If one is from a failing provider and the other isn't, the safe one wins
        if (aIsFailingProvider && !bIsFailingProvider) return 1; // a is worse
        if (!aIsFailingProvider && bIsFailingProvider) return -1; // a is better

        // If both are same status, check stickiness
        if (lastSuccess && a.id === lastSuccess.modelId) return -1;
        if (lastSuccess && b.id === lastSuccess.modelId) return 1;

        // Otherwise keep original sort (context window desc)
        return 0;
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
