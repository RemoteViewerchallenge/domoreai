import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc.js';

// Stub implementation - these features require a real SQL database
// For now, we'll return empty results or throw not implemented errors

export const dataRefinementRouter = createTRPCRouter({
  listTables: publicProcedure.query(async ({ ctx }) => {
    // TODO: Implement with real database
    return [];
  }),

  listAllTables: publicProcedure.query(async ({ ctx }) => {
    // Return tables from SimpleDB
    // For now, return the raw data lake and models tables
    return [
      { name: 'providerConfig', type: 'table' },
      { name: 'rawDataLake', type: 'table' },
      { name: 'models', type: 'table' },
    ];
  }),

  getTableData: publicProcedure
    .input(z.object({ tableName: z.string(), limit: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      // Return data from Prisma based on table name
      const { tableName, limit = 100 } = input;
      
      if (tableName === 'providerConfig') {
        const data = await ctx.db.providerConfig.findMany({ take: limit });
        return { rows: data };
      } else if (tableName === 'rawDataLake') {
        const data = await ctx.db.rawDataLake.findMany({ take: limit });
        return { rows: data };
      } else if (tableName === 'models') {
        const data = await ctx.db.model.findMany({ take: limit });
        return { rows: data };
      }
      
      return { rows: [] };
    }),

  addProviderAndIngest: publicProcedure
    .input(z.object({
      label: z.string(),
      type: z.string(),
      apiKey: z.string(),
      baseURL: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Import here to avoid circular dependency
      const { RawModelService } = await import('../services/RawModelService.js');
      
      // 1. Create the provider config first
      const newProvider = await ctx.db.providerConfig.create({
        data: {
          label: input.label,
          type: input.type,
          apiKey: input.apiKey,
          baseURL: input.baseURL,
          isEnabled: true,
        }
      });
      
      // 2. Immediately fetch and snapshot the data
      try {
        const snapshot = await RawModelService.fetchAndSnapshot(newProvider.id);
        
        // 3. Return the table name for the UI to switch to
        return { 
          tableName: 'rawDataLake',
          providerId: newProvider.id,
          snapshotId: snapshot.id 
        };
      } catch (error: any) {
        // If fetch fails, still return success for provider creation
        console.error('Failed to fetch models:', error);
        return { 
          tableName: 'rawDataLake',
          providerId: newProvider.id,
          error: error.message 
        };
      }
    }),

  ingestProvider: publicProcedure
    .input(z.object({ providerConfigId: z.string() }))
    .mutation(async ({ input }) => {
      const { RawModelService } = await import('../services/RawModelService.js');
      
      const snapshot = await RawModelService.fetchAndSnapshot(input.providerConfigId);
      
      return { 
        success: true,
        tableName: 'rawDataLake',
        snapshotId: snapshot.id,
        message: `Fetched ${snapshot.provider} models`
      };
    }),

  saveQueryResults: publicProcedure
    .input(z.object({ query: z.string(), newTableName: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // For SimpleDB, we can't execute arbitrary SQL
      // This is a stub that would need Prisma or a real SQL database
      throw new Error("SQL query execution requires a real database. Use the API Explorer to fetch data instead.");
    }),

  promoteToApp: publicProcedure
    .input(z.object({ sourceTableName: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { sourceTableName } = input;

      // 1. Fetch the refined data from your temporary SQL table
      // We use $queryRawUnsafe because the table name is dynamic
      const rows = await ctx.db.$queryRawUnsafe<any[]>(
        `SELECT * FROM "${sourceTableName}"`
      );

      if (!rows || rows.length === 0) {
        return { count: 0, message: "No rows found in staging table." };
      }

      let promotedCount = 0;

      // 2. Upsert each row into the real 'Model' table
      for (const row of rows) {
        // Map your SQL columns to the new Prisma Schema fields
        // Note: Ensure your SQL query outputs these exact column names!
        await ctx.db.model.upsert({
          where: {
            providerId_modelId: {
              providerId: row.provider_id, // Map from SQL 'provider_id'
              modelId: row.model_id        // Map from SQL 'model_id'
            }
          },
          create: {
            providerId: row.provider_id,
            modelId: row.model_id,
            name: row.name,
            // THE NEW FIELDS YOUR AGENT ADDED:
            costPer1k: parseFloat(row.cost_per_1k || '0'),
            limitRequestRate: parseInt(row.limit_request_rate || '0'),
            limitWindow: parseInt(row.limit_window || '60'),
            providerData: row.raw_data || {},
          },
          update: {
            // Update limits if they changed
            costPer1k: parseFloat(row.cost_per_1k || '0'),
            limitRequestRate: parseInt(row.limit_request_rate || '0'),
            limitWindow: parseInt(row.limit_window || '60'),
          }
        });
        promotedCount++;
      }

      return { count: promotedCount, message: `Successfully promoted ${promotedCount} models.` };
    }),

  executeQuery: publicProcedure
    .input(z.object({ query: z.string() }))
    .mutation(async ({ ctx, input }) => {
      throw new Error("SQL query execution not implemented without Prisma");
    }),

  deleteTable: publicProcedure
    .input(z.object({ tableName: z.string() }))
    .mutation(async ({ ctx, input }) => {
      throw new Error("Table deletion not implemented without Prisma");
    }),

  renameTable: publicProcedure
    .input(z.object({ oldName: z.string(), newName: z.string() }))
    .mutation(async ({ ctx, input }) => {
      throw new Error("Table rename not implemented without Prisma");
    }),

  updateCell: publicProcedure
    .input(z.object({
      tableName: z.string(),
      columnName: z.string(),
      rowId: z.string(),
      value: z.any(),
    }))
    .mutation(async ({ ctx, input }) => {
      throw new Error("Cell update not implemented without Prisma");
    }),

  deleteRow: publicProcedure
    .input(z.object({ tableName: z.string(), rowId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      throw new Error("Row deletion not implemented without Prisma");
    }),

  promoteToProvider: publicProcedure
    .input(z.object({ rawDataId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      throw new Error("Provider promotion not implemented without Prisma");
    }),

  flattenRawData: publicProcedure
    .input(z.object({ rawDataId: z.string(), tableName: z.string() }))
    .mutation(async ({ ctx, input }) => {
      throw new Error("Data flattening not implemented without Prisma");
    }),

  insertRow: publicProcedure
    .input(z.object({ tableName: z.string(), data: z.record(z.any()) }))
    .mutation(async ({ ctx, input }) => {
      throw new Error("Row insertion not implemented without Prisma");
    }),

  normalizeToModels: publicProcedure
    .input(z.object({ tableName: z.string() }))
    .mutation(async ({ ctx, input }) => {
      throw new Error("Model normalization not implemented without Prisma");
    }),
});
