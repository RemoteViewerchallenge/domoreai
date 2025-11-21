import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc.js';
import * as dataRefinementService from '../services/dataRefinement.service.js';

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
});
