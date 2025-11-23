import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc.js';

// Stub implementation - these features require a real SQL database
// For now, we'll return empty results or throw not implemented errors

export const dataRefinementRouter = createTRPCRouter({
  listTables: publicProcedure.query(async ({ ctx }) => {
    // TODO: Implement with real database
    return [];
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
