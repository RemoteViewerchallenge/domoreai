import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc.js';
import { OrchestrationService } from '../services/orchestration.service.js';

const createStepSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  order: z.number().int(),
  roleId: z.string().optional(),
  roleName: z.string().optional(),
  stepType: z.enum(['sequential', 'parallel', 'conditional', 'loop']).default('sequential'),
  condition: z.any().optional(),
  inputMapping: z.any().optional(),
  outputMapping: z.any().optional(),
  maxRetries: z.number().int().default(0),
  retryDelay: z.number().int().optional(),
  timeout: z.number().int().optional(),
  parallelGroup: z.string().optional(),
});

const createOrchestrationSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  steps: z.array(createStepSchema),
  createdBy: z.string().optional(),
});

const updateOrchestrationSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

const executeOrchestrationSchema = z.object({
  orchestrationId: z.string(),
  input: z.any(),
  userId: z.string().optional(),
});

export const orchestrationManagementRouter = createTRPCRouter({
  /**
   * List all orchestrations
   */
  list: publicProcedure
    .input(
      z.object({
        tags: z.array(z.string()).optional(),
        isActive: z.boolean().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      return OrchestrationService.listOrchestrations(input);
    }),

  /**
   * Get a single orchestration
   */
  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return OrchestrationService.getOrchestration(input.id);
    }),

  /**
   * Create a new orchestration
   */
  create: publicProcedure
    .input(createOrchestrationSchema)
    .mutation(async ({ input }) => {
      return OrchestrationService.createOrchestration(input);
    }),

  /**
   * Update an orchestration
   */
  update: publicProcedure
    .input(updateOrchestrationSchema)
    .mutation(async ({ input }) => {
      const { id, ...updates } = input;
      return OrchestrationService.updateOrchestration(id, updates);
    }),

  /**
   * Delete an orchestration
   */
  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return OrchestrationService.deleteOrchestration(input.id);
    }),

  /**
   * Execute an orchestration
   */
  execute: publicProcedure
    .input(executeOrchestrationSchema)
    .mutation(async ({ input }) => {
      return OrchestrationService.executeOrchestration(
        input.orchestrationId,
        input.input,
        input.userId
      );
    }),

  /**
   * Get execution status
   */
  getExecutionStatus: publicProcedure
    .input(z.object({ executionId: z.string() }))
    .query(async ({ input }) => {
      return OrchestrationService.getExecutionStatus(input.executionId);
    }),

  /**
   * List executions for an orchestration
   */
  listExecutions: publicProcedure
    .input(
      z.object({
        orchestrationId: z.string(),
        limit: z.number().int().max(100).default(50),
      })
    )
    .query(async ({ input }) => {
      return OrchestrationService.listExecutions(input.orchestrationId, input.limit);
    }),
});
