import fs from 'fs/promises';
import path from 'path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { RegistryClient } from '../apps/api/src/services/mcp-registry-client.js';
import { ToolDocumenter } from '../apps/api/src/services/ToolDocumenter.js';

const MANIFEST_DIR = path.join(process.cwd(), 'docs', 'mcp-manifests');

async function generateManifests() {
  console.log('🚀 Starting MCP Manifest Generation...');
  const servers = await RegistryClient.listServers();

  await fs.mkdir(MANIFEST_DIR, { recursive: true });

  for (const server of servers) {
    console.log(`🔌 Connecting to ${server.name}...`);
    try {
        const config = await RegistryClient.getServerConfig(server.name);
        const transport = new StdioClientTransport({
            command: config.command,
            args: config.args,
            env: config.env as any
        });

        const client = new Client({ name: "manifest-gen", version: "1.0.0" }, { capabilities: {} });
        await client.connect(transport);

        // Fetch capabilities
        const toolsResult = await client.listTools();
        const resourcesResult = await client.listResources();

        const manifest = {
            server: server.name,
            generatedAt: new Date().toISOString(),
            tools: toolsResult.tools,
            resources: resourcesResult.resources
        };

        // 1. Save lightweight JSON Manifest
        await fs.writeFile(
            path.join(MANIFEST_DIR, `${server.name}.json`), 
            JSON.stringify(manifest, null, 2)
        );
        console.log(`✅ Saved manifest for ${server.name}`);

        // 2. Generate TypeScript Definitions and Examples
        console.log(`📚 Generating documentation for ${server.name}...`);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tools = (toolsResult.tools as any[]).map(t => ({
            name: t.name,
            description: t.description,
            inputSchema: t.inputSchema
        }));
        await ToolDocumenter.documentTools(server.name, tools);
        
        await client.close();
    } catch (error) {
        console.error(`❌ Failed to export ${server.name}:`, error);
    }
  }
  console.log('✨ All manifests generated.');
}

generateManifests().catch(err => {
    console.error('Fatal Error:', err);
    process.exit(1);
});
