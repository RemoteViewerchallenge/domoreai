import { z } from 'zod';
import { createTRPCRouter, publicProcedure, protectedProcedure } from '../trpc.js';

export const orchestratorRouter = createTRPCRouter({
  getConfig: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.orchestratorConfig.upsert({
      where: { id: 'global' },
      update: {},
      create: { activeTableName: 'unified_models' }
    });
  }),

  updateConfig: protectedProcedure
    .input(z.object({ activeTableName: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.orchestratorConfig.update({
        where: { id: 'global' },
        data: { activeTableName: input.activeTableName }
      });
    }),

  setActiveRegistry: protectedProcedure
    .input(z.object({ tableName: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.orchestratorConfig.upsert({
        where: { id: 'global' },
        update: { activeTableName: input.tableName },
        create: { id: 'global', activeTableName: input.tableName }
      });
    }),

  getActiveRegistrySchema: protectedProcedure
    .query(async ({ ctx }) => {
      // 1. Get Active Table
      const config = await ctx.prisma.orchestratorConfig.findUnique({ where: { id: 'global' } });
      const tableName = config?.activeTableName || 'unified_models';

      // 2. Get Columns
      try {
        const columns = await ctx.prisma.$queryRawUnsafe<any[]>(
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
      const config = await ctx.prisma.orchestratorConfig.findUnique({ where: { id: 'global' } });
      const tableName = config?.activeTableName || 'unified_models';

      // 2. Fetch Data
      try {
        const rows = await ctx.prisma.$queryRawUnsafe<any[]>(
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

  getToolExamples: protectedProcedure
    .input(z.object({ toolName: z.string() }))
    .query(async ({ input }) => {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      // Resolve path to .domoreai/tools
      let rootDir = process.cwd();
      if (rootDir.endsWith('apps/api')) {
          rootDir = path.resolve(rootDir, '../../');
      }
      const toolsDir = path.join(rootDir, '.domoreai/tools');
      
      const filePath = path.join(toolsDir, `${input.toolName}_examples.md`);
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        return { content };
      } catch (e) {
        return { content: null };
      }
    }),

  updateToolExamples: protectedProcedure
    .input(z.object({ toolName: z.string(), content: z.string() }))
    .mutation(async ({ input }) => {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      // Resolve path to .domoreai/tools
      let rootDir = process.cwd();
      if (rootDir.endsWith('apps/api')) {
          rootDir = path.resolve(rootDir, '../../');
      }
      const toolsDir = path.join(rootDir, '.domoreai/tools');
      
      const filePath = path.join(toolsDir, `${input.toolName}_examples.md`);
      try {
        await fs.mkdir(toolsDir, { recursive: true });
        await fs.writeFile(filePath, input.content, 'utf-8');
        return { success: true };
      } catch (e) {
        console.error(`Failed to update tool examples for ${input.toolName}:`, e);
        throw new Error(`Failed to update tool examples: ${e instanceof Error ? e.message : String(e)}`);
      }
    }),
});
