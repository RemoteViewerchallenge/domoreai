import { prisma } from '../db.js';
import { OrchestrationService } from '../services/orchestration.service.js';
import type { SandboxTool } from '../types.js';

/**
 * Meta-tools that allow agents to create roles and orchestrations
 * These are only exposed to agents that have been granted these capabilities
 */

interface CreateRoleArgs {
  name: string;
  basePrompt: string;
  tools?: string[];
}

interface UpdateRoleArgs {
  roleId: string;
  updates: {
    basePrompt?: string;
    tools?: string[];
  };
}

interface DeleteRoleArgs {
  roleId: string;
}

interface CreateOrchestrationArgs {
  name: string;
  description?: string;
  tags?: string[];
  steps: any[];
}

interface ListOrchestrationsArgs {
  tags?: string[];
  activeOnly?: boolean;
}

interface GetOrchestrationArgs {
  nameOrId: string;
}

interface ExecuteOrchestrationArgs {
  orchestrationId: string;
  input: Record<string, unknown>;
}

interface GetExecutionStatusArgs {
  executionId: string;
}

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
        tools: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of MCP tools this role can access (e.g., ["git", "postgres"])',
        },
      },
      required: ['name', 'basePrompt'],
    },
    handler: async (args: unknown) => {
      const typedArgs = args as CreateRoleArgs;
      const toolNames = typedArgs.tools || [];
      const role = await prisma.role.create({
        data: {
          name: typedArgs.name,
          basePrompt: typedArgs.basePrompt,
          tools: {
            create: toolNames.map(t => ({
              tool: {
                connectOrCreate: {
                  where: { name: t },
                  create: {
                    name: t,
                    description: `Automatically created tool: ${t}`,
                    instruction: `Use the ${t} tool as needed.`,
                    schema: '{}'
                  }
                }
              }
            }))
          },
        },
      });

      return [{
        type: 'text',
        text: `✅ Role "${role.name}" created successfully.\nID: ${role.id}`,
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
      const roles = await prisma.role.findMany({
        select: {
          id: true,
          name: true,
          basePrompt: true,
          tools: { include: { tool: true } },
        },
        orderBy: { name: 'asc' },
      });

      const formatted = roles.map(r => ({
          ...r,
          tools: r.tools.map(rt => rt.tool.name)
      }));

      return [{
        type: 'text',
        text: JSON.stringify(formatted, null, 2),
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
            tools: { type: 'array', items: { type: 'string' } },
          },
        },
      },
      required: ['roleId', 'updates'],
    },
    handler: async (args: unknown) => {
      const typedArgs = args as UpdateRoleArgs;
      const toolNames = typedArgs.updates.tools;
      const role = await prisma.role.update({
        where: { id: typedArgs.roleId },
        data: {
          basePrompt: typedArgs.updates.basePrompt,
          ...(toolNames && {
            tools: {
              deleteMany: {},
              create: toolNames.map((t: string) => ({
                tool: {
                  connectOrCreate: {
                    where: { name: t },
                    create: {
                      name: t,
                      description: `Automatically created tool: ${t}`,
                      instruction: `Use the ${t} tool as needed.`,
                      schema: '{}'
                    }
                  }
                }
              }))
            }
          })
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
    handler: async (args: unknown) => {
      const typedArgs = args as DeleteRoleArgs;
      const role = await prisma.role.delete({
        where: { id: typedArgs.roleId },
      });

      return [{
        type: 'text',
        text: `✅ Role "${role.name}" deleted successfully.`,
      }];
    },
  },

  {
    name: 'create_orchestration',
    description: 'Create a multi-step workflow that chains multiple roles together.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
        steps: { type: 'array', items: { type: 'object' } },
      },
      required: ['name', 'steps'],
    },
    handler: async (args: unknown) => {
      const typedArgs = args as CreateOrchestrationArgs;
      const orchestration = await OrchestrationService.createOrchestration({
        name: typedArgs.name,
        description: typedArgs.description,
        tags: typedArgs.tags || [],
        steps: typedArgs.steps,
      });

      return [{
        type: 'text',
        text: `✅ Orchestration "${orchestration.name}" created successfully.\nID: ${orchestration.id}`,
      }];
    },
  },

  {
    name: 'list_orchestrations',
    description: 'List all available orchestrations',
    inputSchema: {
      type: 'object',
      properties: {
        tags: { type: 'array', items: { type: 'string' } },
        activeOnly: { type: 'boolean' },
      },
    },
    handler: async (args: unknown) => {
      const typedArgs = args as ListOrchestrationsArgs;
      const orchestrations = await OrchestrationService.listOrchestrations({
        tags: typedArgs.tags,
        isActive: typedArgs.activeOnly,
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
        nameOrId: { type: 'string' },
      },
      required: ['nameOrId'],
    },
    handler: async (args: unknown) => {
      const typedArgs = args as GetOrchestrationArgs;
      const orchestration = await OrchestrationService.getOrchestration(typedArgs.nameOrId);

      if (!orchestration) {
        return [{ type: 'text', text: `❌ Orchestration "${typedArgs.nameOrId}" not found.` }];
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
        orchestrationId: { type: 'string' },
        input: { type: 'object' },
      },
      required: ['orchestrationId', 'input'],
    },
    handler: async (args: unknown) => {
      const typedArgs = args as ExecuteOrchestrationArgs;
      const execution = await OrchestrationService.executeOrchestration(
        typedArgs.orchestrationId,
        typedArgs.input
      );

      return [{
        type: 'text',
        text: `✅ Orchestration started. Execution ID: ${execution.id}`,
      }];
    },
  },

  {
    name: 'get_execution_status',
    description: 'Check the status of an orchestration execution',
    inputSchema: {
      type: 'object',
      properties: {
        executionId: { type: 'string' },
      },
      required: ['executionId'],
    },
    handler: async (args: unknown) => {
      const typedArgs = args as GetExecutionStatusArgs;
      const execution = await OrchestrationService.getExecutionStatus(typedArgs.executionId);

      if (!execution) {
        return [{ type: 'text', text: `❌ Execution "${typedArgs.executionId}" not found.` }];
      }

      return [{
        type: 'text',
        text: JSON.stringify(execution, null, 2),
      }];
    },
  },
];

/**
 * Check if a role has permission to use meta-tools
 */
export async function canUseMetaTools(roleId: string): Promise<boolean> {
  const role = await prisma.role.findUnique({
    where: { id: roleId },
    include: { tools: { include: { tool: true } } },
  });

  return role?.tools.some(rt => rt.tool.name === 'meta') || false;
}
