import { db } from "../db.js";
import { ProviderManager } from "./ProviderManager.js";
import { getBestModel } from "../services/modelManager.service.js";
import { type BaseLLMProvider } from "../utils/ProviderFactory.js";

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

  let targetModelId = cardConfig.modelId;
  let targetProviderId = '';

  // 2. Model Resolution Strategy
  if (!cardConfig.isLocked || !targetModelId) {
    // STRATEGY A: Dynamic Orchestration (Volcano-style)
    // We ask the orchestrator to pick the best model based on generic criteria
    // You can expand 'criteria' to include role requirements (e.g. "needs_coding")
    const bestModel = await getBestModel(cardConfig.roleId); // Pass specific criteria if needed
    
    if (!bestModel) {
      throw new Error("Orchestrator failed to select a model for this agent.");
    }
    
    // Map the Prisma model structure to what we need
    // getBestModel returns a ModelConfig which has a 'model' relation which has a 'provider' relation
    // We need to be careful about types here since getBestModel returns a Prisma object
    // but we are in a file that might not have full Prisma types if we are using SimpleDB mocks elsewhere.
    // However, modelManager.service.ts uses PrismaClient, so we should be good to assume the structure.
    
    // @ts-ignore - We know the structure from getBestModel
    targetModelId = bestModel.model.modelId;
    // @ts-ignore
    targetProviderId = bestModel.model.providerId; 
  } else {
    // STRATEGY B: Manual/Locked
    // We need to find which provider owns this specific modelId
    const allModels = await ProviderManager.getAllModels();
    const modelDef = allModels.find(m => m.id === targetModelId);
    
    if (!modelDef) {
      throw new Error(`Configuration Error: Model '${targetModelId}' is not available in any active provider.`);
    }
    targetProviderId = modelDef.providerId;
  }

  // 3. Initialize Provider from SDK Manager
  const provider = ProviderManager.getProvider(targetProviderId);
  if (!provider) {
    throw new Error(`Runtime Error: Provider '${targetProviderId}' is not initialized.`);
  }

  // 4. Return the Configured Agent
  return new VolcanoAgent(provider, role.basePrompt, {
    modelId: targetModelId!,
    temperature: cardConfig.temperature,
    maxTokens: cardConfig.maxTokens
  });
}

