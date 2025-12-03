import { prisma } from '../db.js';
import type { Model } from '@prisma/client';

export interface DynamicModel {
  id: string;
  providerConfigId: string;
  cost: number;
  contextWindow: number;
  priority?: number;
  group_id?: string;
  target_usage_percent?: number;
  error_penalty?: boolean;
  rpm_limit?: number;
  rpd_limit?: number;
  is_free_tier?: boolean;
  metadata?: Record<string, unknown>;
}

// Interface for raw database rows from dynamic tables
interface RawModelRow {
  [key: string]: unknown;
}

export class DynamicModelAdapter {
  // Configurable mapping: Maps your SQL columns to our internal System requirements
  // You can change this config at runtime or load it from a DB settings table
  private static COLUMN_MAPPING = {
    id: 'model_id',
    providerConfigId: 'config_id',
    contextWindow: 'context_length',
    cost: 'cost_per_token',
    isFree: 'is_free_tier',
    priority: 'priority',
    groupId: 'group_id',
    targetUsagePercent: 'target_usage_percent',
    errorPenalty: 'error_penalty',
    rpmLimit: 'rpm_limit',
    rpdLimit: 'rpd_limit',
  };

  /**
   * Reads models from ANY table you created in the Data Lake.
   * @param tableName The name of the table you created via the UI
   */
  static async loadModelsFromTable(tableName: string): Promise<DynamicModel[]> {
    // Safety check to prevent SQL injection on table name
    // (Your dataRefinement service already has sanitizeName, ensuring this is safe)
    
    try {
      // NOTE: This requires Prisma with $queryRawUnsafe support
      // For now, we'll fall back to SimpleDB if this fails
      if (typeof prisma.$queryRawUnsafe === 'function') {
        const rows = await prisma.$queryRawUnsafe<RawModelRow[]>(`SELECT * FROM "${tableName}"`);
        
        return rows.map((row) => ({
          id: (row[this.COLUMN_MAPPING.id] || row.model_id || row.id) as string,
          // This links the model to a specific API Key in ProviderManager
          providerConfigId: (row[this.COLUMN_MAPPING.providerConfigId] || row.config_id || row.providerConfigId) as string,
          
          // Parse generic fields
          cost: Number(row[this.COLUMN_MAPPING.cost] || row.cost_per_token || row.cost || 0),
          contextWindow: Number(row[this.COLUMN_MAPPING.contextWindow] || row.context_length || row.contextWindow || 4096),
          
          // Custom placement logic fields
          priority: (row[this.COLUMN_MAPPING.priority] || row.priority || 50) as number,
          group_id: (row[this.COLUMN_MAPPING.groupId] || row.group_id) as string | undefined,
          target_usage_percent: (row[this.COLUMN_MAPPING.targetUsagePercent] || row.target_usage_percent) as number | undefined,
          error_penalty: (row[this.COLUMN_MAPPING.errorPenalty] || row.error_penalty || false) as boolean,
          
          // Rate limit fields
          rpm_limit: (row[this.COLUMN_MAPPING.rpmLimit] || row.rpm_limit) as number | undefined,
          rpd_limit: (row[this.COLUMN_MAPPING.rpdLimit] || row.rpd_limit) as number | undefined,
          is_free_tier: (row[this.COLUMN_MAPPING.isFree] || row.is_free_tier || false) as boolean,
          
          // Store all other fields as metadata
          metadata: row,
        }));
      } else {
        // Fall back to SimpleDB
        console.warn(`SimpleDB doesn't support raw SQL queries, falling back to loadModelsFromSimpleDB`);
        return this.loadModelsFromSimpleDB();
      }
    } catch (error) {
      console.error(`Failed to load models from dynamic table "${tableName}":`, error);
      // Fall back to SimpleDB
      return this.loadModelsFromSimpleDB();
    }
  }

  /**
   * Fallback: Load from Prisma models table if no custom table exists
   */
  static async loadModelsFromSimpleDB(): Promise<DynamicModel[]> {
    try {
      const models = await prisma.model.findMany();
      return models.map((m: Model) => ({
        id: m.modelId, // Use modelId as the primary ID for logic
        providerConfigId: m.providerId,
        cost: m.costPer1k || 0,
        contextWindow: m.contextWindow || 4096,
        priority: 50, // Default priority
        group_id: undefined,
        target_usage_percent: undefined,
        error_penalty: false,
        rpm_limit: m.limitRequestRate || undefined,
        rpd_limit: undefined, // No direct mapping for RPD in standard model
        is_free_tier: m.isFree,
        metadata: m as unknown as Record<string, unknown>,
      }));
    } catch (error) {
      console.error('Failed to load models from Prisma:', error);
      return [];
    }
  }
}

