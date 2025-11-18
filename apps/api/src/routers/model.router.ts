import { createTRPCRouter, protectedProcedure, z } from '@repo/api-contract';
import { ModelService } from '../services/model.service.js';
import { modelInputSchema } from '@repo/api-contract';

const modelService = new ModelService();

export const modelRouter = createTRPCRouter({
  saveNormalizedModel: protectedProcedure
    .input(modelInputSchema)
    .mutation(({ input }) => {
      return modelService.saveNormalizedModel(input);
    }),
});
