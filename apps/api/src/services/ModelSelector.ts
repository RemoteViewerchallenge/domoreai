import { db, prisma } from '../db.js';
import { modelRegistry, modelCapabilities } from '../db/schema.js';
import { eq, and, gte, desc, SQL } from 'drizzle-orm';

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
  async resolveModelForRole(role: Role, estimatedInputTokens?: number): Promise<string> {
    const metadata = (role.metadata || {}) as RoleMetadata;
    const requirements = metadata.requirements || {};
    const requiredCaps = requirements.capabilities || [];
    let minContext = requirements.minContext || 4096;

    // 60% Context Guard
    if (estimatedInputTokens) {
        const safetyMarginContext = Math.ceil(estimatedInputTokens / 0.60);
        if (safetyMarginContext > minContext) {
            minContext = safetyMarginContext;
            console.log(`[ModelSelector] Increased minContext to ${minContext} based on estimated input of ${estimatedInputTokens} (60% rule).`);
        }
    }

    // 1. Try "Secondary" Hardcoded Model First (if defined in role metadata)
    const defaultModelId = role.defaultModelId || metadata.defaultModelId;
    if (defaultModelId) {
      const specific = await this.getModelWithCapabilities(defaultModelId);
      if (specific && this.isCapable(specific, requirements)) {
        return specific.id;
      }
      console.warn(`[ModelSelector] Default model ${defaultModelId} failed requirements or not found. Falling back to dynamic resolution.`);
    }

    // 2. Dynamic Search (The "Fit" Logic)
    // Find all active models that meet criteria
    const capFilters = this.buildCapabilityFilters(requiredCaps);
    
    // Fetch more candidates than needed to allow for filtering
    const candidates = await db.select({
      id: modelRegistry.id,
      modelId: modelRegistry.modelId,
      providerId: modelRegistry.providerId,
      contextWindow: modelCapabilities.contextWindow
    })
      .from(modelRegistry)
      .leftJoin(modelCapabilities, eq(modelRegistry.id, modelCapabilities.modelId))
      .where(and(
        eq(modelRegistry.isActive, true),
        gte(modelCapabilities.contextWindow, minContext),
        ...capFilters
      ))
      .orderBy(desc(modelCapabilities.contextWindow))
      .limit(20);

    if (candidates.length === 0) {
      // Emergency Fallback
      const fallback = await db.select({ id: modelRegistry.id })
        .from(modelRegistry)
        .where(eq(modelRegistry.isActive, true))
        .limit(1);
        
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
    // Optimize: fetch failures and usage for all candidates in parallel batches
    const candidateIds = candidates.map(c => c.id);
    const candidateModelIds = candidates.map(c => c.modelId);
    const candidateProviderIds = candidates.map(c => c.providerId);

    // Fetch failures for these provider/model combos on this role
    const failures = await prisma.modelFailure.findMany({
        where: {
            roleId: role.id,
            modelId: { in: candidateModelIds },
            providerId: { in: candidateProviderIds }
        }
    });

    // Fetch usage counts (approximated by grouping, or simplified count)
    // GroupBy is efficient.
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

    const validCandidates: typeof candidates = [];

    for (const candidate of candidates) {
        // PROBATION CHECK
        const failureRecord = failures.find(f =>
            f.providerId === candidate.providerId &&
            f.modelId === candidate.modelId
        );
        const failureCount = failureRecord?.failures || 0;

        const usageRecord = usageCounts.find(u => u.modelId === candidate.id);
        const usageCount = usageRecord?._count.id || 0;

        // THE GUARD RAIL:
        // Only bench if they have failed > 3 times AND have tried at least 5 times.
        if (failureCount > 3 && usageCount > 5) {
            console.warn(`[ModelSelector] 🛑 Benching ${candidate.modelId} for ${role.id} (Failures: ${failureCount}, Usage: ${usageCount})`);
            continue; // Skip this candidate
        }

        validCandidates.push(candidate);
    }

    if (validCandidates.length === 0) {
       // All candidates benched? Fallback to the first one (ignoring probation) or finding ANY active.
       // For now, let's just return the first one from original list to avoid complete breakage,
       // or throw if we really want to enforce strictness.
       // Logic says "Skip this candidate". If all skipped, we need a fallback.
       return candidates[0].id;
    }

    // 3. Pick the Best
    // Sort with Stickiness: If one is sticky, it wins
    validCandidates.sort((a, b) => {
        if (lastSuccess && a.id === lastSuccess.modelId) return -1; // a comes first
        if (lastSuccess && b.id === lastSuccess.modelId) return 1;  // b comes first
        // Otherwise keep original sort (context window desc)
        return 0;
    });

    return validCandidates[0].id;
  }

  private async getModelWithCapabilities(id: string) {
     const results = await db.select({
       id: modelRegistry.id,
       contextWindow: modelCapabilities.contextWindow,
       hasVision: modelCapabilities.hasVision,
       hasTTS: modelCapabilities.hasTTS,
       hasImageGen: modelCapabilities.hasImageGen
     })
     .from(modelRegistry)
     .leftJoin(modelCapabilities, eq(modelRegistry.id, modelCapabilities.modelId))
     .where(eq(modelRegistry.id, id))
     .limit(1);
     
     return results[0];
  }

  private buildCapabilityFilters(requiredCaps: string[]): SQL[] {
    const filters: SQL[] = [];
    if (requiredCaps.includes('vision')) filters.push(eq(modelCapabilities.hasVision, true));
    if (requiredCaps.includes('tts')) filters.push(eq(modelCapabilities.hasTTS, true));
    if (requiredCaps.includes('image')) filters.push(eq(modelCapabilities.hasImageGen, true));
    if (requiredCaps.includes('audio_input')) filters.push(eq(modelCapabilities.hasAudioInput, true));
    if (requiredCaps.includes('function_calling')) filters.push(eq(modelCapabilities.supportsFunctionCalling, true));
    return filters;
  }

  // Helper to check a specific model against rules
  private isCapable(model: { contextWindow?: number | null, hasVision?: boolean | null, hasTTS?: boolean | null, hasImageGen?: boolean | null }, reqs: ModelRequirements) {
    if (!model) return false;
    
    if (reqs.minContext && (model.contextWindow || 0) < reqs.minContext) return false;
    if (reqs.capabilities?.includes('vision') && !model.hasVision) return false;
    if (reqs.capabilities?.includes('tts') && !model.hasTTS) return false;
    if (reqs.capabilities?.includes('image') && !model.hasImageGen) return false;
    
    return true;
  }
}
