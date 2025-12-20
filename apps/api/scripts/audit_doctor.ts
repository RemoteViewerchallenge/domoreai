import { db } from '../src/db.js';
import { modelRegistry, modelCapabilities } from '../src/db/schema.js';
import { ModelDoctor } from '../src/services/ModelDoctor.js';
import { eq } from 'drizzle-orm';

async function main() {
  const targetId = process.argv[2]; // Pass model ID as argument e.g. "gpt-4"

  if (!targetId) {
    console.error("❌ Please provide a Model ID (e.g. 'llama-3.2-11b-vision-preview')");
    // List 5 candidates to help the user
    try {
        const candidates = await db.select({ id: modelRegistry.modelId }).from(modelRegistry).limit(5);
        console.log("Try one of these:", candidates.map(c => c.id).join(', '));
    } catch (e) {
        console.log("Could not list candidates.");
    }
    process.exit(1);
  }

  console.log(`\n🩺 summoning Model Doctor for: ${targetId}...`);
  const doctor = new ModelDoctor();

  // Get the model record first to find the internal ID
  const modelRecord = await db.query.modelRegistry.findFirst({
    where: eq(modelRegistry.modelId, targetId)
  });

  if (!modelRecord) {
      console.error(`❌ Model '${targetId}' not found in registry.`);
      process.exit(1);
  }

  // 1. Fetch current state
  const before = await db.query.modelCapabilities.findFirst({
    where: eq(modelCapabilities.modelId, modelRecord.id)
  });

  console.log("--- BEFORE (Current DB Row) ---");
  console.table(before || { status: "No Record Found" });

  // 2. Run the Doctor manually
  // We force the doctor to "heal" this specific model

  console.log("\n🧪 Running Diagnosis & Heuristic Analysis...");

  // @ts-ignore
  const diagnosis = await doctor.inferSpecs(null, modelRecord.modelId, modelRecord.providerData);
  console.log("🧠 Doctor's Diagnosis:", diagnosis);

  // 3. Save it
  // @ts-ignore
  await doctor.saveKnowledge(modelRecord, diagnosis.data, 'manual_audit');

  // 4. Fetch Result
  const after = await db.query.modelCapabilities.findFirst({
    where: eq(modelCapabilities.modelId, modelRecord.id)
  });

  console.log("\n--- AFTER (Updated DB Row) ---");
  console.table(after);
  console.log("\n✅ Audit Complete.");
}

main().then(() => process.exit(0)).catch(console.error);
