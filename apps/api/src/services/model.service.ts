import { prisma } from '../db.js';
import { z } from 'zod';
import { modelInputSchema } from '@repo/api-contract';
import type { Prisma } from '@prisma/client';
import { ModelDoctor } from './ModelDoctor.js';

type ModelInput = z.infer<typeof modelInputSchema>;

interface FreeModelRow {
  id?: string;
  model_id?: string;
  name?: string;
  model_name?: string;
  context_length?: number;
  context_window?: number;
  contextWindow?: number;
  provider?: string;
}

interface UnifiedModelRow {
  id: string;
  name: string;
  context_length: number;
  provider: string;
  source: string;
}

export class ModelService {
  async saveNormalizedModel(input: ModelInput) {
    const { providerId, modelId, name, isFree, contextWindow, hasVision, hasReasoning, hasCoding, providerData } = input;

    // [RESILIENCE] Pack strict columns into the Triple Layer (specs)
    const specsData = {
        contextWindow,
        hasVision,
        hasReasoning,
        hasCoding,
        lastUpdated: new Date().toISOString()
    };

    // Simple implementation with our JSON DB
    return prisma.model.upsert({
      where: {
        providerId_modelId: { providerId, modelId },
      },
      update: {
        name,
        isFree,
        // Update JSON layers instead of (possibly removed) columns
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
  }

  async listModels() {
    return prisma.model.findMany({
      include: {
        provider: true,
      },
    });
  }

  async importModels(models: ModelInput[]) {
    let successCount = 0;
    for (const model of models) {
      const { providerId, modelId, name, isFree, contextWindow, hasVision, hasReasoning, hasCoding, providerData } = model;
      const specsData = {
          contextWindow,
          hasVision,
          hasReasoning,
          hasCoding,
          lastUpdated: new Date().toISOString()
      };
      await prisma.model.upsert({
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
    return { imported: successCount, total: models.length };
  }

  async clearCoreModels() {
    await prisma.model.deleteMany({});
    return { success: true, message: 'Unified Model table cleared.' };
  }

  async saveTableMapping(tableName: string, mapping: Record<string, string>) {
    await prisma.tableMapping.upsert({
      where: { tableName },
      create: { tableName, mapping },
      update: { mapping }
    });
    return { success: true };
  }

  async mergeFromTable(sourceTableName: string, providerId?: string) {
    // A. Fetch Raw Data using Unsafe Query
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM "${sourceTableName}"`);
    if (!rows.length) throw new Error(`Table ${sourceTableName} is empty.`);

    // B. Fetch Saved Mapping (if any)
    const savedMap = await prisma.tableMapping.findUnique({
      where: { tableName: sourceTableName }
    });
    const mapping = (savedMap?.mapping as Record<string, string>) || {};

    let successCount = 0;

    for (const row of rows) {
      // C. Construct Model Object using Mapping + Fuzzy Matching
      const safeRow = row as Record<string, unknown>;
      const modelData: Record<string, any> = {
         providerId: providerId || 'generic-import',
         providerData: safeRow
      };

      const getValue = (targetField: string) => {
        // 1. Explicit mapping
        const mappedCol = Object.keys(mapping).find(key => mapping[key] === targetField);
        if (mappedCol && safeRow[mappedCol] !== undefined) return safeRow[mappedCol];
        // 2. Exact match
        if (safeRow[targetField] !== undefined) return safeRow[targetField];
        // 3. Fuzzy Match
        const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
        const rowKey = Object.keys(safeRow).find(k => {
           const normK = normalize(k);
           const normT = normalize(targetField);
           if (targetField === 'contextWindow' && (normK.includes('length') || normK.includes('context'))) return true;
           if (targetField === 'modelId' && (normK === 'id' || normK === 'slug')) return true;
           return normK === normT;
        });
        return rowKey ? safeRow[rowKey] : undefined;
      };

      modelData.name = getValue('name') || safeRow.id || 'Unknown';
      modelData.modelId = getValue('modelId') || safeRow.id;
      modelData.contextWindow = Number(getValue('contextWindow')) || 4096;
      modelData.costPer1k = Number(getValue('costPer1k')) || 0;

      // D. Upsert into Unified Table
      if (modelData.modelId && providerId) {
          await prisma.model.upsert({
              where: { providerId_modelId: { providerId: providerId, modelId: modelData.modelId } },
              create: {
                  providerId: String(modelData.providerId),
                  modelId: String(modelData.modelId),
                  name: String(modelData.name),
                  isFree: true,
                  isActive: true,
                  specs: { 
                      contextWindow: Number(modelData.contextWindow || 4096),
                      costPer1k: Number(modelData.costPer1k || 0)
                  },
                  providerData: safeRow as Prisma.InputJsonValue,
                  source: 'MANUAL'
              },
              update: {
                  name: String(modelData.name),
                  providerData: safeRow as Prisma.InputJsonValue,
                  specs: { 
                      contextWindow: Number(modelData.contextWindow || 4096),
                      costPer1k: Number(modelData.costPer1k || 0)
                  }
              }
          });
          successCount++;
      }
    }

    return { imported: successCount, total: rows.length };
  }



  async listRefinedModels() {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = await prisma.$queryRaw<FreeModelRow[]>`SELECT * FROM "my_free_models"`;
      return rows.map((row) => ({
        id: row.id || row.model_id || row.name || 'unknown',
        name: row.name || row.model_name || 'Unknown Model',
        contextLength: Number(row.context_length || row.context_window || row.contextWindow || 0),
        provider: row.provider || 'unknown'
      }));
    } catch (error: any) {
      if (error?.meta?.code === '42P01' || error?.code === '42P01') {
        console.warn("Table 'my_free_models' does not exist yet.");
        return [];
      }
      console.error("Failed to fetch my_free_models table:", error);
      return [];
    }
  }

  async getUnifiedModelList() {
    try {
      // 1. Get all dynamic tables that are registered
      const tables = await prisma.flattenedTable.findMany({
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const columnsRaw = await prisma.$queryRawUnsafe<{ column_name: string }[]>(
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
          continue;
        }
      }

      if (queries.length === 0) {
        return [];
      }

      const fullQuery = queries.join(' UNION ALL ');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = await prisma.$queryRawUnsafe<UnifiedModelRow[]>(fullQuery);

      return rows.map((row) => ({
        id: row.id,
        name: row.name,
        contextLength: Number(row.context_length || 0),
        provider: row.provider,
        source: row.source
      }));

    } catch (error) {
      console.error("Failed to fetch unified model list:", error);
      return [];
    }
  }

  async runDoctor(force: boolean = false) {
    const doctor = new ModelDoctor();
    return await doctor.healModels(force);
  }
}
