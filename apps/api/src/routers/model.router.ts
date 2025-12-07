import { createTRPCRouter, protectedProcedure, publicProcedure } from '../trpc.js';
import { ModelService } from '../services/model.service.js';
import { ModelDoctor } from '../services/ModelDoctor.js';
import { modelInputSchema } from '@repo/api-contract';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';

const modelService = new ModelService();

export const modelRouter = createTRPCRouter({
  saveNormalizedModel: protectedProcedure
    .input(modelInputSchema)
    .mutation(({ input }) => {
      return modelService.saveNormalizedModel(input);
    }),

  list: publicProcedure
    .query(() => {
      return modelService.listModels();
    }),

  export: publicProcedure
    .query(() => {
      return modelService.listModels();
    }),

  import: protectedProcedure
    .input(z.array(modelInputSchema))
    .mutation(async ({ ctx, input }) => {
      let successCount = 0;
      for (const model of input) {
        const { providerId, modelId, name, isFree, contextWindow, hasVision, hasReasoning, hasCoding, providerData } = model;
        const specsData = {
            contextWindow,
            hasVision,
            hasReasoning,
            hasCoding,
            lastUpdated: new Date().toISOString()
        };
        await ctx.prisma.model.upsert({
          where: {
            providerId_modelId: { providerId, modelId },
          },
          update: {
            name,
            isFree,
            specs: specsData as Prisma.InputJsonValue,
            providerData: providerData as Prisma.InputJsonValue,
          },
          create: {
            providerId,
            modelId,
            name,
            isFree,
            specs: specsData as Prisma.InputJsonValue,
            providerData: providerData as Prisma.InputJsonValue,
          },
        });
        successCount++;
      }
      return { imported: successCount, total: input.length };
    }),

  // --- MERGE TO C.O.R.E. WORKFLOW ---

  // 1. CLEAR C.O.R.E. (Unified Table)
  clearCoreModels: protectedProcedure
    .mutation(async ({ ctx }) => {
      await ctx.prisma.model.deleteMany({});
      return { success: true, message: 'Unified Model table cleared.' };
    }),

  // 2. SAVE ALIGNMENT (Persist mapping for future)
  saveTableMapping: protectedProcedure
    .input(z.object({
      tableName: z.string(),
      mapping: z.record(z.string()) // { sourceCol: destCol }
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.tableMapping.upsert({
        where: { tableName: input.tableName },
        create: { tableName: input.tableName, mapping: input.mapping },
        update: { mapping: input.mapping }
      });
      return { success: true };
    }),

  // 3. MERGE TO C.O.R.E. (The Heavy Lifter)
  mergeToCore: protectedProcedure
    .input(z.object({
      sourceTableName: z.string(), // e.g. "openrouterfree"
      providerId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { sourceTableName } = input;

      // A. Fetch Raw Data using Unsafe Query (Bypasses Prisma typing for dynamic tables)
      const rows = await ctx.prisma.$queryRawUnsafe(`SELECT * FROM "${sourceTableName}"`) as any[];
      if (!rows.length) throw new Error(`Table ${sourceTableName} is empty.`);

      // B. Fetch Saved Mapping (if any)
      const savedMap = await ctx.prisma.tableMapping.findUnique({
        where: { tableName: sourceTableName }
      });
      const mapping = (savedMap?.mapping as Record<string, string>) || {};

      // C. Define Target Fields
      const targetFields = ['name', 'modelId', 'contextWindow', 'costPer1k', 'maxTokens'];

      let successCount = 0;

      for (const row of rows) {
        // D. Construct Model Object using Mapping + Fuzzy Matching
        const modelData: any = {
           providerId: input.providerId || 'generic-import',
           providerData: row
        };

        const getValue = (targetField: string) => {
          // 1. Explicit mapping
          const mappedCol = Object.keys(mapping).find(key => mapping[key] === targetField);
          if (mappedCol && row[mappedCol] !== undefined) return row[mappedCol];
          // 2. Exact match
          if (row[targetField] !== undefined) return row[targetField];
          // 3. Fuzzy Match
          const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
          const rowKey = Object.keys(row).find(k => {
             const normK = normalize(k);
             const normT = normalize(targetField);
             if (targetField === 'contextWindow' && (normK.includes('length') || normK.includes('context'))) return true;
             if (targetField === 'modelId' && (normK === 'id' || normK === 'slug')) return true;
             return normK === normT;
          });
          return rowKey ? row[rowKey] : undefined;
        };

        modelData.name = getValue('name') || row.id || 'Unknown';
        modelData.modelId = getValue('modelId') || row.id;
        modelData.contextWindow = Number(getValue('contextWindow')) || 4096;
        modelData.costPer1k = Number(getValue('costPer1k')) || 0;
        
        // E. Upsert into Unified Table
        if (modelData.modelId) {
            if (input.providerId) {
                await ctx.prisma.model.upsert({
                    where: { providerId_modelId: { providerId: input.providerId, modelId: modelData.modelId } },
                    create: modelData,
                    update: modelData
                });
                successCount++;
            }
        }
      }

      return { imported: successCount, total: rows.length };
    }),

  // [LEGACY/DIRECT ACCESS] Real implementation fetching directly from 'openrouterfree'
  // [LEGACY/DIRECT ACCESS] Real implementation fetching directly from 'my_free_models'
  listRefinedModels: publicProcedure
    .query(async ({ ctx }) => {
      try {
        // Query the user's "my_free_models" table (or whatever they named it)
        // We assume the user wants 'my_free_models' as the source of truth now.
        const rows = await ctx.prisma.$queryRaw`SELECT * FROM "my_free_models"` as any[];
        
        return rows.map((row: any) => ({
          id: row.id || row.model_id || row.name,
          name: row.name || row.model_name || 'Unknown Model',
          // Handle various casing/naming conventions for context length
          contextLength: Number(row.context_length || row.context_window || row.contextWindow || 0), 
          provider: row.provider || 'unknown'
        }));
      } catch (error: any) {
        // Suppress "relation does not exist" error (Code 42P01)
        if (error?.meta?.code === '42P01' || error?.code === '42P01') {
          console.warn("Table 'my_free_models' does not exist yet.");
          return [];
        }
        console.error("Failed to fetch my_free_models table:", error);
        return [];
      }
    }),
  // [NEW] Unified Model List (Aggregates from all dynamic tables)
  getUnifiedModelList: publicProcedure
    .query(async ({ ctx }) => {
      try {
        // 1. Get all dynamic tables that are registered
        const tables = await ctx.prisma.flattenedTable.findMany({
          select: { name: true }
        });

        if (tables.length === 0) {
          return [];
        }

        // 2. For each table, detect its columns and build a compatible query
        const queries: string[] = [];
        
        for (const t of tables) {
          try {
            // Get columns for this table
            const columnsRaw = await ctx.prisma.$queryRawUnsafe<{ column_name: string }[]>(
              `SELECT column_name FROM information_schema.columns 
               WHERE table_name = '${t.name}' 
               AND table_schema = 'public'`
            );
            const columns = columnsRaw.map(c => c.column_name);

            // Detect common columns with fallbacks
            const idCol = ['id', 'model_id', 'modelId'].find(c => columns.includes(c)) || 'id';
            const nameCol = ['name', 'model_name', 'modelName', 'model_id', 'id'].find(c => columns.includes(c)) || idCol;
            const contextCol = ['context_length', 'context_window', 'contextWindow', 'contextLength'].find(c => columns.includes(c));
            const providerCol = ['provider', 'provider_id', 'providerId', 'data_source'].find(c => columns.includes(c));

            // Build query with COALESCE for safety
            const selectParts = [
              `'${t.name}' as source`,
              `COALESCE("${idCol}"::text, 'unknown') as id`,
              `COALESCE("${nameCol}"::text, "${idCol}"::text, 'unknown') as name`,
              contextCol ? `COALESCE("${contextCol}"::numeric, 0) as context_length` : '0 as context_length',
              providerCol ? `COALESCE("${providerCol}"::text, 'unknown') as provider` : `'unknown' as provider`
            ];

            queries.push(`SELECT ${selectParts.join(', ')} FROM "${t.name}"`);
          } catch (err) {
            console.error(`Failed to build query for table ${t.name}:`, err);
            // Skip this table if we can't query its structure
            continue;
          }
        }

        if (queries.length === 0) {
          return [];
        }

        const fullQuery = queries.join(' UNION ALL ');

        // 3. Execute
        const rows = await ctx.prisma.$queryRawUnsafe(fullQuery) as any[];

        return rows.map((row: any) => ({
          id: row.id,
          name: row.name,
          contextLength: Number(row.context_length || 0),
          provider: row.provider,
          source: row.source
        }));

      } catch (error) {
        console.error("Failed to fetch unified model list:", error);
        // Fallback to empty list or handle gracefully
        return [];
      }
    }),

  // NEW PROCEDURE:
  runDoctor: protectedProcedure
    .input(z.object({ force: z.boolean().optional() }))
    .mutation(async ({ input }) => {
      const doctor = new ModelDoctor();
      const stats = await doctor.healModels(input.force);
      return stats;
    }),
});
