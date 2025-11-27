import { PrismaClient } from '@prisma/client';
import type { RawProviderOutput } from './modelManager.mocks.ts';

// This would be your singleton Prisma client, passed in or imported
const prisma = new PrismaClient();

/**
 * The "Metadata Parsing" function.
 * This function is the solution to the "messy data" problem.
 * It uses the "rest" operator to catch all unknown fields.
 */
export async function logUsage(data: RawProviderOutput) {
  // 1. Destructure the *known* fields and capture the "rest"
  const {
    modelConfigId,
    roleId,
    userId,
    usage,
    cost,
    ...metadata // This catches `router_metadata` or any other unknown fields
  } = data;

  // 2. Map the data to the flexible Prisma schema
  try {
    const newLog = await prisma.modelUsage.create({
      data: {
        userId,
        modelConfigId, // Relation to ModelConfig
        roleId,          // Relation to Role

        // Handle null usage from free providers
        promptTokens: usage?.prompt_tokens ?? null,
        completionTokens: usage?.completion_tokens ?? null,

        // Handle null cost
        cost: cost ?? 0.0,

        // This is the "escape hatch."
        // All leftover fields are stored in the Json blob.
        metadata: metadata,
      },
    });
    console.log('Usage log created:', newLog.id);
    return newLog;
  } catch (error) {
    console.error('Failed to log model usage:', error);
    // Handle specific Prisma errors if needed
  }
}

/**
 * The "Brain" for model selection.
 * Finds the best, non-rate-limited model for a given role.
 */
/**
 * Selects a model from the ACTIVE REGISTRY based on Role criteria.
 * Supports "Exhaustive Fallback" by excluding failed providers.
 */
export async function selectModelFromRegistry(roleId: string, failedProviders: string[] = []) {
  // 1. Get Role & Criteria
  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) throw new Error(`Role not found: ${roleId}`);

  // 2. Get Active Registry Table
  const config = await prisma.orchestratorConfig.findUnique({ where: { id: 'global' } });
  const tableName = config?.activeTableName || 'unified_models';

  // 2.5 Get Table Columns to ensure safety
  const columnsRaw = await prisma.$queryRawUnsafe<any[]>(
    `SELECT column_name FROM information_schema.columns WHERE table_name = '${tableName}'`
  );
  const columns = columnsRaw.map(c => c.column_name);

  // 3. Build Dynamic Query
  let query = `SELECT * FROM "${tableName}" WHERE 1=1`;
  const params: any[] = [];

  // A. Exclude Failed Providers
  if (failedProviders.length > 0) {
    // Filter out empty/null provider IDs to prevent UUID parsing errors
    const validFailedProviders = failedProviders.filter(p => p && p.trim() !== '');
    
    if (validFailedProviders.length > 0) {
      const exclusionList = validFailedProviders.map(p => `'${p}'`).join(', ');
      const hasDataSource = columns.includes('data_source');
      const hasProviderId = columns.includes('provider_id');
      
      const conditions: string[] = [];
      if (hasProviderId) conditions.push(`provider_id NOT IN (${exclusionList})`);
      if (hasDataSource) conditions.push(`(data_source IS NULL OR data_source NOT IN (${exclusionList}))`);
      
      if (conditions.length > 0) {
          query += ` AND (${conditions.join(' AND ')})`;
      }
    }
  }

  // B. Apply Criteria (JSON)
  if (role.criteria && typeof role.criteria === 'object') {
    Object.entries(role.criteria).forEach(([key, value]) => {
      if (value === null || value === undefined) return;
      if (!/^[a-zA-Z0-9_]+$/.test(key)) return;
      
      // Only filter if column exists
      if (!columns.includes(key)) return;

      if (typeof value === 'boolean' && value === true) {
        query += ` AND "${key}" = true`;
      } else if (Array.isArray(value) && value.length === 2) {
        const [min, max] = value;
        if (typeof min === 'number' && typeof max === 'number') {
          query += ` AND "${key}" >= ${min} AND "${key}" <= ${max}`;
        }
      } else if (typeof value === 'string') {
         query += ` AND "${key}" = '${value.replace(/'/g, "''")}'`; 
      }
    });
  }

  // C. Apply Capabilities (Legacy/Explicit fields)
  // Helper to safely add capability check
  const addCapCheck = (cols: string[], roleNeed: boolean, ...candidates: string[]) => {
      if (!roleNeed) return;
      const validCols = candidates.filter(c => cols.includes(c));
      if (validCols.length > 0) {
          const checks = validCols.map(c => `${c} = true`).join(' OR ');
          query += ` AND (${checks})`;
      }
  };

  addCapCheck(columns, role.needsVision, 'is_vision', 'needsVision');
  addCapCheck(columns, role.needsReasoning, 'is_reason', 'needsReasoning');
  addCapCheck(columns, role.needsCoding, 'is_code', 'needsCoding');
  
  // Image Generation Logic
  const imageCols = ['has_image_generation', 'is_image_generation', 'is_gen'].filter(c => columns.includes(c));
  
  if (imageCols.length > 0) {
      if (role.needsImageGeneration) {
        // MUST have it
        const checks = imageCols.map(c => `${c} = true`).join(' OR ');
        query += ` AND (${checks})`;
      } else {
        // MUST NOT have it
        const checks = imageCols.map(c => `${c} IS NOT TRUE`).join(' AND ');
        query += ` AND (${checks})`;
      }
  }
  
  // D. Context Window
  const ctxCols = ['context_window', 'context_length'].filter(c => columns.includes(c));
  if (role.minContext && ctxCols.length > 0) {
      const checks = ctxCols.map(c => `${c} >= ${role.minContext}`).join(' OR ');
      query += ` AND (${checks})`;
  }

  // E. CRITICAL: Exclude rows with NULL/empty model_id (composite key requirement)
  query += ` AND model_id IS NOT NULL AND model_id != ''`;
  if (columns.includes('provider_id')) {
    query += ` AND provider_id IS NOT NULL AND provider_id != ''`;
  }

  // 4. Execute & Pick Random (Load Balancing)
  query += ` LIMIT 50`;

  console.log(`[Model Selection] Executing query for role ${roleId}:`, query);
  const candidates = await prisma.$queryRawUnsafe<any[]>(query);
  console.log(`[Model Selection] Query returned ${candidates.length} candidates`);

  if (candidates.length === 0) {
    console.warn(`[Model Selection] No candidates found for role ${roleId}. Check criteria and table data.`);
    return null; // Exhausted
  }

  // Validate and filter model names
  const validCandidates = [];
  for (const model of candidates) {
    const modelId = model.model_id || model.id;
    const providerId = model.provider_id || model.provider || model.data_source;
    
    // Exclude models with invalid/malformed names
    if (!modelId || typeof modelId !== 'string') {
      console.warn(`[Model Validation] Excluded model with invalid ID:`, model);
      continue;
    }
    
    // Exclude models without provider information
    if (!providerId) {
      console.warn(`[Model Validation] Excluded model without provider: ${modelId}`);
      continue;
    }

    // Exclude non-chat models by name patterns
    const lowerModelId = modelId.toLowerCase();
    if (
      lowerModelId.includes('veo') ||        // Video generation (veo-2.0)
      lowerModelId.includes('tts') ||        // Text-to-speech
      lowerModelId.includes('whisper') ||    // Audio transcription
      lowerModelId.includes('dall-e') ||     // Image generation
      lowerModelId.includes('embedding') ||  // Embeddings
      lowerModelId.includes('moderation') || // Content moderation
      lowerModelId.endsWith('-search') ||    // Search-specific
      lowerModelId.includes('aqa')           // Answer quality assessment
    ) {
      console.warn(`[Model Validation] Excluded non-chat model: ${modelId}`);
      continue;
    }
    
    // Handle "models/" prefix (Gemini-specific)
    // Accept if it looks like a real Gemini model name
    if (modelId.startsWith('models/')) {
      const isGeminiModel = lowerModelId.includes('gemini') || 
                           lowerModelId.includes('gemma') ||
                           lowerModelId.includes('learnlm') ||
                           lowerModelId.includes('imagen');
      
      if (!isGeminiModel) {
        console.warn(`[Model Validation] Excluded non-Google model with models/ prefix: ${modelId}`);
        continue;
      }
      // Valid Gemini model - keep it
    }
    
    validCandidates.push(model);
  }

  if (validCandidates.length === 0) {
    console.warn(`[Model Validation] All ${candidates.length} candidates were invalid. Check your model data.`);
    return null;
  }

  // Pick random candidate
  const selected = validCandidates[Math.floor(Math.random() * validCandidates.length)];
  
  // CRITICAL: For composite key tables, model_id is the primary identifier (not 'id')
  const finalModelId = selected.model_id;
  const finalProviderId = selected.provider_id || selected.provider || selected.data_source;
  
  if (!finalModelId || !finalProviderId) {
    console.error(`[Model Selection] CRITICAL: Selected model has null model_id or provider_id:`, selected);
    return null;
  }
  
  console.log(`[Model Selection] ✓ Selected: ${finalModelId} from provider ${finalProviderId}`);
  
  // Map to standard format expected by AgentFactory
  return {
    modelId: finalModelId,
    providerId: finalProviderId,
    ...selected
  };
}

/**
 * The "Brain" for model selection.
 * Finds the best, non-rate-limited model for a given role.
 * UPDATED: Uses Dynamic Registry first, falls back to legacy preferredModels.
 */
export async function getBestModel(roleId: string, failedProviders: string[] = []) {
  // 1. Try Dynamic Registry
  try {
    const dynamicModel = await selectModelFromRegistry(roleId, failedProviders);
    if (dynamicModel) {
      // We need to return it in a format compatible with the rest of the system.
      // The system expects a ModelConfig-like object with a nested 'model' and 'provider'.
      // Since we are bypassing the strict Prisma relations, we might need to mock that structure 
      // OR update the caller to handle raw objects.
      
      // Let's check if this provider/model exists in our strict DB to return a proper object
      const strictModel = await prisma.model.findUnique({
        where: { providerId_modelId: { providerId: dynamicModel.providerId, modelId: dynamicModel.modelId } },
        include: { provider: true }
      });

      if (strictModel) {
        return {
          modelId: strictModel.modelId,
          providerId: strictModel.providerId,
          model: strictModel,
          // Mock config values
          temperature: 0.7,
          maxTokens: 2048
        };
      }
      
      // If not in strict DB, we might be in "SimpleDB" mode or using a raw table.
      // We'll return a constructed object and hope the caller (AgentFactory) can handle it.
      // AgentFactory looks up the provider via ProviderManager, so as long as providerId is valid, we are good.
      return {
        modelId: dynamicModel.modelId,
        providerId: dynamicModel.providerId,
        model: {
            id: dynamicModel.modelId,
            providerId: dynamicModel.providerId,
            provider: { id: dynamicModel.providerId, type: dynamicModel.providerId } // Mock provider
        },
        temperature: 0.7,
        maxTokens: 2048
      };
    }
  } catch (e) {
    console.warn("Dynamic selection failed, falling back to legacy:", e);
  }

  // 2. Legacy Fallback (Original Logic)
  const role = await prisma.role.findUnique({
    where: { id: roleId },
    include: {
      preferredModels: {
        include: {
          model: { // Include the Model relation
            include: {
              provider: true // Then include the Provider through the Model
            }
          }
        }
      }
    },
  });

  if (!role) {
    throw new Error(`Role not found: ${roleId}`);
  }

  if (!role.preferredModels || role.preferredModels.length === 0) {
    // If dynamic failed AND legacy failed, we are truly out of options
    throw new Error(`Role has no preferred models and no dynamic matches found: ${roleId}`);
  }

  const oneMinuteAgo = new Date(Date.now() - 60000);

  // Go through preferred models and find the first one that isn't rate-limited
  for (const modelConfig of role.preferredModels) {
    const provider = modelConfig.model.provider; // Access provider through model
    
    // Skip failed providers
    if (failedProviders.includes(provider.id)) continue;

    // If provider has no rate limit defined, it's good to go
    if (!provider.requestsPerMinute) {
      return modelConfig; // This is a valid model
    }

    // Check usage in the last minute
    const usageCount = await prisma.modelUsage.count({
      where: {
        modelConfig: { // Filter through modelConfig
          model: { // Then through model
            providerId: provider.id
          }
        },
        createdAt: { gte: oneMinuteAgo }, // Use createdAt instead of timestamp
      },
    });

    // If usage is *under* the limit, this model is available
    if (usageCount < provider.requestsPerMinute) {
      return modelConfig; // This is a valid model
    }
  }

  // If we looped through all models and all are rate-limited
  throw new Error(`All preferred models for role ${role.name} are rate-limited or failed.`);
}
