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
  }),

  runDoctor: protectedProcedure
    .input(z.object({ force: z.boolean().optional() }).optional())
    .mutation(async () => {
        // Stubbed for now
        return { success: true };
    })
});
