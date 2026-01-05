import { z } from 'zod';
import { createTRPCRouter, publicProcedure, protectedProcedure } from '../trpc.js';

export const modelRouter = createTRPCRouter({
  list: publicProcedure.query(async () => {
    return [];
  }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async () => {
      return null;
    }),
    
  sync: protectedProcedure.mutation(async () => {
      return { synced: 0 };
  })
});
