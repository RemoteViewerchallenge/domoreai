import { prisma } from '../db.js';
import { RoleFactoryService } from '../services/RoleFactoryService.js';
import type { SandboxTool } from '../types.js';

interface RoleVariantEventArgs {
    roleId?: string;
    intent: {
        name: string;
        description: string;
        domain: string;
        complexity: 'LOW' | 'MEDIUM' | 'HIGH';
        capabilities?: string[];
    }
}

interface RoleConfigPatchArgs {
    roleId: string;
    updates: {
        basePrompt?: string;
        tools?: string[];
    };
}

export const metaTools: SandboxTool[] = [
  {
    name: 'role_registry_list',
    description: 'List available personas and roles in the system. Use for discovery.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
    handler: async () => {
      const roles = await prisma.role.findMany({
        select: {
          id: true,
          name: true,
          description: true,
          basePrompt: true,
          tools: { include: { tool: true } },
        },
        orderBy: { name: 'asc' },
      });

      const formatted = roles.map(r => ({
          id: r.id,
          name: r.name,
          description: r.description,
          tools: r.tools.map(rt => rt.tool.name)
      }));

      return [{
        type: 'text',
        text: JSON.stringify(formatted, null, 2),
      }];
    },
  },
  {
    name: 'role_variant_evolve',
    description: 'Evolve a new Role Variant (DNA) using the Role Factory. High complexity operation that generates a complete personality and toolset.',
    inputSchema: {
      type: 'object',
      properties: {
        roleId: { type: 'string', description: 'Optional ID of existing role to evolve. If omitted, a new Base Role is created.' },
        intent: {
            type: 'object',
            properties: {
                name: { type: 'string' },
                description: { type: 'string' },
                domain: { type: 'string', description: 'e.g. "Frontend", "Backend", "Creative"' },
                complexity: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
                capabilities: { type: 'array', items: { type: 'string' } }
            },
            required: ['name', 'description', 'domain', 'complexity']
        }
      },
      required: ['intent']
    },
    handler: async (args: unknown) => {
        const typedArgs = args as RoleVariantEventArgs;
        
        let roleId = typedArgs.roleId;
        if (!roleId) {
            const role = await prisma.role.create({
                data: {
                    name: typedArgs.intent.name,
                    description: typedArgs.intent.description,
                    basePrompt: "You are a specialized agent."
                }
            });
            roleId = role.id;
        }

        const factory = new RoleFactoryService();
        const variant = await factory.createRoleVariant(roleId, typedArgs.intent);

        return [{
            type: 'text',
            text: `✅ Role Variant Evolved Successfully!
ID: ${variant.id}
Role: ${typedArgs.intent.name} (${roleId})
Identity: ${JSON.stringify((variant.identityConfig as any)?.personaName)}
Status: Ready for deployment.`
        }];
    }
  },
  {
    name: 'role_config_patch',
    description: 'Targeted updates to a role\'s basePrompt or tools array. Use for fine-tuning after evolution.',
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
      const typedArgs = args as RoleConfigPatchArgs;
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
        text: `✅ Role "${role.name}" patched successfully.`,
      }];
    },
  },
];

export async function canUseMetaTools(roleId: string): Promise<boolean> {
  const role = await prisma.role.findUnique({
    where: { id: roleId },
    include: { tools: { include: { tool: true } } },
  });

  return role?.tools.some(rt => rt.tool.name === 'meta') || false;
}
