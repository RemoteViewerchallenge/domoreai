import { createTRPCRouter, protectedProcedure, publicProcedure } from '../trpc.js';
import { ModelService } from '../services/model.service.js';
import { modelInputSchema } from '@repo/api-contract';
import { z } from 'zod';

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

  // --- MERGE TO C.O.R.E. WORKFLOW ---

  // 1. CLEAR C.O.R.E. (Unified Table)
  clearCoreModels: protectedProcedure
    .mutation(async ({ ctx }) => {
      await ctx.db.model.deleteMany({});
      return { success: true, message: 'Unified Model table cleared.' };
    }),

  // 2. SAVE ALIGNMENT (Persist mapping for future)
  saveTableMapping: protectedProcedure
    .input(z.object({
      tableName: z.string(),
      mapping: z.record(z.string()) // { sourceCol: destCol }
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.tableMapping.upsert({
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
      const rows = await ctx.db.$queryRawUnsafe(`SELECT * FROM "${sourceTableName}"`) as any[];
      if (!rows.length) throw new Error(`Table ${sourceTableName} is empty.`);

      // B. Fetch Saved Mapping (if any)
      const savedMap = await ctx.db.tableMapping.findUnique({
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
                await ctx.db.model.upsert({
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
        const rows = await ctx.db.$queryRaw`SELECT * FROM "my_free_models"` as any[];
        
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
});
