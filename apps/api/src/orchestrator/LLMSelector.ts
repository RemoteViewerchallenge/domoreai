import { prisma } from '../db.js';
import { Prisma, Model, ModelCapabilities, ProviderConfig } from '@prisma/client';
import { ProviderManager } from '../services/ProviderManager.js';

export interface ModelRequirements {
  minContext?: number;
  maxContext?: number;
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

// Local extensions for ModelCapabilities while prisma client regenerates/syncs
type ExtendedCaps = ModelCapabilities & {
  isLocal?: boolean | null;
  primaryTask?: string | null;
  hasEmbedding?: boolean | null;
  hasTTS?: boolean | null;
  hasOCR?: boolean | null;
  hasModeration?: boolean | null;
};

interface UnknownModelCandidate {
  model: Model & {
    provider: ProviderConfig;
    capabilities: ModelCapabilities | null;
  };
}

export class LLMSelector {

  private getModelCapabilities(m: Model & { capabilities: ModelCapabilities | null }): ExtendedCaps | null {
    return m.capabilities as ExtendedCaps | null;
  }

  async resolveModelForRole(role: Role, estimatedInputTokens?: number, excludedModelIds: string[] = [], excludedProviderIds: string[] = []): Promise<string> {
    const metadata = (role.metadata || {}) as RoleMetadata & Record<string, unknown>;
    const requirements = metadata.requirements || {};
    
    // Support both top-level metadata (RoleCreatorPanel) and nested requirements (AgentService/DNA)
    const minContext = requirements.minContext || (metadata.minContext as number) || 0;
    const maxContext = requirements.maxContext || (metadata.maxContext as number) || 0;
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

    // [RUNTIME CHECK] Filter out offline providers AND separate local vs API models
    const apiCandidates: (Model & { capabilities: ModelCapabilities | null })[] = [];
    const localCandidates: (Model & { capabilities: ModelCapabilities | null })[] = [];
    const googleCandidates: (Model & { capabilities: ModelCapabilities | null })[] = [];

    for (const m of candidates) {
      const p = ProviderManager.getProvider(m.providerId);
      if (!p) {
           console.warn(`[LLMSelector] ❌ Provider '${m.providerId}' NOT found/enabled in Manager. Available: ${ProviderManager.getProviderIds().join(', ')}`);
           continue;
      }

      // Separate local models (Ollama) - they are fallback only
      const caps = m.capabilities as ExtendedCaps | null;
      const isLocal = caps?.isLocal === true;
      if (isLocal) {
        localCandidates.push(m);
        continue;
      }

      // [USER PREF] "Continuous use of google... where is it getting api key"
      // User clearly wants to avoid Google if possible (likely due to rate limits/reliability).
      // We separate them to use only as a fallback.
      if (m.providerId.includes('google')) {
        googleCandidates.push(m);
      } else {
        apiCandidates.push(m);
      }
    }

    // Priority: API models → Google models → Local models (Ollama)
    if (apiCandidates.length > 0) {
      candidates = apiCandidates;
      console.log(`[LLMSelector] ✅ Using ${apiCandidates.length} API model(s)`);
    } else if (googleCandidates.length > 0) {
      // Fallback to Google if no other API models exist
      console.warn("[LLMSelector] ⚠️ Only Google models available. Using Google despite preference.");
      candidates = googleCandidates;
    } else if (localCandidates.length > 0) {
      // Last resort: Use local models
      console.warn(`[LLMSelector] ⚠️ No API models available. Falling back to ${localCandidates.length} local model(s) (Ollama).`);
      candidates = localCandidates;
    } else {
      candidates = [];
    }

    // In-Memory Capability Filter
    if (requiredCaps.length > 0) {
      const capableCandidates = candidates.filter(m => {
        const caps = m.capabilities as ExtendedCaps | null;
        if (!caps) return false;

        // Ensure ALL required capabilities are met
        for (const cap of requiredCaps) {
          if (cap === 'vision' && !caps.hasVision) return false;
          if (cap === 'reasoning' && !caps.hasReasoning) return false;
          // Use unknown to safely check coding capability in specs JSON
          const specs = (caps.specs || {}) as Record<string, unknown>;
          if (cap === 'coding' && specs.coding === false) return false;
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
    // [STRICT] Enforce contextWindow >= estimatedTokens * 1.5
    // [RANGE] Respect min/max context from role metadata if present
    const budgetFactor = 1.5;
    const minRequired = Math.max(minContext, (estimatedInputTokens || 0) * budgetFactor);
    const maxLimit = maxContext > 0 ? maxContext : Infinity;

    if (minRequired > 0 || maxLimit !== Infinity) {
      console.log(`[LLMSelector] 📏 Filtering for context: ${minRequired} <= window <= ${maxLimit} (Estimated: ${estimatedInputTokens})`);
      const rangeMatching = candidates.filter(m => {
        const caps = m.capabilities;
        const capContext = caps?.contextWindow || 0;
        
        // If max is set, model MUST be under it. If min is set, model MUST be over it.
        return capContext >= minRequired && capContext <= maxLimit;
      });
      
      if (rangeMatching.length > 0) {
        candidates = rangeMatching;
      } else {
        // [HARD REQUIREMENT] If we can't find a model within range, we prioritize the MINIMUM first.
        // If it's over the max, we warn but allow it if no other choice (max is usually for cost/performance control)
        console.warn(`[ModelSelector] 🚨 No model found in context range [${minRequired}, ${maxLimit}]. Picking best available fit.`);
        
        // Pick models that at least meet the minimum
        const atLeastMin = candidates.filter(m => (m.capabilities?.contextWindow || 0) >= minRequired);
        if (atLeastMin.length > 0) {
          candidates = atLeastMin;
        } else {
          console.error("[ModelSelector] 💀 CRITICAL: NO models meet minimum context! Picking largest.");
          candidates.sort((a,b) => (b.capabilities?.contextWindow || 0) - (a.capabilities?.contextWindow || 0));
        }
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

    // [RESILIENCE] Filter out specialized 'utility' models (guards, moderation, embeddings) for general agent tasks
    // unless the role explicitly asks for them.
    if (!requiredCaps.includes('moderation') && !requiredCaps.includes('guard') && !requiredCaps.includes('ocr')) {
        candidates = candidates.filter(m => {
            const caps = m.capabilities as ExtendedCaps | null;
            const primaryTask = caps?.primaryTask;
            const name = m.name.toLowerCase();
            
            // Strictly exclude specialized non-text models
            if (primaryTask && ['embedding', 'moderation', 'ocr', 'tts', 'stt', 'audio'].includes(primaryTask)) return false;
            if (caps?.hasEmbedding || caps?.hasTTS || caps?.hasOCR || caps?.hasModeration) return false;
            
            // Exclude by name hints
            return !name.includes('guard') && 
                   !name.includes('moderation') &&
                   !name.includes('ocr') &&
                   !name.includes('embedding') &&
                   !name.includes('whisper');
        });
    }

    if (candidates.length === 0) {
      // [FALLBACK] Try UnknownModel table (The "Waiting Room" for uncategorized models)
      // Asserting a targeted interface for prisma.unknownModel to survive client sync lag without using 'any'
      const unknownCandidates = await (prisma as unknown as { 
          unknownModel: { 
              findMany(args: Record<string, unknown>): Promise<UnknownModelCandidate[]> 
          } 
      }).unknownModel.findMany({
          include: { model: { include: { provider: true, capabilities: true } } }
      });

      if (unknownCandidates.length > 0) {
          console.warn(`[LLMSelector] ⚠️ No SPECIALIZED model found. Falling back to UNKNOWN pool (${unknownCandidates.length} avail).`);
          // Pick one that is active
          for (const u of unknownCandidates) {
               const m = u.model;
               // Check basic provider health
               if (m.isActive && ProviderManager.getProvider(m.providerId)) {
                   console.log(`[LLMSelector] 🤞 Providing Fallback Model: ${m.name}`);
                   return m.id; 
               }
          }
      }

      // [RESILIENCE] Last resort: Is there ANY model in the DB?
      const anyModel = await prisma.model.findFirst({
        where: { isActive: true },
        include: { capabilities: true }
      });
      if (anyModel) {
          const provider = ProviderManager.getProvider(anyModel.providerId);
          if (provider) {
              console.warn(`[ModelSelector] 🚨 CRITICAL FALLBACK: Using ${anyModel.name} (Provider: ${anyModel.providerId}) because selection failed.`);
              return anyModel.id;
          } else {
              console.error(`[ModelSelector] Found fallback model ${anyModel.name} but Provider ${anyModel.providerId} is missing in Manager!`);
              console.error(`Available Providers: ${Array.from(ProviderManager.getProviders().keys()).join(', ')}`);
          }
      } else {
          console.error(`[ModelSelector] Database is effectively empty (No active models found).`);
      }

      throw new Error('No active models found in database.');
    }

    // 3. Simple Random selection from top candidates (Bandit logic can go here)
    const selected = candidates[Math.floor(Math.random() * candidates.length)];
    return selected.id;
  }
}
