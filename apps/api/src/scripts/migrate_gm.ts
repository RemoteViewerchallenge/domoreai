
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting Emergency Migration: g -> Role, m -> Model");

  // --- MIGRATE 'g' (Roles) ---
  try {
    console.log("Checking table 'g'...");
    const rowsG = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM "g"`);
    console.log(`Found ${rowsG.length} rows in 'g'. Migrating to Role...`);

    let roleCount = 0;
    for (const row of rowsG) {
      let tools: string[] = [];
      if (typeof row.tools === 'string') {
          tools = row.tools.split(',').map((t: string) => t.trim()).filter((t: string) => t.length > 0);
      } else if (Array.isArray(row.tools)) {
          tools = row.tools;
      }

      const roleData = {
        name: row.name || row.role || `Imported Role ${Date.now()}`,
        basePrompt: row.basePrompt || row.prompt || "",
        category: row.category || 'Migrated From g',
        description: row.description || "",
        needsVision: row.needsVision === 'true' || row.needsVision === true,
        needsReasoning: row.needsReasoning === 'true' || row.needsReasoning === true,
        needsCoding: row.needsCoding === 'true' || row.needsCoding === true,
        tools: tools,
      };

      const existing = await prisma.role.findUnique({ where: { name: roleData.name } });
      if (existing) {
        await prisma.role.update({ where: { id: existing.id }, data: roleData });
      } else {
        await prisma.role.create({ data: roleData });
      }
      roleCount++;
    }
    console.log(`Successfully migrated ${roleCount} roles.`);
  } catch (error: any) {
    console.error("Failed to migrate 'g':", error);
  }

  // --- MIGRATE 'm' (Models) ---
  try {
    console.log("Checking table 'm'...");
    const rowsM = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM "m"`);
    console.log(`Found ${rowsM.length} rows in 'm'. Migrating to Model...`);

    let modelCount = 0;
    for (const row of rowsM) {
      const modelData = {
        modelId: row.model_id || row.id || `migrated-${Date.now()}`,
        providerId: row.provider_id || row.provider || "unknown",
        name: row.model_name || row.name || "Unnamed Model",
        providerData: row.providerData || {},
        aiData: {},
        specs: { contextWindow: parseInt(row.context_window || '0') },
        isFree: row.is_free === 'true' || row.is_free === true,
        costPer1k: 0,
      };

      const existing = await prisma.model.findUnique({ 
        where: { providerId_modelId: { providerId: modelData.providerId, modelId: modelData.modelId } } 
      });
      
      if (existing) {
          await prisma.model.update({ where: { id: existing.id }, data: modelData });
      } else {
          try {
             await prisma.model.create({ data: modelData });
          } catch(e) { console.warn("Skipping.", e); }
      }
      modelCount++;
    }
    console.log(`Successfully migrated ${modelCount} models.`);
  } catch (error: any) {
    if (error.message.includes('does not exist')) {
        console.log("Table 'm' does not exist. Skipping Model migration.");
    } else {
        console.error("Failed to migrate 'm':", error);
    }
  }

  console.log("Migration Complete.");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
