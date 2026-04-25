import { prisma } from '../db.js';
import { Model, ModelCapabilities, ProviderConfig } from '@prisma/client';
import { CreditGuard } from '../services/CreditGuard.js';
import { isModelBlacklisted } from '../rateLimiter.js';


/**
 * Role requirements used to filter candidate models.
 */
export interface RoleRequirement {
  requiresVision?: boolean;
  requiresTools?: boolean;
  minContext?: number;
}

export interface SelectionResult {
  providerId: string;
  modelName: string;
}

export class LLMSelector {
  /**
   * Selects the best Model-Provider pair using a Multi-Armed Bandit approach.
   * Implements Epsilon-Greedy selection (90% Exploit / 10% Explore).
   */
  async selectBestModel(requirements: RoleRequirement): Promise<SelectionResult> {
    // 1. Fetch all active models with their capabilities
    const allModels = await prisma.model.findMany({
      where: { 
        isActive: true,
        provider: { isEnabled: true }
      },
      include: { 
        capabilities: true,
        provider: true 
      }
    });

    if (allModels.length === 0) {
      throw new Error('[LLMSelector] No active models found in database.');
    }

    // FILTER 0: Rate Limit Blacklist
    const availableModels: typeof allModels = [];
    for (const m of allModels) {
      if (!(await isModelBlacklisted(m.id))) {
        availableModels.push(m);
      } else {
        console.warn(`[LLMSelector] Skipping blacklisted model: ${m.id}`);
      }
    }

    if (availableModels.length === 0) {
      throw new Error('[LLMSelector] All candidate models are currently blacklisted due to rate limits.');
    }

    // FILTER 1: Hard Requirements
    // - Drop models that don't satisfy minContext.
    // - If requiresVision, drop models lacking "VISION" in modalityTags.
    // - If requiresTools, drop models lacking "TOOL_CALLING" in modalityTags.
    let candidates = availableModels.filter(m => {

      const caps = m.capabilities;
      if (!caps) return false;

      // Check Context Window
      if (requirements.minContext && (caps.contextWindow || 0) < requirements.minContext) {
        return false;
      }

      // Check Vision Modality
      if (requirements.requiresVision) {
        const hasVision = caps.modalityTags.some(tag => tag.toUpperCase() === 'VISION') || caps.hasVision === true;
        if (!hasVision) return false;
      }

      // Check Tool Calling Modality
      if (requirements.requiresTools) {
        const hasTools = caps.modalityTags.some(tag => tag.toUpperCase() === 'TOOL_CALLING') || caps.supportsFunctionCalling === true;
        if (!hasTools) return false;
      }

      return true;
    });

    // FILTER 2: Trust Matrix
    // - Query CreditGuard. If provider is locked or budget exceeded, drop its paid models.
    const trustCandidates: typeof candidates = [];
    for (const m of candidates) {
      const isLocked = await CreditGuard.isProviderLocked(m.providerId);
      const isPaid = (m.costPer1k || 0) > 0;

      if (isLocked && isPaid) {
        // Drop paid models for locked/budget-exceeded providers
        continue;
      }
      trustCandidates.push(m);
    }

    if (trustCandidates.length === 0) {
      console.warn('[LLMSelector] No candidates passed hard requirements and trust filters. Loosening restrictions.');
      // Fallback: If no models pass, return the original candidates (ignoring trust but keeping hard requirements)
      // or if those are empty too, throw.
      if (candidates.length === 0) {
        throw new Error('[LLMSelector] No models found matching hard requirements (Vision/Tools/Context).');
      }
      candidates = candidates; 
    } else {
      candidates = trustCandidates;
    }

    // 4. MAB UTILITY SCORING (Epsilon-Greedy)
    const epsilon = 0.1; // 10% Exploration
    const isExploring = Math.random() < epsilon;

    if (isExploring) {
      const selected = candidates[Math.floor(Math.random() * candidates.length)];
      console.log(`[LLMSelector] 🎲 EXPLORE: Selected ${selected.name} (${selected.providerId})`);
      return {
        providerId: selected.providerId,
        modelName: selected.name
      };
    }

    // EXPLOIT: Calculate UtilityScore
    // Score = (successCount / (successCount + failureCount || 1)) + (1 / avgLatencyMs) + (isFreeTier ? 2.0 : 0.0)
    const scoredCandidates = candidates.map(m => {
      const caps = m.capabilities!;
      const successCount = caps.successCount || 0;
      const failureCount = caps.failureCount || 0;
      const avgLatencyMs = caps.latencyAvg || 1000;
      const isFreeTier = (m.costPer1k || 0) === 0;

      const successRate = successCount / (successCount + failureCount || 1);
      const latencyScore = 1 / (avgLatencyMs || 1);
      const freeBonus = isFreeTier ? 2.0 : 0.0;

      const score = successRate + latencyScore + freeBonus;

      return { model: m, score };
    });

    // Sort by score descending
    scoredCandidates.sort((a, b) => b.score - a.score);
    const best = scoredCandidates[0].model;

    console.log(`[LLMSelector] 📈 EXPLOIT: Selected ${best.name} (${best.providerId}) with Utility Score: ${scoredCandidates[0].score.toFixed(4)}`);

    return {
      providerId: best.providerId,
      modelName: best.name
    };
  }

  /**
   * Compatibility wrapper for resolveModelForRole.
   */
  async resolveModelForRole(role: any, estimatedInputTokens?: number, excludedModelIds: string[] = [], excludedProviderIds: string[] = []): Promise<string> {
    const metadata = (role.metadata || {}) as any;
    const requirements = metadata.requirements || {};
    
    const roleReq: RoleRequirement = {
      minContext: requirements.minContext || metadata.minContext || estimatedInputTokens || 0,
      requiresVision: requirements.capabilities?.includes('vision') || metadata.requiresVision === true,
      requiresTools: requirements.capabilities?.includes('tools') || metadata.requiresTools === true
    };

    try {
      const { providerId, modelName } = await this.selectBestModel(roleReq);
      
      // We need to return the internal Model ID (slug) for the rest of the pipeline
      const model = await prisma.model.findFirst({
        where: { providerId, name: modelName }
      });

      return model?.id || `${providerId}:${modelName}`;
    } catch (error) {
      console.error(`[LLMSelector] Selection failed: ${error}. Falling back to default.`);
      // Absolute last resort fallback
      const fallback = await prisma.model.findFirst({ where: { isActive: true } });
      return fallback?.id || 'google:gemini-pro';
    }
  }
}
