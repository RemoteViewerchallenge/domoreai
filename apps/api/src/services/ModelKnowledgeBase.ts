import { db } from '../db.js';
import { modelCapabilities } from '../db/schema.js';
import { v4 as uuidv4 } from 'uuid';

export interface ResearchData {
  contextWindow: number;
  maxOutput: number;
  hasVision: boolean;
  hasAudioInput: boolean;
  hasReasoning: boolean;
}

// 4. Database Writer (DEPRECATED - Use saveModelKnowledge)
export async function saveKnowledge(model: { id: string }, data: ResearchData, source: string, confidence: string) {
  await saveModelKnowledge(model.id, data, source, confidence);
}

export async function saveModelKnowledge(
    modelId: string, // Internal CUID
    data: ResearchData, 
    source: string, 
    confidence: string
) {
  await db.insert(modelCapabilities)
    .values({
      id: uuidv4() as string,
      modelId: modelId,
      contextWindow: data.contextWindow || 4096,
      maxOutput: data.maxOutput || 4096,
      hasVision: !!data.hasVision,
      hasAudioInput: !!data.hasAudioInput,
      hasReasoning: !!data.hasReasoning,
      source: source,
      confidence: confidence,
      updatedAt: new Date()
    })
    .onConflictDoUpdate({
      target: modelCapabilities.modelId,
      set: {
        contextWindow: data.contextWindow,
        maxOutput: data.maxOutput,
        hasVision: !!data.hasVision,
        hasAudioInput: !!data.hasAudioInput,
        hasReasoning: !!data.hasReasoning,
        source: source,
        confidence: confidence,
        updatedAt: new Date()
      }
    });
}
