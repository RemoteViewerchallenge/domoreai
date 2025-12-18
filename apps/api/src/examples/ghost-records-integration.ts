/**
 * Example: Integrating Ghost Records Pattern with AgentRuntime
 * 
 * This shows how to track model discoveries during agent execution
 */

import { ModelDiscoveryService } from '../services/ModelDiscoveryService.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Example 1: Track successful model inference in your orchestrator
 */
export async function executeAgentJob(
  jobId: string,
  roleId: string,
  providerId: string,
  modelId: string
) {
  try {
    // Your existing job execution logic
    const result = await callLLMProvider(providerId, modelId, {
      messages: [{ role: 'user', content: 'Hello' }]
    });

    // ✨ NEW: Track successful inference
    await ModelDiscoveryService.trackSuccessfulInference(
      providerId,
      modelId,
      undefined, // Will use modelId as name
      {
        jobId,
        roleId,
        successfulAt: new Date().toISOString(),
        // Optionally extract context window from response headers
        contextWindow: extractContextWindowFromHeaders(result.headers)
      }
    );

    return result;
  } catch (error) {
    console.error(`Model ${modelId} failed:`, error);
    // Don't track failures here - let ModelFailure table handle that
    throw error;
  }
}

/**
 * Example 2: Select models with Ghost Records awareness
 */
export async function selectBestModel(
  roleId: string,
  capabilities: string[] = ['text']
) {
  // Only consider active models
  const availableModels = await prisma.model.findMany({
    where: {
      isActive: true,      // ✨ Only confirmed-working models
      isFree: true,        // Zero-Burn mode
      capabilities: {
        hasSome: capabilities
      },
      provider: {
        isEnabled: true
      }
    },
    include: {
      provider: true
    },
    orderBy: [
      // Prefer recently-seen models
      { lastSeenAt: 'desc' }
    ]
  });

  if (availableModels.length === 0) {
    throw new Error('No active models available for this role');
  }

  // Prefer INDEX models over INFERENCE (more reliable)
  const indexModels = availableModels.filter(m => m.source === 'INDEX');
  const preferredModels = indexModels.length > 0 ? indexModels : availableModels;

  return preferredModels[0];
}

/**
 * Example 3: Health check with Ghost Records protection
 */
export async function refreshProviderModels(providerId: string) {
  try {
    const provider = await prisma.providerConfig.findUnique({
      where: { id: providerId }
    });

    if (!provider) {
      throw new Error(`Provider ${providerId} not found`);
    }

    // Fetch models from provider API
    const models = await fetchModelsFromProviderAPI({
          ...provider,
          baseURL: provider.baseURL ?? undefined
        });

    if (models.length === 0) {
      console.warn(`⚠️  ${provider.label} returned 0 models`);
      console.warn(`   This might be an API timeout or rate limit`);
      console.warn(`   Existing models are preserved by Ghost Records pattern`);
      
      // Don't proceed with ingestion - Ghost Records protects existing data
      return {
        success: false,
        reason: 'empty_response',
        modelsPreserved: true
      };
    }

    // Safe to ingest
    console.log(`✅ ${provider.label} returned ${models.length} models`);
    
    // Your ingestion logic here...
    // UnifiedIngestionService will update lastSeenAt for all found models
    
    return {
      success: true,
      modelsIngested: models.length
    };
  } catch (error) {
    console.error(`Failed to refresh ${providerId}:`, error);
    return {
      success: false,
      reason: 'api_error',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Example 4: UI endpoint to show model status
 */
export async function getModelStatusForUI() {
  const stats = await ModelDiscoveryService.getDiscoveryStats();
  const recentlyInactive = await ModelDiscoveryService.listInactiveModels(20);

  // Group by provider
  const modelsByProvider = await prisma.providerConfig.findMany({
    include: {
      models: {
        orderBy: { lastSeenAt: 'desc' }
      }
    }
  });

  return {
    summary: stats,
    recentlyInactive: recentlyInactive.map(m => ({
      id: m.id,
      name: m.name,
      provider: m.provider.label,
      source: m.source,
      lastSeenAt: m.lastSeenAt,
      daysSinceLastSeen: Math.floor(
        (Date.now() - m.lastSeenAt.getTime()) / (1000 * 60 * 60 * 24)
      )
    })),
    byProvider: modelsByProvider.map(p => ({
      provider: p.label,
      total: p.models.length,
      active: p.models.filter(m => m.isActive).length,
      inactive: p.models.filter(m => !m.isActive).length,
      bySource: {
        INDEX: p.models.filter(m => m.source === 'INDEX').length,
        INFERENCE: p.models.filter(m => m.source === 'INFERENCE').length,
        MANUAL: p.models.filter(m => m.source === 'MANUAL').length
      }
    }))
  };
}

/**
 * Example 5: Scheduled maintenance job
 */
export async function dailyModelMaintenance() {
  console.log('🔧 Running daily model maintenance...');

  // 1. Mark stale models (not seen in 24 hours)
  const staleCount = await ModelDiscoveryService.markStaleModelsInactive(
    undefined, // All providers
    24         // Hours
  );

  if (staleCount > 0) {
    console.log(`   Marked ${staleCount} models as inactive (not seen in 24h)`);
  }

  // 2. Delete very old inactive models (30+ days)
  const deletedCount = await ModelDiscoveryService.deleteOldInactiveModels(30);

  if (deletedCount > 0) {
    console.log(`   Deleted ${deletedCount} old inactive models (30+ days)`);
  }

  // 3. Get stats
  const stats = await ModelDiscoveryService.getDiscoveryStats();
  console.log(`   Current status: ${stats.active} active, ${stats.inactive} inactive`);

  // 4. Alert if too many inactive
  const inactivePercentage = (stats.inactive / stats.total) * 100;
  if (inactivePercentage > 10) {
    console.warn(`⚠️  ${inactivePercentage.toFixed(1)}% of models are inactive!`);
    console.warn(`   Consider refreshing provider model lists`);
  }

  console.log('✅ Maintenance complete');
}

/**
 * Example 6: Manual model addition
 */
export async function addManualModel(
  providerId: string,
  modelId: string,
  modelName: string,
  specs: {
    contextWindow?: number;
    maxOutput?: number;
    isMultimodal?: boolean;
  }
) {
  const now = new Date();

  const model = await prisma.model.create({
    data: {
      providerId,
      modelId,
      name: modelName,
      source: 'MANUAL', // ✨ This protects it from auto-deletion
      firstSeenAt: now,
      lastSeenAt: now,
      isActive: true,
      specs: {
        contextWindow: specs.contextWindow || 4096,
        maxOutput: specs.maxOutput || 4096,
        isMultimodal: specs.isMultimodal || false
      },
      providerData: {
        note: 'Manually added by user',
        addedAt: now.toISOString()
      },
      capabilities: specs.isMultimodal ? ['text', 'vision'] : ['text']
    }
  });

  console.log(`✅ Added manual model: ${modelName} (${modelId})`);
  console.log(`   This model will never be auto-deleted`);

  return model;
}

// Helper functions (implement these based on your existing code)

async function callLLMProvider(
  providerId: string,
  modelId: string,
  request: unknown
): Promise<{ data: unknown; headers: Record<string, string> }> {
  // Your existing LLM call logic
  throw new Error('Not implemented');
}

function extractContextWindowFromHeaders(headers: Record<string, string>): number | undefined {
  // Some providers include this in response headers
  // e.g., OpenRouter: x-ratelimit-limit-tokens
  return undefined;
}

async function fetchModelsFromProviderAPI(provider: { baseURL?: string; apiKey: string }): Promise<unknown[]> {
  // Your existing provider API call logic
  throw new Error('Not implemented');
}
