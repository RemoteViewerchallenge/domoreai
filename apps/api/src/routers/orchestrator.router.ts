import { z } from 'zod';
import { createTRPCRouter, publicProcedure, protectedProcedure } from '../trpc.js';

export const orchestratorRouter = createTRPCRouter({
  getConfig: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.orchestratorConfig.upsert({
      where: { id: 'global' },
      update: {},
      create: { activeTableName: 'unified_models' }
    });
  }),

  updateConfig: protectedProcedure
    .input(z.object({ activeTableName: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.orchestratorConfig.update({
        where: { id: 'global' },
        data: { activeTableName: input.activeTableName }
      });
    }),

  setActiveRegistry: protectedProcedure
    .input(z.object({ tableName: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.orchestratorConfig.upsert({
        where: { id: 'global' },
        update: { activeTableName: input.tableName },
        create: { id: 'global', activeTableName: input.tableName }
      });
    }),

  getActiveRegistrySchema: protectedProcedure
    .query(async ({ ctx }) => {
      // 1. Get Active Table
      const config = await ctx.db.orchestratorConfig.findUnique({ where: { id: 'global' } });
      const tableName = config?.activeTableName || 'unified_models';

      // 2. Get Columns
      try {
        const columns = await ctx.db.$queryRawUnsafe<any[]>(
          `SELECT column_name as name, data_type as type 
           FROM information_schema.columns 
           WHERE table_name = '${tableName}' 
             AND table_schema = 'public'`
        );
        return { tableName, columns };
      } catch (error) {
        console.error("Failed to fetch schema:", error);
        return { tableName, columns: [] };
      }
    }),

  getActiveRegistryData: protectedProcedure
    .query(async ({ ctx }) => {
      // 1. Get Active Table
      const config = await ctx.db.orchestratorConfig.findUnique({ where: { id: 'global' } });
      const tableName = config?.activeTableName || 'unified_models';

      // 2. Fetch Data
      try {
        const rows = await ctx.db.$queryRawUnsafe<any[]>(
          `SELECT * FROM "${tableName}" LIMIT 2000` // Cap at 2000 for performance
        );
        return { tableName, rows };
      } catch (error) {
        console.error("Failed to fetch registry data:", error);
        return { tableName, rows: [] };
      }
    }),

  triggerProbe: protectedProcedure
    .input(z.object({ providerId: z.string(), modelId: z.string() }))
    .mutation(async ({ input }) => {
      // Import dynamically to avoid circular deps if any, or just import at top
      const { ProviderProbeService } = await import('../services/ProviderProbeService.js');
      await ProviderProbeService.probe(input.providerId, input.modelId);
      return { success: true };
    }),

  listTools: protectedProcedure
    .query(async () => {
      const { RegistryClient } = await import('../services/mcp-registry-client.js');
      return RegistryClient.listServers();
    }),
});
