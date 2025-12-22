import { db } from '../src/db.js';
import { modelCapabilities } from '../src/db/schema.js';
import { ModelDoctor } from '../src/services/ModelDoctor.js';

// FAIL-OPEN OPERATION:
// 1. Purge existing "Best Guess" data.
// 2. Force "Deep Research" on all active models.

async function main() {
  console.log("🔥 [Data Engineer] Purging existing Model Capabilities (Stale/Default Data)...");
  
  // Wipe the table to ensure no "False Positives" remain
  try {
      await db.delete(modelCapabilities);
      console.log("✅ Capabilities Table Purged.");
  } catch (error) {
      console.error("⚠️ Failed to purge table (might be empty), continuing...", error);
  }

  console.log("🩺 [Model Doctor] Starting Deep Research Pass...");
  
  // 3. Initialize Providers so the Research Agent can function
  const { ProviderManager } = await import('../src/services/ProviderManager.js');
  await ProviderManager.initialize();

  const doc = new ModelDoctor();
  
  // Pass 'true' to force research even if heuristics exist
  const result = await doc.healModels(true);
  
  console.log("✅ Heal Complete. Summary:", result);
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Fatal Error in Force Heal:", err);
  process.exit(1);
});
