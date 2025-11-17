import { createTRPCRouter, protectedProcedure } from '../trpc.js';
import { ModelService } from '../services/model.service.js';
import { modelInputSchema } from './types.js';

const modelService = new ModelService();

export const modelRouter = createTRPCRouter({
  saveNormalizedModel: protectedProcedure
    .input(modelInputSchema)
    .mutation(({ input }) => {
      return modelService.saveNormalizedModel(input);
    }),
});
