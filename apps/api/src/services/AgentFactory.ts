import { llmOpenAI, llmAnthropic, llmMistral } from "@repo/volcano-sdk";
import { selectModel } from "../lib/modelSelector.js"; 
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Represents the state of a single Card's brain
export interface CardAgentState {
  roleId: string;        // The abstract role (e.g. "Junior Coder")
  modelId: string | null; // The concrete model (e.g. "gpt-4o")
  isLocked: boolean;     // If true, use modelId. If false, use Dynamic Selector.
  
  // Runtime Tweaks (Overrides Role defaults)
  temperature: number;
  maxTokens: number;
}

export async function createVolcanoAgent(cardConfig: CardAgentState) {
  let selectedModelId = cardConfig.modelId;

  // 1. DYNAMIC ALLOCATION
  if (!cardConfig.isLocked || !selectedModelId) {
    // Fetch the abstract Role requirements
    const role = await prisma.role.findUnique({ where: { id: cardConfig.roleId } });
    
    if (!role) {
        throw new Error(`Role not found: ${cardConfig.roleId}`);
    }

    // Ask your selector for the best free model fitting these specs
    const bestModel = await selectModel({
      minContextWindow: role.minContext || undefined,
      capabilities: {
        vision: role.needsVision,
        coding: role.needsCoding,
        reasoning: role.needsReasoning
      }
    });
    
    selectedModelId = bestModel.id;
  }

  // 2. INSTANTIATE DRIVER
  // We map the model ID to the correct Volcano provider function
  const modelConfig = {
    model: selectedModelId,
    temperature: cardConfig.temperature,
    maxTokens: cardConfig.maxTokens,
    apiKey: process.env[`${selectedModelId.toUpperCase().replace(/[-.]/g, '_')}_KEY`] // Example key lookup
  };

  if (selectedModelId.startsWith('gpt')) {
    return llmOpenAI(modelConfig);
  } 
  else if (selectedModelId.startsWith('claude')) {
    return llmAnthropic(modelConfig);
  }
  else if (selectedModelId.startsWith('mistral')) {
    return llmMistral(modelConfig);
  }
  else if (selectedModelId.startsWith('llama')) {
      // Assuming Groq or similar for Llama
      // For now mapping to Mistral or a generic one if available, or throwing if not supported
      // The prompt mentioned "llmMistral (or Llama compatible driver)"
      // Let's assume llmMistral works or we need a new driver. 
      // For this implementation, I'll use llmMistral as a placeholder for Llama/Groq if compatible, 
      // or just throw for now.
      return llmMistral(modelConfig);
  }
  
  throw new Error(`Unknown provider for model: ${selectedModelId}`);
}
