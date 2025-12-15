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

  export: publicProcedure
    .query(() => {
      return modelService.listModels();
    }),

  import: protectedProcedure
    .input(z.array(modelInputSchema))
    .mutation(async ({ input }) => {
      return modelService.importModels(input);
    }),

  clearCoreModels: protectedProcedure
    .mutation(async () => {
      return modelService.clearCoreModels();
    }),

  saveTableMapping: protectedProcedure
    .input(z.object({
      tableName: z.string(),
      mapping: z.record(z.string()) // { sourceCol: destCol }
    }))
    .mutation(async ({ input }) => {
      return modelService.saveTableMapping(input.tableName, input.mapping);
    }),

  mergeToCore: protectedProcedure
    .input(z.object({
      sourceTableName: z.string(),
      providerId: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return modelService.mergeFromTable(input.sourceTableName, input.providerId);
    }),

  listRefinedModels: publicProcedure
    .query(async () => {
      return modelService.listRefinedModels();
    }),

  getUnifiedModelList: publicProcedure
    .query(async () => {
      return modelService.getUnifiedModelList();
    }),

  runDoctor: protectedProcedure
    .input(z.object({ force: z.boolean().optional() }))
    .mutation(async ({ input }) => {
      return modelService.runDoctor(input.force);
    }),
});
