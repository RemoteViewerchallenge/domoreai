import { db } from "../db.js";
import { ProviderManager } from "./ProviderManager.js";
import { getBestModel } from "../services/modelManager.service.js";
import { type BaseLLMProvider } from "../utils/ProviderFactory.js";
import { ModelConfigurator } from "./ModelConfigurator.js";

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
  constructor(
    private provider: BaseLLMProvider,
    private systemPrompt: string,
    private config: { modelId: string; temperature: number; maxTokens: number }
  ) {}

  /**
   * Generates a response using the configured provider and model.
   * This utilizes the SDK's standardized BaseLLMProvider interface.
   */
  async generate(userGoal: string): Promise<string> {
    return this.provider.generateCompletion({
      modelId: this.config.modelId,
      messages: [
        { role: 'system', content: this.systemPrompt },
        { role: 'user', content: userGoal }
      ],
      temperature: this.config.temperature,
      max_tokens: this.config.maxTokens,
    });
  }
}

export async function createVolcanoAgent(cardConfig: CardAgentState): Promise<VolcanoAgent> {
  // 1. Load Role Configuration
  const role = await db.role.findUnique({ 
    where: { id: cardConfig.roleId } 
  });
  
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
    model = await db.model.findUnique({
       where: { providerId_modelId: { providerId: modelDef.providerId, modelId: modelDef.id } }
    });
    
    if (!model) {
        // Fallback if DB sync is behind ProviderManager
        throw new Error(`Model '${cardConfig.modelId}' not found in database.`);
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
    modelConfig = await db.modelConfig.findFirst({
        where: {
            modelId: model.id,
            roles: { some: { id: cardConfig.roleId } }
        }
    });

    if (!modelConfig) {
        // Create a new config for this role
        modelConfig = await db.modelConfig.create({
            data: {
                modelId: model.id,
                providerId: model.providerId,
                roles: { connect: { id: cardConfig.roleId } },
                temperature: cardConfig.temperature,
                maxTokens: cardConfig.maxTokens
            }
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
  return new VolcanoAgent(provider, role.basePrompt, {
    modelId: model.modelId,
    temperature: safeParams.temperature ?? 0.7,
    maxTokens: safeParams.max_tokens ?? 2048 // Map back to camelCase for VolcanoAgent
  });
}
