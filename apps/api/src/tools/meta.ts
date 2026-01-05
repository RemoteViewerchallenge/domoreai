import { prisma } from '../db.js';
// import { OrchestrationService } from '../services/orchestration.service.js';
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

  /* Orchestration tools removed pending schema migration */
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
