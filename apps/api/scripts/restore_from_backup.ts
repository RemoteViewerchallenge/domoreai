import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

// 1. MAPPING CONFIGURATION
// Clean up old provider IDs to nice slugs
const PROVIDER_MAP: Record<string, string> = {
  'google-ai': 'google',
  'mistral-api': 'mistral',
  'groq-env': 'groq',
  'openrouter-env': 'openrouter',
  'openai': 'openai', // Keep as is
  'ollama': 'ollama', // Keep as is
};

// Helper to normalize provider IDs
const cleanProviderId = (oldId: string) => PROVIDER_MAP[oldId] || oldId.toLowerCase();

// Helper to create the new Model Slug ID
const createModelSlug = (providerId: string, modelName: string) => {
  // e.g. "google/gemini-1.5-pro"
  // Clean the model name to be url-safe(-ish)
  const cleanName = modelName.trim().replace(/\s+/g, '-').toLowerCase();
  // If the model name already looks like a path (e.g. "models/gemini"), strip the prefix
  const finalName = cleanName.split('/').pop() || cleanName;
  
  return `${cleanProviderId(providerId)}/${finalName}`;
};

async function main() {
  console.log("🚀 Starting Restoration from Backups...");

  const backupsDir = path.join(__dirname, '../db_backups');
  
  // =========================================================
  // 1. RESTORE PROVIDERS
  // =========================================================
  console.log("\n📦 Restoring Providers...");
  const providerPath = path.join(backupsDir, 'ProviderConfig.json');

  if (fs.existsSync(providerPath)) {
      const providersRaw = JSON.parse(fs.readFileSync(providerPath, 'utf-8'));
      
      for (const p of providersRaw) {
        const newId = cleanProviderId(p.id);
        console.log(`   Processing: ${p.id} -> ${newId}`);

        await prisma.providerConfig.upsert({
          where: { id: newId },
          create: {
            id: newId,
            label: p.label || newId,
            type: p.type || 'chat',
            apiKey: p.apiKey || 'sk-placeholder',
            baseURL: p.baseURL,
            isEnabled: p.isEnabled ?? true,
          },
          update: {
            apiKey: p.apiKey // Restore keys if they exist
          }
        });
      }
  } else {
      console.warn(`   ⚠️ ProviderConfig.json NOT FOUND at ${providerPath}`);
  }

  // =========================================================
  // 2. RESTORE MODELS
  // =========================================================
  console.log("\n📦 Restoring Models...");
  // Map to track Old CUID -> New Slug ID for the next step
  const idMap = new Map<string, string>();

  const modelPath = path.join(backupsDir, 'Model.json');
  if (fs.existsSync(modelPath)) {
      const modelsRaw = JSON.parse(fs.readFileSync(modelPath, 'utf-8'));
      
      for (const m of modelsRaw) {
        // The backup has "modelId" field which is actually the name/slug we want (e.g. "gemini-1.5-pro")
        // It also has "name" (Display Name)
        const rawModelId = m.modelId || m.name; 
        const newProviderId = cleanProviderId(m.providerId);
        const newSlugId = createModelSlug(newProviderId, rawModelId);

        // Save mapping for capabilities later
        idMap.set(m.id, newSlugId);

        // Ensure the provider actually exists (avoid FK errors)
        const providerExists = await prisma.providerConfig.findUnique({ where: { id: newProviderId }});
        if (!providerExists) {
          console.warn(`   ⚠️ Skipping model ${newSlugId} because provider ${newProviderId} is missing.`);
          continue;
        }

        await prisma.model.upsert({
          where: { id: newSlugId },
          create: {
            id: newSlugId,
            providerId: newProviderId,
            name: m.name || rawModelId,
            costPer1k: m.costPer1k,
            isActive: m.isActive ?? true,
            // The "Bag" Strategy: Dump raw data back in
            providerData: m.providerData || {},
            aiData: m.aiData || {},
          },
          update: {
            // Update data but keep existing relations if any
            providerData: m.providerData || {},
          }
        });
      }
      console.log(`   ✅ Restored ${idMap.size} models.`);
  } else {
      console.warn(`   ⚠️ Model.json NOT FOUND at ${modelPath}`);
  }

  // =========================================================
  // 3. RESTORE CAPABILITIES
  // =========================================================
  console.log("\n📦 Restoring ModelCapabilities...");
  const capsPath = path.join(backupsDir, 'ModelCapabilities.json');

  if (fs.existsSync(capsPath)) {
      const capsRaw = JSON.parse(fs.readFileSync(capsPath, 'utf-8'));
      
      let capsCount = 0;
      for (const c of capsRaw) {
        // Translate the Old CUID to the New Slug
        const newModelId = idMap.get(c.modelId);

        if (!newModelId) {
          // This happens if the model was deleted or filtered out
          continue;
        }

        // Check if model exists (double safety)
        const modelExists = await prisma.model.findUnique({ where: { id: newModelId } });
        if (!modelExists) continue;

        await prisma.modelCapabilities.upsert({
          where: { modelId: newModelId },
          create: {
            modelId: newModelId,
            contextWindow: c.contextWindow,
            maxOutput: c.maxOutput,
            hasVision: c.hasVision ?? false,
            supportsFunctionCalling: c.supportsFunctionCalling ?? false,
            supportsJsonMode: c.supportsJsonMode ?? false,
            // Dump extra fields into specs bag if needed
            specs: {
                tokenizer: c.tokenizer,
                paramCount: c.paramCount
            }
          },
          update: {
            contextWindow: c.contextWindow,
            hasVision: c.hasVision
          }
        });
        capsCount++;
      }
      console.log(`   ✅ Restored ${capsCount} capabilities.`);
  } else {
      console.warn(`   ⚠️ ModelCapabilities.json NOT FOUND at ${capsPath}`);
  }

  console.log("\n🎉 Restoration Complete! Your data is now in the new Schema.");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
