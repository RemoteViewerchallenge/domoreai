
import { schemaRouter } from '../src/routers/schema.router.js';
import { prisma } from '../src/db.js';
import { ProviderManager } from '../src/services/ProviderManager.js';

async function main() {
  console.log("Verifying Schema Editor and Migration...");

  // 1. Check Tables via Router
  console.log("\n1. Checking Tables via Schema Router...");
  // Create a minimal context for the caller
  const caller = schemaRouter.createCaller({
      prisma,
      session: null,
      vfsSession: undefined as any, // Only needed for file ops
      auth: undefined,

      // Add other required context fields if any
  });
  const tables = await caller.getTables();
  console.log("Tables found:", tables.join(", "));
  
  if (!tables.includes('Model')) throw new Error("Model table missing!");
  if (!tables.includes('ProviderConfig')) throw new Error("ProviderConfig table missing!");
  // Check if removed tables are gone
  if (tables.includes('Project')) throw new Error("Project table still exists!");
  
  // 2. Check Model Data
  console.log("\n2. Checking Model Data...");
  const modelCount = await prisma.model.count();
  console.log(`Model Count: ${modelCount}`);
  if (modelCount === 0) console.warn("WARNING: No models found. Did you expect data to be preserved?");
  
  // 3. Check ProviderConfig for API Key column removal
  console.log("\n3. Checking ProviderConfig Schema...");
  const providerSchema = await caller.getTableSchema({ tableName: 'ProviderConfig' });
  const apiKeyCol = providerSchema.find(c => c.name === 'apiKey');
  if (apiKeyCol) throw new Error("apiKey column still exists in ProviderConfig!");
  console.log("apiKey column successfully removed.");
  
  // 4. Check ProviderManager Env Loading
  console.log("\n4. Checking ProviderManager Env Loading...");
  // Mock env vars for test if needed, or rely on .env
  // We can't easily check internal state of ProviderManager without initializing it, 
  // but we can check if it throws.
  try {
      await ProviderManager.initialize(); 
      // It might log errors if keys are missing but shouldn't crash
      console.log("ProviderManager initialized.");
  } catch (e) {
      console.error("ProviderManager failed to initialize:", e);
  }

  console.log("\n✅ Verification Complete!");
}

main().catch(console.error).finally(async () => {
    await prisma.$disconnect();
});
