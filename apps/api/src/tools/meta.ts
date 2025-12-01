import { db } from '../db.js';
import { OrchestrationService } from '../services/orchestration.service.js';
import type { SandboxTool } from '../types.js';

/**
 * Meta-tools that allow agents to create roles and orchestrations
 * These are only exposed to agents that have been granted these capabilities
 */

export const metaTools: SandboxTool[] = [
  {
    name: 'create_role',
    description: 'Create a new AI role with specific capabilities and constraints. Use this to define new agent personas.',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Unique name for the role (e.g., "Code Reviewer", "Research Assistant")',
        },
        basePrompt: {
          type: 'string',
          description: 'System prompt that defines this role\'s behavior and responsibilities',
        },
        capabilities: {
          type: 'object',
          properties: {
            needsVision: { type: 'boolean', default: false },
            needsReasoning: { type: 'boolean', default: false },
            needsCoding: { type: 'boolean', default: false },
            needsTools: { type: 'boolean', default: false },
            needsJson: { type: 'boolean', default: false },
            needsUncensored: { type: 'boolean', default: false },
          },
          description: 'Capabilities required for this role',
        },
        contextLimits: {
          type: 'object',
          properties: {
            minContext: { type: 'number', description: 'Minimum context window' },
            maxContext: { type: 'number', description: 'Maximum context window' },
          },
        },
        tools: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of MCP tools this role can access (e.g., ["git", "postgres"])',
        },
        hyperparameters: {
          type: 'object',
          properties: {
            temperature: { type: 'number', minimum: 0, maximum: 2 },
            maxTokens: { type: 'number' },
            topP: { type: 'number', minimum: 0, maximum: 1 },
          },
        },
      },
      required: ['name', 'basePrompt'],
    },
    handler: async (args: any) => {
      const role = await db.role.create({
        data: {
          name: args.name,
          basePrompt: args.basePrompt,
          minContext: args.contextLimits?.minContext,
          maxContext: args.contextLimits?.maxContext,
          needsVision: args.capabilities?.needsVision || false,
          needsReasoning: args.capabilities?.needsReasoning || false,
          needsCoding: args.capabilities?.needsCoding || false,
          needsTools: args.capabilities?.needsTools || false,
          needsJson: args.capabilities?.needsJson || false,
          needsUncensored: args.capabilities?.needsUncensored || false,
          tools: args.tools || [],
          defaultTemperature: args.hyperparameters?.temperature || 0.7,
          defaultMaxTokens: args.hyperparameters?.maxTokens || 2048,
          defaultTopP: args.hyperparameters?.topP || 1.0,
        },
      });

      return [{
        type: 'text',
        text: `✅ Role "${role.name}" created successfully.\nID: ${role.id}\nCapabilities: ${JSON.stringify(args.capabilities)}`,
      }];
    },
  },

  {
    name: 'list_roles',
    description: 'List all available roles in the system',
    inputSchema: {
      type: 'object',
      properties: {},
    },
    handler: async () => {
      const roles = await db.role.findMany({
        select: {
          id: true,
          name: true,
          basePrompt: true,
          needsVision: true,
          needsReasoning: true,
          needsCoding: true,
          needsTools: true,
          tools: true,
        },
        orderBy: { name: 'asc' },
      });

      return [{
        type: 'text',
        text: JSON.stringify(roles, null, 2),
      }];
    },
  },

  {
    name: 'update_role',
    description: 'Update an existing role\'s configuration',
    inputSchema: {
      type: 'object',
      properties: {
        roleId: { type: 'string', description: 'ID of the role to update' },
        updates: {
          type: 'object',
          properties: {
            basePrompt: { type: 'string' },
            capabilities: { type: 'object' },
            tools: { type: 'array', items: { type: 'string' } },
          },
        },
      },
      required: ['roleId', 'updates'],
    },
    handler: async (args: any) => {
      const role = await db.role.update({
        where: { id: args.roleId },
        data: {
          basePrompt: args.updates.basePrompt,
          needsVision: args.updates.capabilities?.needsVision,
          needsReasoning: args.updates.capabilities?.needsReasoning,
          needsCoding: args.updates.capabilities?.needsCoding,
          needsTools: args.updates.capabilities?.needsTools,
          needsJson: args.updates.capabilities?.needsJson,
          needsUncensored: args.updates.capabilities?.needsUncensored,
          tools: args.updates.tools,
        },
      });

      return [{
        type: 'text',
        text: `✅ Role "${role.name}" updated successfully.`,
      }];
    },
  },

  {
    name: 'delete_role',
    description: 'Delete a role from the system',
    inputSchema: {
      type: 'object',
      properties: {
        roleId: { type: 'string', description: 'ID of the role to delete' },
      },
      required: ['roleId'],
    },
    handler: async (args: any) => {
      const role = await db.role.delete({
        where: { id: args.roleId },
      });

      return [{
        type: 'text',
        text: `✅ Role "${role.name}" deleted successfully.`,
      }];
    },
  },

  {
    name: 'create_orchestration',
    description: 'Create a multi-step workflow that chains multiple roles together. Use this to define complex agent workflows.',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Unique name for the orchestration (e.g., "Code Review Pipeline")',
        },
        description: {
          type: 'string',
          description: 'Description of what this orchestration does',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Tags for categorizing this orchestration (e.g., ["coding", "review"])',
        },
        steps: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Name of this step' },
              description: { type: 'string' },
              order: { type: 'number', description: 'Execution order (0, 1, 2, ...)' },
              roleName: { type: 'string', description: 'Name of the role to use for this step' },
              stepType: {
                type: 'string',
                enum: ['sequential', 'parallel', 'conditional', 'loop'],
                description: 'Execution type',
              },
              inputMapping: {
                type: 'object',
                description: 'Map orchestration context to step input using {{template}} syntax',
              },
              outputMapping: {
                type: 'object',
                description: 'Map step output to orchestration context',
              },
              condition: {
                type: 'object',
                description: 'Conditional logic: { field: "path.to.value", operator: ">", value: 0.8 }',
              },
              maxRetries: { type: 'number', default: 0 },
              timeout: { type: 'number', description: 'Timeout in milliseconds' },
              parallelGroup: { type: 'string', description: 'Group ID for parallel execution' },
            },
            required: ['name', 'order'],
          },
          description: 'Steps in the orchestration',
        },
      },
      required: ['name', 'steps'],
    },
    handler: async (args: any) => {
      const orchestration = await OrchestrationService.createOrchestration({
        name: args.name,
        description: args.description,
        tags: args.tags || [],
        steps: args.steps,
      });

      return [{
        type: 'text',
        text: `✅ Orchestration "${orchestration.name}" created successfully.\nID: ${orchestration.id}\nSteps: ${args.steps.length}`,
      }];
    },
  },

  {
    name: 'list_orchestrations',
    description: 'List all available orchestrations',
    inputSchema: {
      type: 'object',
      properties: {
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter by tags',
        },
        activeOnly: {
          type: 'boolean',
          description: 'Only show active orchestrations',
        },
      },
    },
    handler: async (args: any) => {
      const orchestrations = await OrchestrationService.listOrchestrations({
        tags: args.tags,
        isActive: args.activeOnly,
      });

      const summary = orchestrations.map((o: any) => ({
        id: o.id,
        name: o.name,
        description: o.description,
        steps: o.steps.length,
        tags: o.tags,
        isActive: o.isActive,
        lastExecution: o.executions[0]?.startedAt,
      }));

      return [{
        type: 'text',
        text: JSON.stringify(summary, null, 2),
      }];
    },
  },

  {
    name: 'get_orchestration',
    description: 'Get detailed information about a specific orchestration',
    inputSchema: {
      type: 'object',
      properties: {
        nameOrId: { type: 'string', description: 'Orchestration name or ID' },
      },
      required: ['nameOrId'],
    },
    handler: async (args: any) => {
      const orchestration = await OrchestrationService.getOrchestration(args.nameOrId);

      if (!orchestration) {
        return [{
          type: 'text',
          text: `❌ Orchestration "${args.nameOrId}" not found.`,
        }];
      }

      return [{
        type: 'text',
        text: JSON.stringify(orchestration, null, 2),
      }];
    },
  },

  {
    name: 'execute_orchestration',
    description: 'Execute an orchestration with given input',
    inputSchema: {
      type: 'object',
      properties: {
        orchestrationId: { type: 'string', description: 'ID of the orchestration to execute' },
        input: {
          type: 'object',
          description: 'Input data for the orchestration',
        },
      },
      required: ['orchestrationId', 'input'],
    },
    handler: async (args: any) => {
      const execution = await OrchestrationService.executeOrchestration(
        args.orchestrationId,
        args.input
      );

      return [{
        type: 'text',
        text: `✅ Orchestration execution started.\nExecution ID: ${execution.id}\nStatus: ${execution.status}\n\nUse get_execution_status with this ID to check progress.`,
      }];
    },
  },

  {
    name: 'get_execution_status',
    description: 'Check the status of an orchestration execution',
    inputSchema: {
      type: 'object',
      properties: {
        executionId: { type: 'string', description: 'Execution ID' },
      },
      required: ['executionId'],
    },
    handler: async (args: any) => {
      const execution = await OrchestrationService.getExecutionStatus(args.executionId);

      if (!execution) {
        return [{
          type: 'text',
          text: `❌ Execution "${args.executionId}" not found.`,
        }];
      }

      const status = {
        status: execution.status,
        startedAt: execution.startedAt,
        completedAt: execution.completedAt,
        output: execution.output,
        error: execution.error,
        stepLogs: execution.stepLogs,
      };

      return [{
        type: 'text',
        text: JSON.stringify(status, null, 2),
      }];
    },
  },

  {
    name: 'update_orchestration',
    description: 'Update an orchestration\'s metadata',
    inputSchema: {
      type: 'object',
      properties: {
        orchestrationId: { type: 'string' },
        updates: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
            isActive: { type: 'boolean' },
          },
        },
      },
      required: ['orchestrationId', 'updates'],
    },
    handler: async (args: any) => {
      const orchestration = await OrchestrationService.updateOrchestration(
        args.orchestrationId,
        args.updates
      );

      return [{
        type: 'text',
        text: `✅ Orchestration "${orchestration.name}" updated successfully.`,
      }];
    },
  },

  {
    name: 'delete_orchestration',
    description: 'Delete an orchestration',
    inputSchema: {
      type: 'object',
      properties: {
        orchestrationId: { type: 'string' },
      },
      required: ['orchestrationId'],
    },
    handler: async (args: any) => {
      const orchestration = await OrchestrationService.deleteOrchestration(args.orchestrationId);

      return [{
        type: 'text',
        text: `✅ Orchestration "${orchestration.name}" deleted successfully.`,
      }];
    },
  },
];

/**
 * Check if a role has permission to use meta-tools
 */
export async function canUseMetaTools(roleId: string): Promise<boolean> {
  const role = await db.role.findUnique({
    where: { id: roleId },
    select: { tools: true },
  });

  // Meta-tools are available if the role includes 'meta' in its tools array
  return role?.tools.includes('meta') || false;
}
