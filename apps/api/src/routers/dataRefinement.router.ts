import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc.js';
import { encrypt } from '../utils/encryption.js'; 

export const dataRefinementRouter = createTRPCRouter({
  
  // --- 1. LIST TABLES (For your Sidebar) ---
  listAllTables: publicProcedure.query(async ({ ctx }) => {
    try {
      const tables = await ctx.db.$queryRawUnsafe<any[]>(
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
        const rows = await ctx.db.$queryRawUnsafe<any[]>(
          `SELECT * FROM "${input.tableName}" LIMIT ${limit}`
        );
        return { rows };
      } catch (error) {
        return { rows: [] };
      }
    }),

  // --- 3. THE "DO IT ALL" MUTATION ---
  addProviderAndIngest: publicProcedure
    .input(z.object({
      label: z.string(),
      type: z.string(),
      apiKey: z.string(),
      baseURL: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { RawModelService } = await import('../services/RawModelService.js');
      
      // A. Save Config
      const encryptedKey = encrypt(input.apiKey);
      const newProvider = await ctx.db.providerConfig.create({
        data: {
          label: input.label,
          type: input.type,
          apiKey: encryptedKey,
          baseURL: input.baseURL,
          isEnabled: true,
        }
      });
      
      // B. Fetch Raw JSON (The "Blob")
      await RawModelService.fetchAndSnapshot(newProvider.id);
      
      // C. AUTOMATICALLY FLATTEN INTO A TABLE (The "Separated Rows")
      const newTableName = "refined_models";
      
      try {
        // 1. Drop old table to start fresh
        await ctx.db.$executeRawUnsafe(`DROP TABLE IF EXISTS "${newTableName}"`);

        // 2. Run the Magic SQL to extract rows
        // This handles standard OpenAI format: { data: [...] }
        const query = `
          CREATE TABLE "${newTableName}" AS
          SELECT 
            gen_random_uuid()::text as id,
            (CASE WHEN jsonb_typeof(elem) = 'object' THEN elem->>'id' ELSE NULL END) as model_id,
            (CASE WHEN jsonb_typeof(elem) = 'object' THEN elem->>'owned_by' ELSE 'unknown' END) as owner,
            (CASE WHEN jsonb_typeof(elem) = 'object' THEN elem->>'context_window' ELSE NULL END) as context,
            '${newProvider.type}' as source_provider
          FROM "RawDataLake",
               LATERAL (
                 SELECT value as elem 
                 FROM jsonb_array_elements(
                    CASE 
                      WHEN jsonb_typeof("rawData") = 'array' THEN "rawData"
                      WHEN "rawData" ? 'data' AND jsonb_typeof("rawData"->'data') = 'array' THEN "rawData"->'data'
                      ELSE '[]'::jsonb 
                    END
                 )
               ) as flattened
          WHERE "RawDataLake".id = (SELECT id FROM "RawDataLake" ORDER BY "ingestedAt" DESC LIMIT 1)
        `;

        await ctx.db.$executeRawUnsafe(query);

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
      await ctx.db.$executeRawUnsafe(`DROP TABLE IF EXISTS "${input.tableName}" CASCADE`);
      return { success: true };
    }),

  updateCell: publicProcedure
    .input(z.object({ tableName: z.string(), rowId: z.string(), column: z.string(), value: z.any() }))
    .mutation(async ({ ctx, input }) => {
      const val = typeof input.value === 'string' ? `'${input.value}'` : input.value;
      await ctx.db.$executeRawUnsafe(`UPDATE "${input.tableName}" SET "${input.column}" = ${val} WHERE id = '${input.rowId}'`);
      return { success: true };
    }),

    // Stubs for other UI calls
    saveQueryResults: publicProcedure.input(z.any()).mutation(async () => ({})),
    flattenRawData: publicProcedure.input(z.any()).mutation(async () => ({ tableName: 'refined_models' })),
    promoteToApp: publicProcedure.input(z.any()).mutation(async () => ({ count: 0 })),
});
