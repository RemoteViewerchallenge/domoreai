/**
 * Production Model Registry
 * Makes real API calls and tracks rate limits for intelligent model selection
 */

import fs from 'fs';
import path from 'path';
import { makeAPICall } from './api-client';
import { rankModelsByUsage, getUsageSummary } from './rate-limit-tracker';

interface ModelConfig {
  provider: string;
  model_id: string;
  name: string;
  is_free: boolean;
  context_window?: number;
  type?: string;
}

export class ModelRegistry {
  private modelsData: ModelConfig[];

  constructor() {
    // Load models from the JSON file
    const modelsPath = path.resolve(process.cwd(), '..', '..', 'apps', 'api', 'latest_models', 'models.json');
    
    try {
      this.modelsData = JSON.parse(fs.readFileSync(modelsPath, 'utf8'));
      console.log(`[ModelRegistry] Loaded ${this.modelsData.length} models from registry`);
    } catch (e) {
      console.warn('[ModelRegistry] Failed to load models.json:', e);
      this.modelsData = [];
    }

    // Log usage summary on startup
    this.logUsageSummary();
  }

  async pick(opts: { role?: string; name?: string }): Promise<Model> {
    const modelName = opts.name || 'gemini-2.0-flash-lite-preview-02-05';
    
    // Find metadata from registry
    const modelMeta = this.modelsData.find(m => 
      m.model_id === modelName || m.name === modelName
    );

    if (!modelMeta) {
      console.warn(`[ModelRegistry] Model ${modelName} not found in registry, using defaults`);
    }

    console.log(`[ModelRegistry] 🎯 Selected: ${modelName} (provider: ${modelMeta?.provider || 'unknown'})`);
    
    return new Model(modelName, modelMeta);
  }

  listModels(): ModelConfig[] {
    return this.modelsData;
  }

  async logUsageSummary(): Promise<void> {
    const summary = await getUsageSummary();
    console.log(`[ModelRegistry] 📊 Usage: ${summary.totalCalls} calls across ${summary.totalModels} models (${summary.throttledModels} throttled, ${summary.activeModels} active)`);
  }
}

class Model {
  name: string;
  private meta?: ModelConfig;

  constructor(name: string, meta?: ModelConfig) {
    this.name = name;
    this.meta = meta;
  }

  async run(prompt: string, opts?: { meta?: any }): Promise<{ text: string; artifacts?: any[]; nextRoles?: any[] }> {
    const provider = this.meta?.provider || 'openrouter';
    const modelId = this.meta?.model_id || this.name;

    try {
      console.log(`[Model] 🚀 Making real API call to ${provider}/${modelId}`);
      
      const response = await makeAPICall({
        provider,
        modelId,
        prompt,
        temperature: 0.7,
        maxTokens: 2000,
      });

      const text = response.content;
      
      // Log usage info
      if (response.usage) {
        console.log(`[Model] ✅ Response: ${response.usage.completionTokens} tokens (${response.usage.promptTokens} prompt + ${response.usage.completionTokens} completion)`);
      } else {
        console.log(`[Model] ✅ Response received (${text.length} chars)`);
      }

      // Try to parse tool calls or structured output from response
      const artifacts: any[] = [];
      const nextRoles: any[] = [];

      // Simple heuristic: if response contains JSON, try to parse it
      try {
        const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[1]);
          if (parsed.artifacts) artifacts.push(...parsed.artifacts);
          if (parsed.nextRoles) nextRoles.push(...parsed.nextRoles);
        }
      } catch {}

      return { text, artifacts, nextRoles };
      
    } catch (error: any) {
      console.error(`[Model ${this.name}] ❌ Call failed:`, error.message);
      
      // On rate limit, we've already tracked it in api-client
      // Just propagate the error
      throw error;
    }
  }
}

/**
 * Enhanced model selection with rate limit awareness
 * Call this before picking a model to get the best available option
 */
export async function selectBestModelForRole(
  role: string,
  candidateModels: ModelConfig[]
): Promise<ModelConfig | null> {
  console.log(`[ModelSelection] Finding best model for role: ${role} from ${candidateModels.length} candidates`);
  
  // Rank candidates by usage score
  const ranked = await rankModelsByUsage(candidateModels);
  
  if (ranked.length === 0) {
    return null;
  }

  const best = ranked[0];
  console.log(`[ModelSelection] 🏆 Best model: ${best.model.model_id} (score: ${best.usageScore}, status: ${best.status ? `${best.status.remaining}/${best.status.limit} remaining` : 'unused'})`);
  
  return best.model;
}
