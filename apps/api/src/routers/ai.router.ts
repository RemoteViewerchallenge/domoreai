import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc.js';
import { contextService } from '../services/ContextService.js';
import { selectModelFromRegistry } from '../services/modelManager.service.js';
import { TRPCError } from '@trpc/server';

const aiSourceSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('role'), roleId: z.string().optional() }),
  z.object({ type: z.literal('coorp-node'), nodeId: z.string().optional() }),
  z.object({ type: z.literal('vfs'), paths: z.array(z.string()).optional() }),
  z.object({ type: z.literal('custom'), payload: z.any().optional() }),
]);

/**
 * AI Router - handles AI context execution with ContextService and Model Broker
 */
export const aiRouter = createTRPCRouter({
  /**
   * Run AI with context
   * Integrates with ContextService to build context and model broker to select models
   */
  runWithContext: publicProcedure
    .input(
      z.object({
        source: aiSourceSchema,
        roleId: z.string().optional(),
        prompt: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        console.log('[AI Router] runWithContext called with:', {
          source: input.source,
          roleId: input.roleId,
          promptLength: input.prompt.length,
        });

        // Step 1: Build context using ContextService
        const context = await contextService.buildContext(input.source, input.roleId);

        console.log('[AI Router] Context built:', {
          roleId: context.roleMetadata?.id,
          roleName: context.roleMetadata?.name,
          fileCount: context.sizeEstimate.fileCount,
          totalTokens: context.sizeEstimate.totalTokens,
        });

        // Step 2: Select model using model broker
        let selectedModel = null;
        let modelError = null;

        if (context.roleMetadata?.id) {
          try {
            // Try to select a model from the registry based on role requirements
            selectedModel = await selectModelFromRegistry(context.roleMetadata.id, []);
            console.log('[AI Router] Model selected:', selectedModel);
          } catch (error) {
            modelError = error instanceof Error ? error.message : 'Model selection failed';
            console.error('[AI Router] Model selection failed:', modelError);
          }
        }

        // Step 3: If model broker fails, return helpful error WITHOUT modifying DB
        if (modelError) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Model selection failed: ${modelError}. No suitable model found for the given role requirements. Please check role configuration and available models.`,
          });
        }

        // Step 4: Return answer + metadata
        // Note: Actual AI execution would happen here with the selected model
        // For now, we return the context and model information
        return {
          success: true,
          message: 'Context built and model selected successfully',
          data: {
            context: {
              roleId: context.roleMetadata?.id,
              roleName: context.roleMetadata?.name,
              roleCategory: context.roleMetadata?.category,
              requirements: context.roleMetadata?.requirements,
              fileCount: context.sizeEstimate.fileCount,
              totalTokens: context.sizeEstimate.totalTokens,
              totalBytes: context.sizeEstimate.totalBytes,
              vfsPaths: context.vfsList.slice(0, 10), // Limit for response size
            },
            model: selectedModel ? {
              modelId: selectedModel.model_id || selectedModel.id,
              modelName: selectedModel.model_name || selectedModel.name,
              provider: selectedModel.provider_id || selectedModel.provider,
              contextWindow: selectedModel.context_window || selectedModel.contextWindow,
            } : null,
            prompt: input.prompt,
            // Placeholder for actual AI response
            response: `Context built with ${context.sizeEstimate.fileCount} files (${context.sizeEstimate.totalTokens} tokens). Model: ${selectedModel?.model_name || selectedModel?.name || 'unknown'}. Ready to process: "${input.prompt.substring(0, 50)}${input.prompt.length > 50 ? '...' : ''}"`,
            timestamp: new Date().toISOString(),
          },
        };
      } catch (error) {
        // If it's already a TRPCError, re-throw it
        if (error instanceof TRPCError) {
          throw error;
        }

        // Otherwise, wrap it in a TRPCError
        console.error('[AI Router] Error in runWithContext:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to run with context',
        });
      }
    }),
});
