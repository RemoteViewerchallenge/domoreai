import { z } from 'zod';
import path from 'path';
import { fileURLToPath } from 'url';
import { createTRPCRouter, publicProcedure, protectedProcedure } from '../trpc.js';
import { nebulaTool } from '../tools/nebulaTool.js';
import { createVolcanoAgent } from '../services/AgentFactory.js';
import { AgentRuntime } from '../services/AgentRuntime.js';
import { PrismaAgentConfigRepository } from '../repositories/PrismaAgentConfigRepository.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MONOREPO_ROOT = path.resolve(__dirname, '../../../../');



export const orchestratorRouter = createTRPCRouter({
  getConfig: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.orchestratorConfig.upsert({
      where: { id: 'global' },
      update: {},
      create: { activeTableName: 'model_registry' }
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
      // Sanitize table name to prevent SQL injection or invalid characters
      const sanitizedTableName = input.tableName.replace(/[^a-zA-Z0-9_]/g, '');
      if (!sanitizedTableName) {
        throw new Error("Invalid table name provided.");
      }

      return ctx.prisma.orchestratorConfig.upsert({
        where: { id: 'global' },
        update: { activeTableName: sanitizedTableName },
        create: { id: 'global', activeTableName: sanitizedTableName }
      });
    }),

  getActiveRegistrySchema: protectedProcedure
    .query(async ({ ctx }) => {
      // 1. Get Active Table
      const config = await ctx.prisma.orchestratorConfig.findUnique({ where: { id: 'global' } });
      const tableName = config?.activeTableName || 'model_registry';

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
      // Fetch models from the Prisma model_registry table
      // This replaces the old raw SQL query approach
      try {
        const models = await ctx.prisma.model.findMany({
          where: {
            isActive: true, // Only show active models (Ghost Records pattern)
          },
          include: {
            provider: {
              select: {
                id: true,
                label: true,
                type: true,
                isEnabled: true,
              }
            }
          },
          orderBy: [
            { isFree: 'desc' }, // Free models first
            { lastSeenAt: 'desc' }, // Recently seen models first
          ],
          take: 2000 // Cap at 2000 for performance
        });

        // Transform to a format the UI expects
        const rows = models.map(model => ({
          id: model.id,
          provider_id: model.providerId,
          provider_label: model.provider.label,
          provider_type: model.provider.type,
          provider_enabled: model.provider.isEnabled,
          model_id: model.modelId,
          model_name: model.name,
          capabilities: model.capabilityTags,
          is_free: model.isFree,
          cost_per_1k: model.costPer1k,
          is_active: model.isActive,
          source: model.source,
          first_seen_at: model.firstSeenAt,
          last_seen_at: model.lastSeenAt,
          specs: model.specs,
          provider_data: model.providerData,
        }));

        return { 
          tableName: 'model_registry', 
          rows 
        };
      } catch (error) {
        console.error("Failed to fetch models from registry:", error);
        return { tableName: 'model_registry', rows: [] };
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
      const mcpServers = await RegistryClient.listServers();
      
      // Add internal tools
      const internalTools = [
        {
          name: 'search_codebase',
          description: 'Semantic search over the codebase using vector embeddings. Use this to find relevant code snippets or documentation.',
          type: 'internal'
        },
        {
          name: nebulaTool.name,
          description: nebulaTool.description,
          type: 'internal'
        }
      ];
      
      return [...mcpServers, ...internalTools];
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

  dispatch: publicProcedure
    .input(z.object({ 
      prompt: z.string(),
      contextId: z.string().optional(),
      roleId: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      console.log(`🚀 [Orchestrator] Dispatching command:`, {
        prompt: input.prompt.substring(0, 100),
        contextId: input.contextId,
        roleId: input.roleId,
      });

      try {
          const roleId = input.roleId || 'general_worker';
          const repo = new PrismaAgentConfigRepository();
          const role = await repo.getRole(roleId);

          if (!role) throw new Error(`Role ${roleId} not found`);

          // 1. Initialize Runtime with Role Tools
          console.log(`[Orchestrator] Initializing runtime for role: ${roleId} with tools: [${role.tools.join(', ')}]`);
          const runtime = await AgentRuntime.create(MONOREPO_ROOT, role.tools);

          // 2. Initialize Agent
          const agent = await createVolcanoAgent({
              roleId: roleId,
              modelId: null,
              isLocked: false,
              temperature: 0.7,
              maxTokens: 4096,
              userGoal: input.prompt
          });

          // 3. Generate content WITH context (Constitution, memory, and code-mode protocol)
          console.log(`[Orchestrator] Generating response...`);
          const aiResponse = await runtime.generateWithContext(
              agent, 
              role.basePrompt, 
              input.prompt, 
              roleId
          );

          console.log(`[Orchestrator] Raw AI Response:\n${aiResponse as string}`);

          // 4. Run Execution Loop (Handles tool calling if AI wrote code blocks)
          console.log(`[Orchestrator] Running agent loop...`);
          const { result, logs } = await runtime.runAgentLoop(
              input.prompt, 
              async () => aiResponse as string // Pass the already generated response as if it was the first step
          );

          const finalResult = result || '';
          const finalLogs = logs || [];

          console.log(`[Orchestrator] Execution complete. Result length: ${finalResult.length}, Logs: ${finalLogs.length}`);

          return {
            success: true,
            message: 'Command executed successfully',
            executionId: `exec_${Date.now()}`,
            prompt: input.prompt,
            contextId: input.contextId,
            output: finalResult,
            logs: finalLogs
          };

      } catch (error) {
          console.error('[Orchestrator] Dispatch failed:', error);
          return {
            success: false,
            message: `Execution Failed: ${error instanceof Error ? error.message : String(error)}`,
            executionId: `err_${Date.now()}`,
            prompt: input.prompt,
            contextId: input.contextId,
            output: `Error: ${error instanceof Error ? error.message : String(error)}`
          };
      }
    }),
});
