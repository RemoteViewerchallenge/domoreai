import { db } from '../src/db.js';
import { modelRegistry, modelCapabilities } from '../src/db/schema.js';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

async function main() {
  console.log("💧 Hydrating Capabilities from AI Data...");
  const allModels = await db.select().from(modelRegistry);

  for (const model of allModels) {
    // 1. Merge Layers: Provider Data + AI Data (Priority)
    const raw = (model.providerData as any) || {};
    const ai = (model.aiData as any) || {};
    const specs = (model.specs as any) || {};
    const merged = { ...raw, ...ai, ...specs };

    // 2. Detect Capabilities
    const modelId = model.modelId.toLowerCase();
    const hasVision = 
      ai.hasVision || 
      specs.hasVision ||
      raw.hasVision ||
      modelId.includes('vision') || 
      modelId.includes('vl') || 
      modelId.includes('gpt-4-v');
      
    const isMultimodal = hasVision || ai.isMultimodal || specs.isMultimodal;

    const contextWindow = ai.contextWindow || specs.contextWindow || raw.context_window || 4096;
    const maxOutput = ai.maxOutput || specs.maxOutput || raw.max_tokens || 4096;

    console.log(`[Hydration] Processing ${model.modelId} (context: ${contextWindow})`);

    // 3. Upsert into new table
    await db.insert(modelCapabilities).values({
      id: uuidv4(),
      modelId: model.id,
      contextWindow: contextWindow,
      maxOutput: maxOutput,
      hasVision: !!hasVision,
      isMultimodal: !!isMultimodal,
      hasAudioInput: modelId.includes('whisper') || modelId.includes('audio'),
      updatedAt: new Date(),
    }).onConflictDoUpdate({
      target: [modelCapabilities.modelId],
      set: {
        hasVision: !!hasVision,
        isMultimodal: !!isMultimodal,
        contextWindow: contextWindow,
        maxOutput: maxOutput,
        updatedAt: new Date(),
      }
    });
  }
  console.log("✅ Migration Complete. Safe to drop 'specs' column now.");
}

main().catch(err => {
  console.error("❌ Hydration Failed:", err);
  process.exit(1);
});
