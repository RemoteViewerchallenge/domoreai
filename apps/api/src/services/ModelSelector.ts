import { db } from '../db.js';
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
    
    const candidates = await db.select({
      id: modelRegistry.id,
      modelId: modelRegistry.modelId,
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
      .limit(10);

    if (candidates.length === 0) {
      // Emergency Fallback: If absolutely nothing matches, try to find ANY active model from the provider
      const fallback = await db.select({ id: modelRegistry.id })
        .from(modelRegistry)
        .where(eq(modelRegistry.isActive, true))
        .limit(1);
        
      if (fallback.length > 0) return fallback[0].id;
      
      throw new Error(`No model found matching requirements: ${JSON.stringify(requirements)}`);
    }

    // 3. Pick the Best
    // Currently prefers larger context window. Future: cost analysis.
    return candidates[0].id;
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
