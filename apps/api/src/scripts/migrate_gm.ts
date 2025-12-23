import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

interface MigratedRole {
  name: string;
  basePrompt: string;
  description: string;
  needsVision: boolean;
  needsReasoning: boolean;
  needsCoding: boolean;
}

interface RawSqlRow {
  name?: string;
  role?: string;
  basePrompt?: string;
  prompt?: string;
  category?: string;
  description?: string;
  needsVision?: string | boolean;
  needsReasoning?: string | boolean;
  needsCoding?: string | boolean;
  tools?: string | string[];
  model_id?: string;
  id?: string;
  provider_id?: string;
  provider?: string;
  model_name?: string;
  providerData?: Prisma.JsonValue;
  context_window?: string;
  is_free?: string | boolean;
}

async function main() {
  console.log("Starting Emergency Migration: g -> Role, m -> Model");

  // --- MIGRATE 'g' (Roles) ---
  try {
    console.log("Checking table 'g'...");
    const rowsG = await prisma.$queryRawUnsafe<RawSqlRow[]>(`SELECT * FROM "g"`);
    console.log(`Found ${rowsG.length} rows in 'g'. Migrating to Role...`);

    let roleCount = 0;
    for (const row of rowsG) {
      let tools: string[] = [];
      if (typeof row.tools === 'string') {
          tools = row.tools.split(',').map(t => t.trim()).filter(t => t.length > 0);
      } else if (Array.isArray(row.tools)) {
          tools = row.tools;
      }

      const roleData: MigratedRole = {
        name: row.name || row.role || `Imported Role ${Date.now()}`,
        basePrompt: row.basePrompt || row.prompt || "",
        description: row.description || "",
        needsVision: row.needsVision === 'true' || row.needsVision === true,
        needsReasoning: row.needsReasoning === 'true' || row.needsReasoning === true,
        needsCoding: row.needsCoding === 'true' || row.needsCoding === true,
      };

      const categoryName = row.category || 'Migrated From g';
      const category = await prisma.roleCategory.upsert({
        where: { name: categoryName },
        update: {},
        create: { name: categoryName }
      });

      const existing = await prisma.role.findUnique({ where: { name: roleData.name } });
      
      const metadata = {
        needsVision: roleData.needsVision,
        needsReasoning: roleData.needsReasoning,
        needsCoding: roleData.needsCoding
      };

      const toolUpsertConfig = {
        deleteMany: {},
        create: tools.map(t => ({ 
          tool: { 
            connectOrCreate: { 
              where: { name: t }, 
              create: { 
                name: t,
                description: `Imported tool: ${t}`,
                instruction: `Use the ${t} tool as needed.`,
                schema: '{}'
              } 
            } 
          } 
        }))
      };

      if (existing) {
        await prisma.role.update({ 
          where: { id: existing.id }, 
          data: {
            name: roleData.name,
            basePrompt: roleData.basePrompt,
            description: roleData.description,
            categoryId: category.id,
            metadata: metadata as Prisma.JsonObject,
            tools: toolUpsertConfig
          } 
        });
      } else {
        await prisma.role.create({ 
          data: {
            name: roleData.name,
            basePrompt: roleData.basePrompt,
            description: roleData.description,
            categoryId: category.id,
            metadata: metadata as Prisma.JsonObject,
            tools: {
              create: toolUpsertConfig.create
            }
          } 
        });
      }
      roleCount++;
    }
    console.log(`Successfully migrated ${roleCount} roles.`);
  } catch (error) {
    console.error("Failed to migrate 'g':", error);
  }

  // --- MIGRATE 'm' (Models) ---
  try {
    console.log("Checking table 'm'...");
    const rowsM = await prisma.$queryRawUnsafe<RawSqlRow[]>(`SELECT * FROM "m"`);
    console.log(`Found ${rowsM.length} rows in 'm'. Migrating to Model...`);

    let modelCount = 0;
    for (const row of rowsM) {
      const modelData = {
        modelId: row.model_id || row.id || `migrated-${Date.now()}`,
        providerId: row.provider_id || row.provider || "unknown",
        name: row.model_name || row.name || "Unnamed Model",
        providerData: (row.providerData || {}) as Prisma.JsonObject,
        aiData: {} as Prisma.JsonObject,
        specs: { contextWindow: parseInt(row.context_window || '0') } as Prisma.JsonObject,
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
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('does not exist')) {
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
