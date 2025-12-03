import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc.js';

export const apiExplorerRouter = createTRPCRouter({
  executeRequest: publicProcedure
    .input(z.object({
      method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
      url: z.string().url(),
      headers: z.record(z.string()).optional(),
      body: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        const startTime = Date.now();
        const response = await fetch(input.url, {
          method: input.method,
          headers: { 'Content-Type': 'application/json', ...input.headers },
          body: input.method !== 'GET' && input.body ? input.body : undefined,
        });
        const duration = Date.now() - startTime;
        
        let data;
        const text = await response.text();
        try { data = JSON.parse(text); } catch { data = { raw: text }; }

        return {
          success: response.ok,
          status: response.status,
          duration,
          data,
        };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    }),

  saveResponse: publicProcedure
    .input(z.object({ providerName: z.string(), data: z.any() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.rawDataLake.create({
        data: { provider: input.providerName, rawData: input.data }
      });
    })
});
