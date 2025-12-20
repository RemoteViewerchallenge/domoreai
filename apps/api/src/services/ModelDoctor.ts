import { db } from '../db.js';
import { modelRegistry, modelCapabilities } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

export class ModelDoctor {

  // 1. The Public Entry Point
  async healModel(modelId: string) {
    const model = await db.query.modelRegistry.findFirst({
      where: eq(modelRegistry.modelId, modelId)
    });
    if (!model) return;

    // Run inference
    const diagnosis = await this.inferSpecs(null, model.modelId, model.providerData);

    // Save to DB
    await this.saveKnowledge(model, diagnosis.data, 'doctor_heal');
  }

  // 2. The Brain (Heuristics)
  public async inferSpecs(agent: any, modelId: string, rawData: any) {
    const lower = modelId.toLowerCase();
    const rawString = JSON.stringify(rawData).toLowerCase();

    // Context Window Logic
    let context = 4096; // Fallback
    if (lower.includes('128k')) context = 128000;
    else if (lower.includes('32k')) context = 32000;
    else if (lower.includes('16k')) context = 16000;
    else if (lower.includes('8k')) context = 8192;
    // Attempt to grab from raw data if available
    else if (rawData && typeof rawData === 'object') {
        const r = rawData as any;
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
        const c = (r as any).context_window || (r as any).context_length || (r as any).max_context_length;
        if (c) context = parseInt(String(c));
    }

    // Capability Flags
    const hasVision = lower.includes('vision') || lower.includes('vl') || rawString.includes('vision');
    const hasAudio = lower.includes('audio') || lower.includes('whisper') || lower.includes('speech');
    const hasReasoning = lower.includes('reasoning') || lower.includes('thinking') || lower.startsWith('o1-');

    return {
      confidence: 'medium',
      data: {
        contextWindow: context,
        hasVision,
        hasAudioInput: hasAudio,
        hasReasoning
      }
    };
  }

  // 3. The Hands (Database Write)
  public async saveKnowledge(model: any, data: any, source: string) {
    console.log(`[ModelDoctor] 💾 Saving Capabilities for ${model.modelName}...`);

    // Update the main capabilities table
    await db.insert(modelCapabilities)
      .values({
        id: uuidv4(),
        modelId: model.id,
        contextWindow: data.contextWindow,
        maxOutput: 4096,
        hasVision: !!data.hasVision,
        hasAudioInput: !!data.hasAudioInput,
        hasReasoning: !!data.hasReasoning,
        updatedAt: new Date()
      })
      .onConflictDoUpdate({
        target: modelCapabilities.modelId,
        set: {
          contextWindow: data.contextWindow,
          hasVision: !!data.hasVision,
          hasAudioInput: !!data.hasAudioInput,
          hasReasoning: !!data.hasReasoning,
          updatedAt: new Date()
        }
      });
  }

  // --- Preserved Methods for Compatibility ---

  // Used by dataRefinement.router.ts
  public async heal<T>(data: Record<string, unknown>, schema: z.ZodSchema<T>, modelId: string): Promise<T | Record<string, unknown>> {
    console.log(`[ModelDoctor] Healing data for ${modelId}...`);
    // Simple validation pass
    const validation = schema.safeParse(data);
    if (validation.success) {
      return validation.data;
    }
    console.warn(`[ModelDoctor] Schema mismatch. Returning raw data for UI.`);
    return {
      ...data,
      _metadata: {
        status: 'needs_repair',
        errors: validation.error.issues,
        timestamp: Date.now()
      }
    };
  }

  // Used by PersistentModelDoctor.ts and systemHealth.router.ts
  async healModels(forceResearch = false) {
     // Re-implement simplified version if needed, or just warn
     // The original healModels called diagnoseModel on all models.
     // We can just call healModel on all models here.

     const allModels = await db.query.modelRegistry.findMany();
     let healed = 0;
     for (const model of allModels) {
        await this.healModel(model.modelId);
        healed++;
     }
     return { inferred: healed, researched: 0, failed: 0, skipped: 0 };
  }

  // Used by cron
  async healCapabilities() {
    return this.healModels();
  }
}
