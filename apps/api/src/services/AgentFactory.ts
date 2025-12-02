import { AgentConfigRepository } from "../repositories/AgentConfigRepository.js";
import { loadSOP } from "@repo/agents";
import { ProviderManager } from "./ProviderManager.js";
import { getBestModel } from "../services/modelManager.service.js";
import { type BaseLLMProvider } from "../utils/BaseLLMProvider.js";
import { ModelConfigurator } from "./ModelConfigurator.js";
import { ProviderError } from "../types.js";

// Represents the state of a single Card's brain
export interface CardAgentState {
  roleId: string;
  modelId: string | null;
  isLocked: boolean;
  temperature: number;
  maxTokens: number;
}

// A simple wrapper ensuring the Agent has a standard .generate() interface
export class VolcanoAgent {
  private failedProviders: string[] = [];

  constructor(
    private provider: BaseLLMProvider,
    private systemPrompt: string,
    private config: { apiModelId: string; temperature: number; maxTokens: number },
    private roleId: string
  ) {}

  /**
   * Generates a response using the configured provider and model.
   * This utilizes the SDK's standardized BaseLLMProvider interface.
   * NOW WITH EXHAUSTIVE FALLBACK!
   */
  async generate(userGoal: string): Promise<string> {
     
    while (true) {
      try {
        console.log(`[VolcanoAgent] Generating with model: "${this.config.apiModelId}" on provider ${this.provider.id}`);
        return await this.provider.generateCompletion({
          modelId: this.config.apiModelId,
          messages: [
            { role: 'system', content: this.systemPrompt },
            { role: 'user', content: userGoal }
          ],
          temperature: this.config.temperature,
          max_tokens: this.config.maxTokens,
        });
      } catch (error) {
        const err = error as ProviderError;
        console.warn(`[VolcanoAgent] Generation failed with provider ${this.provider.id || 'unknown'}:`, err);
        
        // Track failed provider
        const providerId = this.provider.id;
        if (providerId) this.failedProviders.push(providerId);

        // Add backoff for rate limits and server errors
        const status = err.status;
        if (status === 429 || status === 500) {
          const retryAfter = err.headers?.get?.('retry-after') || '2';
          const waitSeconds = Math.min(parseInt(retryAfter, 10) || 2, 5);
          console.log(`[VolcanoAgent] Encountered ${status} error. Waiting ${waitSeconds}s before failover.`);
          await new Promise(resolve => setTimeout(resolve, waitSeconds * 1000));
        }

        // ATTEMPT RECOVERY
        try {
          console.log(`[VolcanoAgent] Attempting failover... Excluded: [${this.failedProviders.join(', ')}]`);
          
          // 1. Get Next Best Model
          const nextModel = await getBestModel(this.roleId, this.failedProviders);
          
          // 2. Reconfigure Agent
          // Ensure we don't pick the same failed provider again
          if (this.failedProviders.includes(nextModel.providerId)) {
             throw new Error(`Orchestrator returned failed provider ${nextModel.providerId} despite exclusion list.`);
          }

          this.config.apiModelId = nextModel.modelId;
          this.config.temperature = nextModel.temperature || this.config.temperature;
          this.config.maxTokens = nextModel.maxTokens || this.config.maxTokens;
          
          // 3. Get New Provider
          const newProvider = ProviderManager.getProvider(nextModel.providerId);
          if (!newProvider) throw new Error(`Provider ${nextModel.providerId} not initialized.`);
          
          this.provider = newProvider;
          console.log(`[VolcanoAgent] Failover successful. Switched to: ${nextModel.providerId} / ${nextModel.modelId}`);
          
          // Loop continues and tries again with new provider...
        } catch (retryError) {
          console.error("[VolcanoAgent] Exhaustive fallback failed:", retryError);
          throw new Error(`Agent Execution Failed (Exhausted all options). Final Error: ${retryError instanceof Error ? retryError.message : String(retryError)}`);
        }
      }
    }
  }

  public getConfig() {
      return {
          modelId: this.config.apiModelId,
          providerId: this.provider.id,
          temperature: this.config.temperature,
          maxTokens: this.config.maxTokens
      };
  }
}

export async function createVolcanoAgent(cardConfig: CardAgentState): Promise<VolcanoAgent> {
  // 1. Load Role Configuration
  const role = await AgentConfigRepository.getRole(cardConfig.roleId);
  
  if (!role) {
    throw new Error(`Agent creation failed: Role ID ${cardConfig.roleId} not found.`);
  }

  let modelConfig: any;
  let model: any;

  // 2. Model Resolution Strategy
  if (!cardConfig.isLocked || !cardConfig.modelId) {
    // STRATEGY A: Dynamic Orchestration (Volcano-style)
    const bestModel = await getBestModel(cardConfig.roleId);
    
    if (!bestModel) {
      throw new Error("Orchestrator failed to select a model for this agent.");
    }
    
    modelConfig = bestModel;
    model = bestModel.model;
  } else {
    // STRATEGY B: Manual/Locked
    const allModels = await ProviderManager.getAllModels();
    const modelDef = allModels.find(m => m.id === cardConfig.modelId);
    
    if (!modelDef) {
      throw new Error(`Configuration Error: Model '${cardConfig.modelId}' is not available in any active provider.`);
    }

    // Fetch the Prisma Model
    model = await AgentConfigRepository.getModel(modelDef.providerId, modelDef.id);
    
    if (!model) {
        // JIT Creation: Model exists in provider but not in DB. Create it now.
        console.log(`[AgentFactory] JIT Creation: Model '${cardConfig.modelId}' not found in DB. Creating...`);
        
        try {
            model = await AgentConfigRepository.createModel(modelDef);
            console.log(`[AgentFactory] JIT Creation successful: ${model.id}`);
            console.log(`[AgentFactory] JIT Creation successful: ${model.id}`);
        } catch (createError) {
             console.error(`[AgentFactory] JIT Creation failed:`, createError);
             throw new Error(`Model '${cardConfig.modelId}' not found in database and JIT creation failed.`);
        }
    }

    // Find or Create ModelConfig
    // We look for an existing config for this role/model pair
    // We can't use findFirst with 'roles' directly easily without include, but we can query ModelConfig
    // Actually ModelConfig has a many-to-many with Role?
    // Schema says: roles Role[] @relation("PreferredModels")
    // So a ModelConfig can belong to multiple roles?
    // And a Role has preferredModels ModelConfig[]
    
    // If we want to find the config for THIS role and THIS model:
    // We need to find a ModelConfig that is connected to this Role AND points to this Model.
    // If we want to find the config for THIS role and THIS model:
    // We need to find a ModelConfig that is connected to this Role AND points to this Model.
    modelConfig = await AgentConfigRepository.getModelConfig(model.id, cardConfig.roleId);

    if (!modelConfig) {
        // Create a new config for this role
        modelConfig = await AgentConfigRepository.createModelConfig({
            modelId: model.id,
            providerId: model.providerId,
            roleId: cardConfig.roleId,
            temperature: cardConfig.temperature,
            maxTokens: cardConfig.maxTokens
        });
    }
  }

  // 3. Configure & Validate Parameters
  // We import ModelConfigurator dynamically or at top level. I'll assume top level import.
  const [safeParams, _adjustments] = await ModelConfigurator.configure(model, role, modelConfig);

  // 4. Initialize Provider
  const provider = ProviderManager.getProvider(model.providerId);
  if (!provider) {
    throw new Error(`Runtime Error: Provider '${model.providerId}' is not initialized.`);
  }

  // 5. Return the Configured Agent
  let basePrompt: string;
  try {
    basePrompt = await loadSOP(role.name, {});
  } catch (error) {
    console.warn(`[AgentFactory] SOP for role "${role.name}" not found. Falling back to default.`);
    basePrompt = await loadSOP('default', {});
  }
  return new VolcanoAgent(
    provider,
    basePrompt,
    {
      // CRITICAL FIX: Use modelConfig.modelId which is guaranteed to exist and matches the API-expected string
      apiModelId: modelConfig.modelId,
      temperature: safeParams.temperature ?? 0.7,
      maxTokens: safeParams.max_tokens ?? 2048 // Map back to camelCase for VolcanoAgent
    },
    role.id // Pass Role ID for fallback logic
  );
}
