import { z } from 'zod';
import { createTRPCRouter, publicProcedure, protectedProcedure } from '../trpc.js';
import { encrypt } from '../utils/encryption.js'; 
import { ProviderManager } from '../services/ProviderManager.js'; 
import { ModelDoctor } from '../services/ModelDoctor.js'; 

export const dataRefinementRouter = createTRPCRouter({
  
  // --- 1. LIST TABLES (For your Sidebar) ---
  listAllTables: publicProcedure.query(async ({ ctx }) => {
    try {
      const tables = await ctx.prisma.$queryRawUnsafe<any[]>(
        `SELECT table_name as name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY name`
      );
      return tables.map(t => ({ name: t.name, type: 'table' }));
    } catch (error) {
      return [];
    }
  }),

  // --- 2. GET DATA (For your Grid) ---
  getTableData: publicProcedure
    .input(z.object({ tableName: z.string(), limit: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const limit = input.limit || 1000;
      try {
        const rows = await ctx.prisma.$queryRawUnsafe<any[]>(
          `SELECT * FROM "${input.tableName}" LIMIT ${limit}`
        );
        return { rows };
      } catch (error) {
        return { rows: [] };
      }
    }),

  previewTable: publicProcedure
    .input(z.object({ tableName: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const rows = await ctx.prisma.$queryRawUnsafe<any[]>(
          `SELECT * FROM "${input.tableName}" LIMIT 100`
        );
        return rows;
      } catch (error) {
        return [];
      }
    }),

  // --- 3. THE "DO IT ALL" MUTATION ---
  addProviderAndIngest: publicProcedure
    .input(z.object({
      label: z.string(),
      type: z.string(),
      apiKey: z.string(),
      baseURL: z.string().optional(),
      tableName: z.string().optional(), // User can specify table name
    }))
    .mutation(async ({ ctx, input }) => {
      const { RawModelService } = await import('../services/RawModelService.js');
      
      // A. Save Config
      const encryptedKey = input.apiKey ? encrypt(input.apiKey) : '';
      const newProvider = await ctx.prisma.providerConfig.create({
        data: {
          label: input.label,
          type: input.type,
          apiKey: encryptedKey,
          baseURL: input.baseURL,
          isEnabled: true,
        }
      });
      // Reinitialize providers so new provider is available immediately
      await ProviderManager.initialize();
      
      // B. Fetch Raw JSON (The "Blob")
      const snapshot = await RawModelService.fetchAndSnapshot(newProvider.id);
      
      // C. AUTOMATICALLY FLATTEN INTO A TABLE (The "Separated Rows")
      // Use user-provided name or default to a safe name based on provider label
      const safeLabel = input.label.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
      const newTableName = input.tableName || `refined_${safeLabel}`;
      
      try {
        // 1. Drop old table to start fresh (if it exists)
        await ctx.prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "${newTableName}"`);

        // 2. Run the Magic SQL to extract rows
        // DYNAMICALLY EXTRACT ALL KEYS WITHOUT GUESSING
        
        // Step A: Inspect the JSON to find ALL possible keys in the array
        // We use the specific snapshot.id to ensure we target the right data
        const keysResult = await ctx.prisma.$queryRawUnsafe<{key: string}[]>(`
          SELECT DISTINCT jsonb_object_keys(elem) as key
          FROM "RawDataLake",
               jsonb_array_elements(
                  CASE 
                    WHEN jsonb_typeof("rawData") = 'array' THEN "rawData"
                    WHEN "rawData" ? 'data' THEN "rawData"->'data'
                    WHEN "rawData" ? 'models' THEN "rawData"->'models' -- Google/Vertex often uses 'models'
                    WHEN "rawData" ? 'items' THEN "rawData"->'items'   -- Another common standard
                    ELSE '[]'::jsonb 
                  END
               ) as elem
          WHERE "RawDataLake".id = '${snapshot.id}'
        `);

        // Step B: Build a dynamic CREATE TABLE statement
        // Filter out 'id' from the dynamic list to avoid collision with our PK
        const keys = keysResult.map(k => k.key).filter(k => k !== 'id');
        
        // Always include an ID (PK)
        let columnsSql = `gen_random_uuid()::text as id, `;

        // Explicitly preserve the provider's 'id' as 'model_id' if it exists
        const hasId = keysResult.some(k => k.key === 'id');
        if (hasId) {
            columnsSql += `elem->>'id' as "model_id", `;
        }
        
        if (keys.length > 0) {
           columnsSql += keys.map(k => `elem->>'${k}' as "${k}"`).join(', ');
        } else {
           if (!hasId) columnsSql += `'unknown' as _status`; 
        }

        const dynamicQuery = `
          CREATE TABLE "${newTableName}" AS
          SELECT 
            ${columnsSql}
          FROM "RawDataLake",
               jsonb_array_elements(
                  CASE 
                    WHEN jsonb_typeof("rawData") = 'array' THEN "rawData"
                    WHEN "rawData" ? 'data' THEN "rawData"->'data'
                    WHEN "rawData" ? 'models' THEN "rawData"->'models'
                    WHEN "rawData" ? 'items' THEN "rawData"->'items'
                    ELSE '[]'::jsonb 
                  END
               ) as elem
          WHERE "RawDataLake".id = '${snapshot.id}'
        `;

        await ctx.prisma.$executeRawUnsafe(dynamicQuery);

        // Return the CLEAN table name, so the UI switches to it immediately
        return { 
          success: true,
          tableName: newTableName 
        };

      } catch (error: any) {
        console.error("Auto-flatten failed:", error);
        // Fallback to raw table if flattening fails, but with an error message
        return { 
          success: false,
          tableName: 'RawDataLake',
          error: "Fetched data but couldn't flatten it. Check RawDataLake."
        };
      }
    }),

  // --- 4. EDITING TOOLS (Delete, Update) ---
  deleteTable: publicProcedure
    .input(z.object({ tableName: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "${input.tableName}" CASCADE`);
      return { success: true };
    }),

  updateCell: publicProcedure
    .input(z.object({ tableName: z.string(), rowId: z.string(), column: z.string(), value: z.any() }))
    .mutation(async ({ ctx, input }) => {
      const val = typeof input.value === 'string' ? `'${input.value}'` : input.value;
      await ctx.prisma.$executeRawUnsafe(`UPDATE "${input.tableName}" SET "${input.column}" = ${val} WHERE id = '${input.rowId}'`);
      return { success: true };
    }),

  // --- 5. SCHEMA MANAGEMENT ---
  addColumn: publicProcedure
    .input(z.object({ tableName: z.string(), columnName: z.string(), type: z.string().default('TEXT') }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.$executeRawUnsafe(`ALTER TABLE "${input.tableName}" ADD COLUMN "${input.columnName}" ${input.type}`);
      return { success: true };
    }),

  dropColumn: publicProcedure
    .input(z.object({ tableName: z.string(), columnName: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.$executeRawUnsafe(`ALTER TABLE "${input.tableName}" DROP COLUMN "${input.columnName}"`);
      return { success: true };
    }),

  createTable: publicProcedure
    .input(z.object({ tableName: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Create a table with a default ID column
      await ctx.prisma.$executeRawUnsafe(`
        CREATE TABLE "${input.tableName}" (
          id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
          created_at timestamp DEFAULT now()
        )
      `);
      return { success: true };
    }),

  saveQueryResults: publicProcedure
    .input(z.object({ query: z.string(), newTableName: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Clean the query - remove trailing semicolons
        const cleanQuery = input.query.trim().replace(/;+$/, '');
        
        await ctx.prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "${input.newTableName}"`);
        await ctx.prisma.$executeRawUnsafe(`CREATE TABLE "${input.newTableName}" AS (${cleanQuery})`);
        return { success: true, newTableName: input.newTableName };
      } catch (error: any) {
        throw new Error(`Transformation failed: ${error.message}`);
      }
    }),

    // Stubs for other UI calls
    flattenRawData: publicProcedure
    .input(z.object({ tableName: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // 1. Find the latest RawDataLake entry
      const latestSnapshot = await ctx.prisma.rawDataLake.findFirst({
        orderBy: { ingestedAt: 'desc' }
      });

      if (!latestSnapshot) {
        throw new Error("No raw data found to flatten.");
      }

      const newTableName = "refined_models_manual";

      // 2. Dynamic Extraction (Same logic as addProviderAndIngest)
      try {
        await ctx.prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "${newTableName}"`);

        const keysResult = await ctx.prisma.$queryRawUnsafe<{key: string}[]>(`
          SELECT DISTINCT jsonb_object_keys(elem) as key
          FROM "RawDataLake",
               jsonb_array_elements(
                  CASE 
                    WHEN jsonb_typeof("rawData") = 'array' THEN "rawData"
                    WHEN "rawData" ? 'data' THEN "rawData"->'data'
                    WHEN "rawData" ? 'models' THEN "rawData"->'models'
                    WHEN "rawData" ? 'items' THEN "rawData"->'items'
                    ELSE '[]'::jsonb 
                  END
               ) as elem
          WHERE "RawDataLake".id = '${latestSnapshot.id}'
        `);

        const keys = keysResult.map(k => k.key).filter(k => k !== 'id');
        let columnsSql = `gen_random_uuid()::text as id, `;

        // Explicitly preserve the provider's 'id' as 'model_id' if it exists
        const hasId = keysResult.some(k => k.key === 'id');
        if (hasId) {
            columnsSql += `elem->>'id' as "model_id", `;
        }
        
        if (keys.length > 0) {
           columnsSql += keys.map(k => `elem->>'${k}' as "${k}"`).join(', ');
        } else {
           if (!hasId) columnsSql += `'unknown' as _status`; 
        }

        const dynamicQuery = `
          CREATE TABLE "${newTableName}" AS
          SELECT 
            ${columnsSql}
          FROM "RawDataLake",
               jsonb_array_elements(
                  CASE 
                    WHEN jsonb_typeof("rawData") = 'array' THEN "rawData"
                    WHEN "rawData" ? 'data' THEN "rawData"->'data'
                    WHEN "rawData" ? 'models' THEN "rawData"->'models'
                    WHEN "rawData" ? 'items' THEN "rawData"->'items'
                    ELSE '[]'::jsonb 
                  END
               ) as elem
          WHERE "RawDataLake".id = '${latestSnapshot.id}'
        `;

        await ctx.prisma.$executeRawUnsafe(dynamicQuery);

        return { success: true, tableName: newTableName };
      } catch (error: any) {
        console.error("Manual flatten failed:", error);
        throw new Error("Failed to flatten data.");
      }
    }),

    // Execute arbitrary SQL query and return results
    executeQuery: publicProcedure
      .input(z.object({ query: z.string() }))
      .mutation(async ({ ctx, input }) => {
        try {
          const rows = await ctx.prisma.$queryRawUnsafe<any[]>(input.query);
          return { success: true, rows, rowCount: rows.length };
        } catch (error: any) {
          throw new Error(`Query failed: ${error.message}`);
        }
      }),

    // Cache models for C.O.R.E. - copies current table to core_models for app use
    cacheModelsForCore: publicProcedure
      .input(z.object({ sourceTable: z.string() }))
      .mutation(async ({ ctx, input }) => {
        try {
          const targetTable = 'core_models';
          
          // Drop and recreate core_models with the same structure as source
          await ctx.prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "${targetTable}"`);
          await ctx.prisma.$executeRawUnsafe(`CREATE TABLE "${targetTable}" AS SELECT * FROM "${input.sourceTable}"`);
          
          // Count the models
          const result = await ctx.prisma.$queryRawUnsafe<[{ count: bigint }]>(`SELECT COUNT(*) as count FROM "${targetTable}"`);
          const count = Number(result[0].count);
          
          return { success: true, count, tableName: targetTable };
        } catch (error: any) {
          throw new Error(`Failed to cache models: ${error.message}`);
        }
      }),

    // Refresh normalized Model registry from a curated table (no schema changes to source)
    refreshModelsFromTable: publicProcedure
      .input(z.object({
        sourceTable: z.string().default('my_free_models'),
        providerId: z.string().optional(),
        // Default flags if missing on source rows
        defaultContextWindow: z.number().int().optional().default(8192),
        defaultHasReasoning: z.boolean().optional().default(true),
        defaultHasCoding: z.boolean().optional().default(true),
        defaultIsFree: z.boolean().optional().default(true),
        defaultCostPer1k: z.number().optional().default(0),
        providerTypeHint: z.string().optional().default('ollama'),
      }))
      .mutation(async ({ ctx, input }) => {
        // 1) Resolve providerId
        let providerId = input.providerId || null;
        if (!providerId) {
          const p = await ctx.prisma.providerConfig.findFirst({
            where: { type: input.providerTypeHint, isEnabled: true },
            orderBy: { createdAt: 'desc' },
            select: { id: true }
          });
          if (!p) throw new Error(`No enabled provider found for type '${input.providerTypeHint}'.`);
          providerId = p.id;
        }

        // 2) Replace strategy: delete existing for provider, then insert fresh from source
        await ctx.prisma.$executeRawUnsafe(`DELETE FROM "Model" WHERE "providerId" = '${providerId}'`);

        const sql = `
          INSERT INTO "Model" (
            id, "providerId", "modelId", "name", "providerData"
          )
          SELECT 
            gen_random_uuid()::text as id,
            '${providerId}' as "providerId",
            m.model_id as "modelId",
            COALESCE(m.name, m.model_id) as "name",
            to_jsonb(m) as "providerData"
          FROM "${input.sourceTable}" m
          WHERE m.model_id IS NOT NULL
            AND m.provider_id = '${providerId}'
        `;

        const insertedCount = await ctx.prisma.$executeRawUnsafe(sql);

        // 3) Return counts for visibility
        const [{ count }] = await ctx.prisma.$queryRawUnsafe<[{ count: bigint }]>(
          `SELECT COUNT(*) as count FROM "Model" WHERE "providerId" = '${providerId}'`
        );
        return { success: true, providerId, insertedCount: Number(insertedCount), totalForProvider: Number(count) };
      }),

    promoteToApp: publicProcedure.input(z.any()).mutation(async () => ({ count: 0 })),

    // --- MODEL DOCTOR ---
    healData: protectedProcedure
      .input(z.object({
        modelId: z.string().optional(),
        providerId: z.string().optional(),
        runAll: z.boolean().optional()
      }))
      .mutation(async ({ ctx, input }) => {
        // Instantiate ModelDoctor with no arguments (constructor expects none now)
        const doctor = new ModelDoctor();

        if (input.modelId) {
          const result = await doctor.healModel(input.modelId);
          return { success: true, results: [result] };
        }

        if (input.runAll) {
          const stats = await doctor.healModels();
          return { success: true, stats };
        }

        return { success: false, message: "No target specified" };
      }),

    // Expose a dedicated single-model endpoint if callers prefer it
    healModel: protectedProcedure
      .input(z.object({ modelId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const doctor = new ModelDoctor();
        const result = await doctor.healModel(input.modelId);
        return result;
      }),

  // --- REFRESH DATA (Recovery Feature) ---
  refreshProviderData: protectedProcedure
    .input(z.object({
      providerId: z.string(),
      targetTableName: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      const { RawModelService } = await import('../services/RawModelService.js');

      // 1. Fetch Provider Config
      const provider = await ctx.prisma.providerConfig.findUnique({
        where: { id: input.providerId }
      });

      if (!provider) {
        throw new Error(`Provider with ID ${input.providerId} not found.`);
      }

      // 2. Fetch Raw JSON (The "Blob")
      // We re-use the fetchAndSnapshot logic which handles the API call
      const snapshot = await RawModelService.fetchAndSnapshot(provider.id);

      // 3. FLATTEN INTO TARGET TABLE
      const newTableName = input.targetTableName;

      try {
        // Drop old table to start fresh
        await ctx.prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "${newTableName}"`);

        // Dynamic Extraction Logic (Reused)
        const keysResult = await ctx.prisma.$queryRawUnsafe<{key: string}[]>(`
          SELECT DISTINCT jsonb_object_keys(elem) as key
          FROM "RawDataLake",
               jsonb_array_elements(
                  CASE 
                    WHEN jsonb_typeof("rawData") = 'array' THEN "rawData"
                    WHEN "rawData" ? 'data' THEN "rawData"->'data'
                    WHEN "rawData" ? 'models' THEN "rawData"->'models'
                    WHEN "rawData" ? 'items' THEN "rawData"->'items'
                    ELSE '[]'::jsonb 
                  END
               ) as elem
          WHERE "RawDataLake".id = '${snapshot.id}'
        `);

        const keys = keysResult.map(k => k.key).filter(k => k !== 'id');
        
        let columnsSql = `gen_random_uuid()::text as id, `;
        const hasId = keysResult.some(k => k.key === 'id');
        if (hasId) {
            columnsSql += `elem->>'id' as "model_id", `;
        }
        
        if (keys.length > 0) {
           columnsSql += keys.map(k => `elem->>'${k}' as "${k}"`).join(', ');
        } else {
           if (!hasId) columnsSql += `'unknown' as _status`; 
        }

        const dynamicQuery = `
          CREATE TABLE "${newTableName}" AS
          SELECT 
            ${columnsSql}
          FROM "RawDataLake",
               jsonb_array_elements(
                  CASE 
                    WHEN jsonb_typeof("rawData") = 'array' THEN "rawData"
                    WHEN "rawData" ? 'data' THEN "rawData"->'data'
                    WHEN "rawData" ? 'models' THEN "rawData"->'models'
                    WHEN "rawData" ? 'items' THEN "rawData"->'items'
                    ELSE '[]'::jsonb 
                  END
               ) as elem
          WHERE "RawDataLake".id = '${snapshot.id}'
        `;

        await ctx.prisma.$executeRawUnsafe(dynamicQuery);

        return { success: true, tableName: newTableName, rowCount: 0 }; // TODO: Return actual count if needed

      } catch (error: any) {
        console.error("Refresh flatten failed:", error);
        throw new Error(`Failed to refresh data for table ${newTableName}: ${error.message}`);
      }
    }),

  // --- 6. SAVED QUERIES ---
  saveMigrationQuery: protectedProcedure
    .input(z.object({
      name: z.string(),
      query: z.string(),
      targetTable: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.savedQuery.upsert({
        where: { name: input.name },
        update: { query: input.query, targetTable: input.targetTable },
        create: { name: input.name, query: input.query, targetTable: input.targetTable }
      });
    }),

  listSavedQueries: publicProcedure
    .query(async ({ ctx }) => {
      console.log('Fetching saved queries...');
      const queries = await ctx.prisma.savedQuery.findMany({ orderBy: { updatedAt: 'desc' } });
      console.log(`Found ${queries.length} saved queries.`);
      // Return as strings to avoid SuperJSON serialization issues
      return queries.map(q => ({
        ...q,
        updatedAt: q.updatedAt.toISOString()
      }));
    }),

  executeSavedQuery: protectedProcedure
    .input(z.object({ name: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const saved = await ctx.prisma.savedQuery.findUnique({ where: { name: input.name } });
      if (!saved) throw new Error(`Query "${input.name}" not found.`);
      
      // Execute the saved SQL
      const rows = await ctx.prisma.$executeRawUnsafe(saved.query);
      
      return { success: true, rowsAffected: rows, queryName: saved.name };
    }),

  deleteSavedQuery: protectedProcedure
    .input(z.object({ name: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.savedQuery.delete({ where: { name: input.name } });
      return { success: true };
    }),
});
