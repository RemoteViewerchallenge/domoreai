import { prisma } from '../db.js';
import { createVolcanoAgent } from './AgentFactory.js';
import type { Orchestration, OrchestrationStep, OrchestrationExecution } from '@prisma/client';

interface StepExecutionContext {
  orchestrationContext: Record<string, any>;
  stepInput: any;
  stepOutput?: any;
  error?: string;
}

interface CreateOrchestrationInput {
  name: string;
  description?: string;
  tags?: string[];
  steps: CreateStepInput[];
  createdBy?: string;
}

interface CreateStepInput {
  name: string;
  description?: string;
  order: number;
  stepType?: 'sequential' | 'parallel' | 'conditional' | 'loop';
  condition?: any;
  inputMapping?: any;
  outputMapping?: any;
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
  parallelGroup?: string;
}

export class OrchestrationService {
  /**
   * Create a new orchestration
   */
  static async createOrchestration(input: CreateOrchestrationInput): Promise<Orchestration> {
    const orchestration = await prisma.orchestration.create({
      data: {
        name: input.name,
        description: input.description,
        tags: input.tags || [],
        createdBy: input.createdBy,
        steps: {
          create: input.steps.map((step) => ({
            name: step.name,
            description: step.description,
            order: step.order,
            stepType: step.stepType || 'sequential',
            condition: step.condition,
            inputMapping: step.inputMapping,
            outputMapping: step.outputMapping,
            maxRetries: step.maxRetries || 0,
            retryDelay: step.retryDelay,
            timeout: step.timeout,
            parallelGroup: step.parallelGroup,
          })),
        },
      },
      include: {
        steps: {
          orderBy: { order: 'asc' },
        },
      },
    });

    return orchestration;
  }

  /**
   * List all orchestrations
   */
  static async listOrchestrations(filters?: { tags?: string[]; isActive?: boolean }) {
    const where: any = {};
    
    if (filters?.tags && filters.tags.length > 0) {
      where.tags = { hasSome: filters.tags };
    }
    
    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    return prisma.orchestration.findMany({
      where,
      include: {
        steps: {
          orderBy: { order: 'asc' },
        },
        executions: {
          take: 5,
          orderBy: { startedAt: 'desc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * Get a single orchestration by ID or name
   */
  static async getOrchestration(idOrName: string) {
    return prisma.orchestration.findFirst({
      where: {
        OR: [{ id: idOrName }, { name: idOrName }],
      },
      include: {
        steps: {
          orderBy: { order: 'asc' },
        },
        executions: {
          take: 10,
          orderBy: { startedAt: 'desc' },
        },
      },
    });
  }

  /**
   * Update an orchestration
   */
  static async updateOrchestration(
    id: string,
    updates: {
      name?: string;
      description?: string;
      tags?: string[];
      isActive?: boolean;
    }
  ) {
    return prisma.orchestration.update({
      where: { id },
      data: updates,
      include: {
        steps: {
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  /**
   * Delete an orchestration
   */
  static async deleteOrchestration(id: string) {
    return prisma.orchestration.delete({
      where: { id },
    });
  }

  /**
   * Execute an orchestration with dynamic role assignments
   * @param orchestrationId - The orchestration to execute
   * @param input - The initial input data
   * @param roleAssignments - Optional map of step names to role IDs (e.g., { "step1": "roleId1" })
   * @param userId - Optional user ID for tracking
   */
  static async executeOrchestration(
    orchestrationId: string,
    input: any,
    roleAssignments?: Record<string, string>,
    userId?: string
  ): Promise<OrchestrationExecution> {
    const orchestration = await prisma.orchestration.findUnique({
      where: { id: orchestrationId },
      include: {
        steps: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!orchestration) {
      throw new Error(`Orchestration ${orchestrationId} not found`);
    }

    if (!orchestration.isActive) {
      throw new Error(`Orchestration ${orchestration.name} is not active`);
    }

    // Create execution record
    const execution = await prisma.orchestrationExecution.create({
      data: {
        orchestrationId,
        input,
        userId,
        status: 'running',
        context: {},
        stepLogs: [],
      },
    });

    // Execute in background (don't await)
    this.runOrchestration(execution.id, orchestration, input, roleAssignments).catch((error) => {
      console.error(`[Orchestration] Execution ${execution.id} failed:`, error);
    });

    return execution;
  }

  /**
   * Internal: Run the orchestration
   */
  private static async runOrchestration(
    executionId: string,
    orchestration: Orchestration & { steps: OrchestrationStep[] },
    input: any,
    roleAssignments?: Record<string, string>
  ) {
    const context: Record<string, any> = { input };
    const stepLogs: any[] = [];

    try {
      // Group steps by parallel execution
      const stepGroups = this.groupStepsByExecution(orchestration.steps);

      for (const group of stepGroups) {
        if (group.type === 'parallel') {
          // Execute all steps in parallel
          const results = await Promise.allSettled(
            group.steps.map((step) => this.executeStep(step, context, roleAssignments))
          );

          // Process results
          results.forEach((result, index) => {
            const step = group.steps[index];
            if (result.status === 'fulfilled') {
              stepLogs.push(result.value);
              // Apply output mapping
              this.applyOutputMapping(step, result.value.stepOutput, context);
            } else {
              stepLogs.push({
                stepId: step.id,
                stepName: step.name,
                status: 'failed',
                error: result.reason?.message || 'Unknown error',
              });
              throw new Error(`Step ${step.name} failed: ${result.reason?.message}`);
            }
          });
        } else {
          // Execute steps sequentially
          for (const step of group.steps) {
            // Check condition if present
            if (step.condition && !this.evaluateCondition(step.condition, context)) {
              stepLogs.push({
                stepId: step.id,
                stepName: step.name,
                status: 'skipped',
                reason: 'Condition not met',
              });
              continue;
            }

            const stepLog = await this.executeStep(step, context, roleAssignments);
            stepLogs.push(stepLog);

            if (stepLog.status === 'failed') {
              throw new Error(`Step ${step.name} failed: ${stepLog.error}`);
            }

            // Apply output mapping
            this.applyOutputMapping(step, stepLog.stepOutput, context);
          }
        }
      }

      // Mark as completed
      await prisma.orchestrationExecution.update({
        where: { id: executionId },
        data: {
          status: 'completed',
          completedAt: new Date(),
          context,
          stepLogs,
          output: context,
        },
      });
    } catch (error: any) {
      // Mark as failed
      await prisma.orchestrationExecution.update({
        where: { id: executionId },
        data: {
          status: 'failed',
          completedAt: new Date(),
          context,
          stepLogs,
          error: error.message,
        },
      });
    }
  }

  /**
   * Execute a single step with retry logic
   * @param step - The orchestration step to execute
   * @param context - The current execution context
   * @param roleAssignments - Optional map of step names to role IDs
   */
  private static async executeStep(
    step: OrchestrationStep,
    context: Record<string, any>,
    roleAssignments?: Record<string, string>
  ): Promise<any> {
    const startTime = Date.now();
    let lastError: Error | null = null;

    // Prepare input
    const stepInput = this.applyInputMapping(step, context);

    // Retry logic
    for (let attempt = 0; attempt <= step.maxRetries; attempt++) {
      try {
        // Dynamic Role Selection
        let role;
        
        // 1. Check if a role is assigned for this step
        if (roleAssignments && roleAssignments[step.name]) {
          role = await prisma.role.findUnique({ where: { id: roleAssignments[step.name] } });
          if (!role) {
            throw new Error(`Assigned role ${roleAssignments[step.name]} not found for step ${step.name}`);
          }
        } else {
          // 2. Fallback strategy: Try to find a suitable role
          // First try 'general_worker'
          role = await prisma.role.findFirst({ where: { name: 'general_worker' } });
          
          if (!role) {
            // Last resort: use any available role
            role = await prisma.role.findFirst();
          }

          if (!role) {
            throw new Error(`No available role found for step ${step.name}. Please provide roleAssignments or create a 'general_worker' role.`);
          }
          
          console.warn(`[Orchestration] No role assigned for step "${step.name}". Using fallback role "${role.name}".`);
        }

        // Create agent for this role
        const agent = await createVolcanoAgent({
          roleId: role.id,
          modelId: null, // Let orchestrator pick best model
          isLocked: false,
          temperature: role.defaultTemperature || 0.7,
          maxTokens: role.defaultMaxTokens || 2048,
        });

        const prompt = typeof stepInput === 'string' ? stepInput : JSON.stringify(stepInput);

        // Execute with timeout
        const output = await this.executeWithTimeout(
          agent.generate(prompt),
          step.timeout || 300000 // Default 5 minutes
        );

        return {
          stepId: step.id,
          stepName: step.name,
          status: 'completed',
          stepInput,
          stepOutput: output,
          duration: Date.now() - startTime,
          attempts: attempt + 1,
        };
      } catch (error: any) {
        lastError = error;
        
        // If not the last attempt, wait and retry
        if (attempt < step.maxRetries) {
          await this.sleep(step.retryDelay || 1000);
        }
      }
    }

    // All retries failed
    return {
      stepId: step.id,
      stepName: step.name,
      status: 'failed',
      stepInput,
      error: lastError?.message || 'Unknown error',
      duration: Date.now() - startTime,
      attempts: step.maxRetries + 1,
    };
  }

  /**
   * Group steps by execution type (parallel vs sequential)
   */
  private static groupStepsByExecution(steps: OrchestrationStep[]) {
    const groups: Array<{ type: 'parallel' | 'sequential'; steps: OrchestrationStep[] }> = [];
    let currentGroup: { type: 'parallel' | 'sequential'; steps: OrchestrationStep[] } | null = null;

    for (const step of steps) {
      if (step.parallelGroup) {
        // Start or continue parallel group
        if (!currentGroup || currentGroup.type !== 'parallel') {
          if (currentGroup) groups.push(currentGroup);
          currentGroup = { type: 'parallel', steps: [step] };
        } else {
          currentGroup.steps.push(step);
        }
      } else {
        // Sequential step
        if (currentGroup?.type === 'parallel') {
          groups.push(currentGroup);
          currentGroup = null;
        }
        if (!currentGroup) {
          currentGroup = { type: 'sequential', steps: [step] };
        } else {
          currentGroup.steps.push(step);
        }
      }
    }

    if (currentGroup) groups.push(currentGroup);
    return groups;
  }

  /**
   * Apply input mapping using template variables
   */
  private static applyInputMapping(step: OrchestrationStep, context: Record<string, any>): any {
    if (!step.inputMapping) {
      return context;
    }

    const mapping = step.inputMapping as Record<string, any>;
    const result: Record<string, any> = {};

    for (const [key, template] of Object.entries(mapping)) {
      if (typeof template === 'string') {
        result[key] = this.resolveTemplate(template, context);
      } else {
        result[key] = template;
      }
    }

    return result;
  }

  /**
   * Apply output mapping to context
   */
  private static applyOutputMapping(
    step: OrchestrationStep,
    output: any,
    context: Record<string, any>
  ) {
    if (!step.outputMapping) {
      // Default: store output under step name
      context[step.name] = output;
      return;
    }

    const mapping = step.outputMapping as Record<string, any>;
    
    for (const [contextKey, template] of Object.entries(mapping)) {
      if (typeof template === 'string') {
        context[contextKey] = this.resolveTemplate(template, { output, context });
      } else {
        context[contextKey] = template;
      }
    }
  }

  /**
   * Resolve template variables like {{context.userQuery}}
   */
  private static resolveTemplate(template: string, data: Record<string, any>): any {
    const matches = template.matchAll(/\{\{([^}]+)\}\}/g);
    let result = template;

    for (const match of matches) {
      const path = match[1].trim();
      const value = this.getNestedValue(data, path);
      result = result.replace(match[0], value !== undefined ? String(value) : '');
    }

    return result;
  }

  /**
   * Get nested value from object using dot notation
   */
  private static getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Evaluate a condition
   */
  private static evaluateCondition(condition: any, context: Record<string, any>): boolean {
    const { field, operator, value } = condition;
    const fieldValue = this.getNestedValue(context, field);

    switch (operator) {
      case '>':
        return fieldValue > value;
      case '<':
        return fieldValue < value;
      case '>=':
        return fieldValue >= value;
      case '<=':
        return fieldValue <= value;
      case '==':
      case '===':
        return fieldValue === value;
      case '!=':
      case '!==':
        return fieldValue !== value;
      case 'contains':
        return String(fieldValue).includes(String(value));
      case 'exists':
        return fieldValue !== undefined && fieldValue !== null;
      default:
        return false;
    }
  }

  /**
   * Execute a promise with timeout
   */
  private static executeWithTimeout<T>(promise: Promise<T>, timeout: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Step execution timeout')), timeout)
      ),
    ]);
  }

  /**
   * Sleep utility
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get execution status
   */
  static async getExecutionStatus(executionId: string) {
    return prisma.orchestrationExecution.findUnique({
      where: { id: executionId },
      include: {
        orchestration: {
          include: {
            steps: {
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });
  }

  /**
   * List executions for an orchestration
   */
  static async listExecutions(orchestrationId: string, limit = 50) {
    return prisma.orchestrationExecution.findMany({
      where: { orchestrationId },
      orderBy: { startedAt: 'desc' },
      take: limit,
    });
  }
}
