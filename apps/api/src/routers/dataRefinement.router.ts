import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc.js';
import * as dataRefinementService from '../services/dataRefinement.service.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const dataRefinementRouter = createTRPCRouter({
  /**
   * Flatten raw JSON data into a Postgres table
   */
  flattenRawData: publicProcedure
    .input(
      z.object({
        rawDataId: z.string(),
        tableName: z.string(),
      })
    )
    .mutation(async ({ input }: { input: { rawDataId: string; tableName: string } }) => {
      return await dataRefinementService.flattenRawData(
        input.rawDataId,
        input.tableName
      );
    }),

  /**
   * List all flattened tables
   */
  listFlattenedTables: publicProcedure.query(async () => {
    return await dataRefinementService.listFlattenedTables();
  }),

  /**
   * [NEW] List ALL tables in the database
   */
  listAllTables: publicProcedure.query(async ({ ctx }) => {
    const tables = await ctx.db.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename
    `;
    return tables.map(t => t.tablename);
  }),

  /**
   * Get data from a flattened table
   */
  getTableData: publicProcedure
    .input(
      z.object({
        tableName: z.string(),
        limit: z.number().optional().default(100),
      })
    )
    .query(async ({ input }: { input: { tableName: string; limit?: number } }) => {
      return await dataRefinementService.getTableData(
        input.tableName,
        input.limit
      );
    }),

  /**
   * Execute a SQL query (SELECT only)
   */
  executeQuery: publicProcedure
    .input(
      z.object({
        query: z.string(),
      })
    )
    .mutation(async ({ input }: { input: { query: string } }) => {
      return await dataRefinementService.executeQuery(input.query);
    }),

  /**
   * Promote data from RawDataLake to Model table via custom query
   */
  promoteDataToModels: publicProcedure
    .input(z.object({
      query: z.string(),
      providerId: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      // Execute the SELECT query; expect rows with model fields
      const results = await ctx.db.$queryRawUnsafe<any[]>(input.query);

      if (!results || results.length === 0) {
        return { count: 0, message: 'Query returned no rows.' };
      }

      // Upsert each result into the Model table
      const upserts = results.map(row => {
        return ctx.db.model.upsert({
          where: {
            providerId_modelId: {
              providerId: input.providerId,
              modelId: row.modelId || row.id
            }
          },
          create: {
            providerId: input.providerId,
            modelId: row.modelId || row.id,
            name: row.name || row.modelId,
            contextWindow: row.contextWindow || row.context_window || 4096,
            providerData: row.providerData || row,
          },
          update: {
            name: row.name || row.modelId,
            contextWindow: row.contextWindow || row.context_window || 4096,
            providerData: row.providerData || row,
          }
        });
      });

      await Promise.all(upserts);
      return { count: upserts.length, message: `${upserts.length} models promoted successfully.` };
    }),

  /**
   * [NEW] Delete a table from the database
   */
  deleteTable: publicProcedure
    .input(z.object({ tableName: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Prevent deleting system tables
      const protectedTables = ['_prisma_migrations', 'User', 'Session', 'Role', 'Provider', 'Model'];
      if (protectedTables.includes(input.tableName)) {
        throw new Error("Cannot delete system tables.");
      }

      // Delete the Postgres table
      await ctx.db.$executeRawUnsafe(`DROP TABLE IF EXISTS "${input.tableName}"`);
      
      // Also delete the metadata record
      await ctx.db.flattenedTable.deleteMany({
        where: { name: input.tableName }
      });
      
      return { success: true };
    }),

  /**
   * Save query results to a new table
   */
  saveQueryResults: publicProcedure
    .input(
      z.object({
        query: z.string(),
        newTableName: z.string(),
        sourceTableId: z.string().optional(),
      })
    )
    .mutation(async ({ input }: { input: { query: string; newTableName: string; sourceTableId?: string } }) => {
      return await dataRefinementService.saveQueryResults(
        input.query,
        input.newTableName,
        input.sourceTableId
      );
    }),

  /**
   * [NEW] Delete a table from the database
   */
  dropTable: publicProcedure
    .input(z.object({ tableName: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Prevent deleting system tables
      const protectedTables = ['_prisma_migrations', 'User', 'Session', 'Role', 'Provider', 'Model'];
      if (protectedTables.includes(input.tableName)) {
        throw new Error("Cannot delete system tables.");
      }

      // Delete the Postgres table
      await ctx.db.$executeRawUnsafe(`DROP TABLE IF EXISTS "${input.tableName}"`);
      
      // Also delete the metadata record
      await ctx.db.flattenedTable.deleteMany({
        where: { name: input.tableName }
      });
      
      return { success: true };
    }),

  /**
   * [NEW] The "Canonize" Button
   * Runs 'prisma db pull' to generate the schema from your DB changes
   */
  syncPrismaSchema: publicProcedure
    .mutation(async () => {
      try {
        const { stdout, stderr } = await execAsync('npx prisma db pull', {
          cwd: process.cwd()
        });
        return { success: true, log: stdout };
      } catch (error: any) {
        console.error("Prisma Pull Failed:", error);
        throw new Error(`Schema sync failed: ${error.message}`);
      }
    }),

  /**
   * [NEW] Generic Update for Data Lake cells
   */
  updateTableCell: publicProcedure
    .input(z.object({
      tableName: z.string(),
      rowId: z.string(),
      column: z.string(),
      value: z.any()
    }))
    .mutation(async ({ ctx, input }) => {
      // WARNING: Use with caution - raw SQL for flexibility
      const query = `UPDATE "${input.tableName}" SET "${input.column}" = $1 WHERE id = $2`;
      await ctx.db.$executeRawUnsafe(query, input.value, input.rowId);
      return { success: true };
    }),

  /**
   * [NEW] Add column to a table dynamically
   */
  addColumn: publicProcedure
    .input(z.object({
      tableName: z.string(),
      columnName: z.string(),
      columnType: z.string().default('TEXT')
    }))
    .mutation(async ({ ctx, input }) => {
      const query = `ALTER TABLE "${input.tableName}" ADD COLUMN "${input.columnName}" ${input.columnType}`;
      await ctx.db.$executeRawUnsafe(query);
      return { success: true };
    }),

  /**
   * [NEW] The "Zero-Touch" Pipeline
   * 1. Creates Provider
   * 2. Fetches Data
   * 3. Auto-Flattens to a real Table
   * Returns the Table Name so the UI can load it immediately.
   */
  addProviderAndIngest: publicProcedure
    .input(z.object({
      name: z.string(),
      providerType: z.string(),
      baseURL: z.string(),
      apiKey: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // 1. Create Provider
      const provider = await ctx.db.provider.create({
        data: {
          name: input.name,
          providerType: input.providerType,
          baseURL: input.baseURL,
          // apiKey: input.apiKey, // REMOVED: Not in schema yet, or handled separately
        }
      });

      // 2. Ingest Data (Simulated/Basic for now)
      // We will create a dummy entry in RawDataLake to represent the "fetched" data
      // In a real scenario, this would call the adapter to fetch models
      const dummyData = {
        id: `model-${Date.now()}`,
        name: `${input.name} Default Model`,
        context_length: 4096,
        provider: input.providerType
      };

      await ctx.db.rawDataLake.create({
        data: {
          provider: input.providerType,
          rawData: dummyData,
          ingestedAt: new Date()
        }
      });
      
      // 3. Auto-Flatten
      // We create a table named "staging_[providerName]"
      const tableName = `staging_${input.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      
      // Drop if exists (clean slate for new provider setup)
      await ctx.db.$executeRawUnsafe(`DROP TABLE IF EXISTS "${tableName}"`);
      
      // Create the table from RawDataLake (The "Best Effort" flatten)
      // We explicitly cast JSON fields to text or int to ensure table creation works
      const sql = `
        CREATE TABLE "${tableName}" AS
        SELECT 
          id,
          provider,
          rawData->>'id' as model_id,
          rawData->>'name' as name,
          (rawData->>'context_length')::int as context_length,
          rawData 
        FROM "RawDataLake"
        WHERE provider = '${input.providerType}'
      `;
      await ctx.db.$executeRawUnsafe(sql);

      // Register the table in FlattenedTable metadata so it shows up in lists
      await ctx.db.flattenedTable.create({
        data: {
          name: tableName,
          sourceId: 'auto-generated', // Placeholder
          columns: [], // Placeholder
        }
      });

      return { success: true, tableName };
    }),

  /**
   * [NEW] The "Merge to Master"
   * Takes your experimental table and merges it into the official "Model" table.
   * This handles the "Imperfect Alignment" by mapping columns explicitly.
   */
  promoteToApp: publicProcedure
    .input(z.object({
      sourceTableName: z.string(),
      // Optional: Map source columns to destination columns if they differ
      columnMapping: z.record(z.string()).optional() 
    }))
    .mutation(async ({ ctx, input }) => {
      // We use INSERT ... SELECT ... ON CONFLICT
      // This allows the source table to have extra columns that we just ignore
      // Note: We need to look up the providerId based on the provider name in the source table
      const sql = `
        INSERT INTO "Model" ("id", "providerId", "name", "contextWindow", "providerData")
        SELECT 
           model_id, 
           (SELECT id FROM "Provider" WHERE "providerType" = provider LIMIT 1), -- Dynamic lookup based on provider type
           name, 
           COALESCE(context_length, 4096),
           "rawData"
        FROM "${input.sourceTableName}"
        ON CONFLICT ("providerId", "modelId") 
        DO UPDATE SET 
           "contextWindow" = EXCLUDED."contextWindow",
           "name" = EXCLUDED."name",
           "providerData" = EXCLUDED."providerData"
      `;
      
      const result = await ctx.db.$executeRawUnsafe(sql);
      return { success: true, count: Number(result) };
    }),

  /**
   * [NEW] Auto-Flatten Raw Data to Table
   * Extracts common fields from JSON and creates a table.
   */
  autoFlatten: publicProcedure
    .input(z.object({ tableName: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // 1. Create Table AS Select ...
      // This grabs common fields. For truly dynamic columns, we stick to the JSONB view.
      // This is a "Best Effort" auto-flattener.
      const sql = `
        CREATE TABLE "${input.tableName}" AS
        SELECT 
          id,
          provider,
          rawData->>'id' as model_id,
          rawData->>'name' as name,
          (rawData->>'context_length')::int as context_length,
          (rawData->'pricing'->>'prompt')::numeric as price_prompt,
          (rawData->'pricing'->>'completion')::numeric as price_completion
        FROM "RawDataLake"
      `;
      await ctx.db.$executeRawUnsafe(sql);
      
      // Register metadata
      await ctx.db.flattenedTable.create({
        data: {
          name: input.tableName,
          sourceId: 'auto-flattened',
          columns: [],
        }
      });

      return { success: true };
    }),
});
