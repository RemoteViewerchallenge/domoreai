import { prisma } from '../db.js';
import { Model, Role, Prisma } from '@prisma/client';

type CompletionParams = {
  temperature?: number;
  max_tokens?: number;
  [key: string]: any;
};

export class ModelConfigurator {
  /**
   * Safely merges parameters, suppressing unsupported values and logging adjustments.
   * @returns A tuple of [safe_params, adjustment_log]
   */
  static async configure(
    model: Model,
    role: Role,
    config: { temperature?: number | null; maxTokens?: number | null }
  ): Promise<[CompletionParams, Record<string, any>]> {
    
    // Read JSON specs layer for capabilities and supported parameters
    const specs = (model as any).specs || {};
    const supported: string[] = (specs.supportedParameters as string[]) || [];
    const contextWindow = specs.contextWindow ?? specs.context_window ?? 4096;

    const adjustments: Record<string, { original: any, reason: string }> = {};

    // 1. Start with Role Defaults
    // Role fields were removed from schema. Use metadata or hard defaults.
    const roleMetadata = (role.metadata as any) || {};
    const roleDefaults: any = {
      defaultTemperature: roleMetadata.defaultTemperature, 
      defaultMaxTokens: roleMetadata.defaultMaxTokens
    };

    const finalParams: CompletionParams = {
        temperature: roleDefaults.defaultTemperature ?? 0.7,
        max_tokens: roleDefaults.defaultMaxTokens ?? contextWindow, 
    };

    // 2. Overrides from Config (manual or dynamic choice)
    const overrides: Record<string, any> = {
        temperature: config.temperature,
        maxTokens: config.maxTokens,
    };

    // 3. Merge and Validate
    for (const [key, value] of Object.entries(overrides)) {
        if (value === undefined || value === null) continue;

        // Convert TS style (maxTokens) to API style (max_tokens)
        const apiParam = key.replace(/([A-Z])/g, (g) => `_${g[0].toLowerCase()}`); 

        // Be permissive if supported list is empty (migration safety)
        if (supported.includes(apiParam) || supported.length === 0) {
            finalParams[apiParam] = value;
        } else {
            adjustments[key] = {
                original: value,
                reason: `Parameter '${key}' is not supported by model ${model.modelId || 'unknown'}. Value ignored.`
            };

            // AUTO-CORRECTION: If max_tokens is too high, cap it to contextWindow
            if (key === 'maxTokens' && contextWindow && value > contextWindow) {
                finalParams['max_tokens'] = contextWindow;
                adjustments[key].reason = `Max tokens reduced from ${value} to model's context window (${contextWindow}).`;
            }
            
            // Ensure temperature has a safe default
            if (key === 'temperature') {
                 finalParams[apiParam] = finalParams[apiParam] ?? 0.7;
            }
        }
    }
    
    // 4. (Removed) Save adjustments back to ModelConfig

    return [finalParams, adjustments];
  }
}

