import { prisma } from '../db.js';
import { Prisma, Model, ModelCapabilities, ProviderConfig } from '@prisma/client';
import { ProviderManager } from '../services/ProviderManager.js';

export interface ModelRequirements {
  minContext?: number;
  maxContext?: number;
  minOutputTokens?: number; // Minimum output tokens the model must support
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
    const minOutputTokens = requirements.minOutputTokens || (metadata.minOutputTokens as number) || 0;
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

    const allProviders = ProviderManager.getProviderIds();

    for (const m of candidates) {
      const p = ProviderManager.getProvider(m.providerId);
      if (!p) {
           // Skip silently unless we have no other options later
           continue;
      }

      const caps = m.capabilities as ExtendedCaps | null;
      const isLocal = caps?.isLocal === true;
      if (isLocal) {
        localCandidates.push(m);
        continue;
      }

      if (m.providerId.includes('google')) {
        googleCandidates.push(m);
      } else {
        apiCandidates.push(m);
      }
    }

    if (apiCandidates.length === 0 && googleCandidates.length === 0 && localCandidates.length === 0) {
        console.warn(`[LLMSelector] ⚠️ No healthy providers for ${candidates.length} potential models. Available: ${allProviders.join(', ')}`);
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

    // Output Token Filter
    // [ROLE-SPECIFIC] Ensure model can handle required output length
    if (minOutputTokens > 0) {
      console.log(`[LLMSelector] 📤 Filtering for minOutputTokens: ${minOutputTokens}`);
      const outputCapable = candidates.filter(m => {
        const maxOutput = m.capabilities?.maxOutput || 0;
        return maxOutput >= minOutputTokens && maxOutput > 0; // [SANITY] Never select zero-token models
      });
      
      if (outputCapable.length > 0) {
        candidates = outputCapable;
        console.log(`[LLMSelector] ✅ Found ${outputCapable.length} model(s) with sufficient output capacity (>= ${minOutputTokens} tokens)`);
      } else {
        console.error(`[LLMSelector] 🚨 CRITICAL: NO models support minOutputTokens=${minOutputTokens}. Available models have insufficient maxOutput.`);
        
        // [SANITY CHECK] Filter out corrupted/zero-token models before fallback
        const validModels = candidates.filter(m => (m.capabilities?.maxOutput || 0) > 0);
        
        if (validModels.length === 0) {
          throw new Error(`[LLMSelector] 💀 FATAL: All available models have maxOutput=0 (Registry Data Corruption). Cannot proceed.`);
        }
        
        // Sort by maxOutput descending to at least get the best available
        validModels.sort((a, b) => (b.capabilities?.maxOutput || 0) - (a.capabilities?.maxOutput || 0));
        const bestAvailable = validModels[0];
        
        // [ARCHITECT SAFETY] Never fall back to models < 13B for Architect/high-complexity tasks
        const isArchitectTask = role.id.includes('architect') || role.id.includes('coordinator') || 
                                (metadata.requirements as any)?.capabilities?.includes('reasoning');
        
        if (isArchitectTask) {
          const modelName = bestAvailable.name.toLowerCase();
          const is7BOrSmaller = modelName.includes('7b') || modelName.includes('3b') || modelName.includes('1b');
          
          if (is7BOrSmaller) {
            console.error(`[LLMSelector] 🚫 REJECTED: ${bestAvailable.name} is too small for Architect tasks (lacks instruction-following density)`);
            
            // Try to find a larger model
            const largerModels = validModels.filter(m => {
              const name = m.name.toLowerCase();
              return !name.includes('7b') && !name.includes('3b') && !name.includes('1b');
            });
            
            if (largerModels.length > 0) {
              candidates = [largerModels[0]];
              console.warn(`[LLMSelector] ⚠️ Falling back to ${largerModels[0].name} with maxOutput=${largerModels[0].capabilities?.maxOutput || 0}`);
            } else {
              throw new Error(`[LLMSelector] 💀 FATAL: No models >= 13B available for Architect task. Refusing to use ${bestAvailable.name}.`);
            }
          } else {
            candidates = [bestAvailable];
            console.warn(`[LLMSelector] ⚠️ Falling back to ${bestAvailable.name} with maxOutput=${bestAvailable.capabilities?.maxOutput || 0}`);
          }
        } else {
          candidates = [bestAvailable];
          console.warn(`[LLMSelector] ⚠️ Falling back to ${bestAvailable.name} with maxOutput=${bestAvailable.capabilities?.maxOutput || 0}`);
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
                   !name.includes('whisper') &&
                   !name.includes('reward');
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

    // 3. Score-based selection
    // Weight candidates based on specialized scores for coding and JSON mode
    const scoredCandidates = candidates.map(m => {
        let score = 100;
        const caps = m.capabilities as ExtendedCaps | null;
        const specs = (caps?.specs || {}) as Record<string, unknown>;
        
        // Boost for coding tasks
        if (requiredCaps.includes('coding')) {
            const codingScore = (specs.coding_score as number) || (specs.coding === true ? 80 : 0);
            score += codingScore;
        }

        // Boost for JSON tasks
        if (requiredCaps.includes('json') || role.id === 'coordinator' || role.id === 'role-architect') {
            const jsonScore = (specs.json_score as number) || (specs.json_mode === true ? 50 : 0);
            score += jsonScore;
        }

        // Penalty for local models unless specifically asked
        if (caps?.isLocal && !requiredCaps.includes('local')) {
            score -= 50;
        }

        return { model: m, score };
    });

    // Sort by score descending
    scoredCandidates.sort((a, b) => b.score - a.score);
    
    // Pick the best one (or sample from top 3 for variation)
    const topResult = scoredCandidates[0].model;
    console.log(`[LLMSelector] Selected ${topResult.name} (Score: ${scoredCandidates[0].score})`);
    
    return topResult.id;
  }
}
