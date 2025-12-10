import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc.js';

const aiSourceSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('role'), roleId: z.string().optional() }),
  z.object({ type: z.literal('coorp-node'), nodeId: z.string().optional() }),
  z.object({ type: z.literal('vfs'), paths: z.array(z.string()).optional() }),
  z.object({ type: z.literal('custom'), payload: z.any().optional() }),
]);

/**
 * AI Router - handles AI context execution
 * Currently returns mock responses until ContextService is available
 */
export const aiRouter = createTRPCRouter({
  /**
   * Run AI with context
   * Safe TRPC stub that returns a mock response until ContextService is available
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
      // TODO: Integrate with ContextService when available
      // For now, return a mock response
      console.log('[AI Router] runWithContext called with:', {
        source: input.source,
        roleId: input.roleId,
        promptLength: input.prompt.length,
      });

      // Simulate processing delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      return {
        success: true,
        message: 'Mock AI response - ContextService integration pending',
        data: {
          source: input.source,
          prompt: input.prompt,
          response: `This is a mock response to: "${input.prompt.substring(0, 50)}${input.prompt.length > 50 ? '...' : ''}"`,
          timestamp: new Date().toISOString(),
        },
      };
    }),
});
