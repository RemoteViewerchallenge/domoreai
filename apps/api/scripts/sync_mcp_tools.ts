
import { prisma } from '../src/db.js';
import { RegistryClient } from '../src/services/mcp-registry-client.js';
import { McpOrchestrator } from '../src/services/McpOrchestrator.js'; // Use class directly or instance if exported
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

// --- Schema Converter Logic ---

function simpleSchemaToTs(schema: any, indentLevel = 0): string {
  const indent = '  '.repeat(indentLevel);
  
  if (!schema) return 'any';
  
  // Handle specific types
  if (schema.type === 'string') {
     if (schema.enum) {
         return schema.enum.map((e: string) => `'${e}'`).join(' | ');
     }
     return 'string';
  }
  
  if (schema.type === 'number' || schema.type === 'integer') return 'number';
  if (schema.type === 'boolean') return 'boolean';
  
  if (schema.type === 'array') {
      const itemType = simpleSchemaToTs(schema.items, indentLevel);
      return `Array<${itemType}>`;
  }
  
  if (schema.type === 'object' || schema.properties) {
      if (!schema.properties) return '{}';
      
      const lines: string[] = [];
      lines.push('{');
      
      for (const [key, prop] of Object.entries(schema.properties)) {
          const propSchema = prop as any;
          const isRequired = schema.required?.includes(key) ?? false;
          const q = isRequired ? '' : '?';
          const tsType = simpleSchemaToTs(propSchema, indentLevel + 1);
          
          if (propSchema.description) {
              lines.push(`${indent}  // ${propSchema.description}`);
          }
          lines.push(`${indent}  ${key}${q}: ${tsType};`);
      }
      
      lines.push(`${indent}}`);
      return lines.join('\n');
  }
  
  return 'any';
}

function generateToolInterface(toolName: string, description: string, inputSchema: any): string {
    const pascalName = toolName
        .split('_')
        .map(p => p.charAt(0).toUpperCase() + p.slice(1))
        .join('') + 'Tool';

    const argsType = simpleSchemaToTs(inputSchema, 1);
    
    // Create a functional signature style interface
    return `
type ${pascalName} = {
  // ${description.replace(/\n/g, '\n  // ')}
  ${toolName}: (args: ${argsType}) => Promise<any>;
};
`.trim();
}

// --- Sync Logic ---

async function main() {
  console.log('🔄 Starting MCP Tool Sync...');
  
  const registry = new RegistryClient();
  const servers = await registry.listServers();
  
  console.log(`📡 Found ${servers.length} servers defined in registry.`);
  
  for (const serverDef of servers) {
      const serverName = serverDef.name;
      console.log(`\n-----------------------------------`);
      console.log(`🔌 Connecting to server: ${serverName}...`);
      
      let client: Client | null = null;
      let transport: StdioClientTransport | null = null;

      try {
          const config = await registry.getServerConfig(serverName);
          
          transport = new StdioClientTransport({
            command: config.command,
            args: config.args,
            env: { ...process.env, ...(config.env || {}) } as Record<string, string>,
          });

          client = new Client(
            { name: "sync-script", version: "1.0.0" },
            { capabilities: {} }
          );

          await client.connect(transport);
          
          const { tools } = await client.listTools();
          console.log(`🛠️  Found ${tools.length} existing tools on ${serverName}.`);
          
          for (const tool of tools) {
              // Format tool name as typically used in the system (e.g. git_status)
              // We might prefix it to avoid collisions if needed, but existing convention seems to be direct names mostly
              // However, McpOrchestrator prefixes them: `${serverName}_${tool.name}`
              // Let's stick to the Orchestrator convention to match runtime behavior!
              const safeName = `${serverName}_${tool.name}`.replace(/-/g, '_');
              
              const tsDefinition = generateToolInterface(tool.name, tool.description || '', tool.inputSchema);
              
              console.log(`   -> Syncing ${safeName}...`);
              
              await prisma.tool.upsert({
                  where: { name: safeName },
                  update: {
                      description: `[MCP: ${serverName}] ${tool.description}`,
                      instruction: tsDefinition,
                      schema: JSON.stringify(tool.inputSchema),
                      isEnabled: true
                  },
                  create: {
                      name: safeName,
                      description: `[MCP: ${serverName}] ${tool.description}`,
                      instruction: tsDefinition,
                      schema: JSON.stringify(tool.inputSchema),
                      isEnabled: true
                  }
              });
          }
          
      } catch (err) {
          console.error(`❌ Failed to sync server ${serverName}:`, err);
      } finally {
          if (client) {
             try { await client.close(); } catch {}
          }
      }
  }
  
  console.log('\n✅ Sync Complete.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
