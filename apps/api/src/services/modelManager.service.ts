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
        // Skip empty strings to prevent UUID casting errors and meaningless filters
        if (value.trim() === '') return;
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

  addCapCheck(columns, role.needsVision, 'is_vision', 'needsVision', 'vision', 'is_multimodal');
  addCapCheck(columns, role.needsReasoning, 'is_reason', 'needsReasoning');
  addCapCheck(columns, role.needsCoding, 'is_code', 'needsCoding');
  
  // Image Generation Logic
  const imageCols = ['is_gen', 'is_image_generation'].filter(c => columns.includes(c));
  
  if (imageCols.length > 0) {
      if (role.needsImageGeneration) {
        // MUST have it
        const checks = imageCols.map(c => `${c} = true`).join(' OR ');
        query += ` AND (${checks})`;
      } else {
        // MUST NOT have it - CRITICAL: Use is_gen which has actual data
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
    // UUID columns cannot be empty strings, only NULL or valid UUIDs
    query += ` AND provider_id IS NOT NULL`;
  }

  // F. FILTER BY TYPE (Smart Logic with Fallback)
  const hasTypeCol = columns.includes('type');
  let typeFilter = '';
  
  if (hasTypeCol) {
      const allowedTypes = ["'chat'", "'text-generation'"];
      if (role.needsCoding) allowedTypes.push("'coding'", "'code'");
      if (role.needsImageGeneration) allowedTypes.push("'image'", "'image-generation'");
      if (role.needsVision) allowedTypes.push("'vision'", "'multimodal'");
      
      const typeList = allowedTypes.join(', ');
      // We construct a specific condition for type filtering
      typeFilter = ` AND ("type" IN (${typeList}) OR "type" IS NULL)`;
  }

  // G. FILTER NON-CHAT MODELS (Pattern Matching)
  const nonChatPatterns = [
    'veo', 'tts', 'whisper', 'dall-e', 'embedding', 'moderation', 
    'aqa', 'ideogram', 'hidream', 'seedance', 'imagen'
  ];
  const patternChecks = nonChatPatterns.map(p => `LOWER(model_id) LIKE '%${p}%'`).join(' OR ');
  const patternFilter = ` AND NOT (${patternChecks} OR model_id ILIKE '%-search')`;

  // COMBINED LOGIC:
  // We want to try to be specific, but if that yields nothing, we might need to relax?
  // SQL doesn't support "try this, else that" easily in one query without UNION/CTEs.
  // Instead, let's be PERMISSIVE:
  // 1. If type column exists, use it to ALLOW specific types OR NULLs.
  // 2. ALWAYS apply the blacklist (patternFilter) to avoid clearly wrong models (like 'embedding').
  
  if (hasTypeCol) {
      query += typeFilter;
      // If type is NULL, we MUST check patterns to avoid 'embedding' models that have null type.
      // If type is 'chat', we trust it and ignore patterns.
      query += ` AND ("type" IS NOT NULL OR NOT (${patternChecks} OR model_id ILIKE '%-search'))`;
  } else {
      query += patternFilter;
  }

  // H. SAFETY NET: If the user has a "weird" registry where everything is 'unknown' type, 
  // we might filter everything out.
  // But for now, let's assume the blacklist is safe.

  // I. STRICT FREE MODE (User Preference)
  // The user explicitly requested "only want to use free models for now".
  // We check for 'is_free' column or 'cost' column.
  if (columns.includes('is_free')) {
      query += ` AND is_free = true`;
  } else if (columns.includes('cost')) {
      query += ` AND cost = 0`;
  } else if (columns.includes('pricing')) {
      // Fallback for JSON pricing if needed, but is_free should be populated by ingestion
      // query += ` AND pricing->>'prompt' = '0'`; 
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
    const modelName = model.model_name || model.name || modelId; // Capture name
    const providerId = model.provider_id || model.provider || model.data_source || model.provider_name; // Added provider_name just in case
    
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
  
  // Look up provider name for better logging
  let providerName = finalProviderId;
  try {
    const provider = await prisma.providerConfig.findUnique({ 
      where: { id: finalProviderId },
      select: { label: true, type: true }
    });
    if (provider) {
      providerName = `${provider.label} (${provider.type})`;
    }
  } catch (e) {
    // Ignore lookup errors, just use ID
  }
  
  // Resolve Provider ID if it's not a UUID (e.g. "OpenRouter" label)
  let resolvedProviderId = finalProviderId;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(finalProviderId);
  
  if (!isUuid) {
      console.log(`[Model Selection] Resolving provider label: "${finalProviderId}"`);
      // Try to find a provider config that matches this label or type
      const providerConfig = await prisma.providerConfig.findFirst({
          where: {
              OR: [
                  { id: finalProviderId }, // Just in case
                  { label: { equals: finalProviderId, mode: 'insensitive' } },
                  { type: { equals: finalProviderId, mode: 'insensitive' } }
              ],
              isEnabled: true
          }
      });
      
      if (providerConfig) {
          resolvedProviderId = providerConfig.id;
          console.log(`[Model Selection] Resolved "${finalProviderId}" -> ${resolvedProviderId}`);
      } else {
          console.warn(`[Model Selection] Could not resolve provider "${finalProviderId}" to an active provider config.`);
          // We return it anyway, but AgentFactory will likely fail.
      }
  }

  // CRITICAL FIX: The 'model_id' column in the registry seems to be a UUID (internal ID),
  // while 'model_name' likely holds the actual API model ID (e.g. "gpt-4").
  // The AgentFactory/VolcanoAgent expects 'modelId' to be the string passed to the API.
  // So we MUST return 'model_name' as 'modelId'.
  
  const apiModelId = selected.model_name || selected.name || selected.model_id; // Prefer name, fallback to ID
  const internalId = selected.model_id || selected.id; // Keep UUID for reference if needed

  console.log(`[Model Selection] ✓ Selected: ${apiModelId} (Internal: ${internalId}) from ${resolvedProviderId}`);
  
  // Map to standard format expected by AgentFactory
  return {
    modelId: apiModelId, // This MUST be the API-compatible string
    internalId: internalId, // Store UUID separately just in case
    providerId: resolvedProviderId, 
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
