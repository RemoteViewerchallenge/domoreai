import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc.js';

export const gitRouter = createTRPCRouter({
  status: protectedProcedure.query(async () => {
    return { branch: 'main', clean: true };
  }),

  commit: protectedProcedure
    .input(z.object({ message: z.string() }))
    .mutation(async () => {
      return { hash: 'stub' };
    })
});
