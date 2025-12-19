import { ToolDefinition } from '../protocols/LocalProtocol.js';

export async function loadToolDocs(tools: string[], nativeTools: ToolDefinition[]): Promise<string> {
    const docs: string[] = [];
    const fs = await import('fs/promises');
    const path = await import('path');

    // Resolve path to .domoreai/tools
    let rootDir = process.cwd();
    if (rootDir.endsWith('apps/api')) {
        rootDir = path.resolve(rootDir, '../../');
    }
    const toolsDir = path.join(rootDir, '.domoreai/tools');

    for (const tool of tools) {
        // 1. Native Tools
        const nativeTool = nativeTools.find(t => t.name === tool);
        if (nativeTool) {
            docs.push(`### Tool: \`system.${nativeTool.name}\``);
            docs.push(`**Description:** ${nativeTool.description}`);
            docs.push('**Signature:**');
            docs.push('```typescript');
            // Simplified signature generation
            const props = nativeTool.input_schema?.properties || {};
            const args = Object.entries(props).map(([k, v]) => `${k}: ${(v).type}`).join(', ');
            docs.push(`await system.${nativeTool.name}({ ${args} })`);
            docs.push('```');
            docs.push('---');
            continue;
        }

        // 2. MCP Tools (Server Names)
        // We assume the tool string IS the server name for MCP tools in this context
        // (AgentRuntime init receives server names)
        try {
            const content = await fs.readFile(path.join(toolsDir, `${tool}_examples.md`), 'utf-8');
            docs.push(content);
        } catch (e) {
            // Ignore if no doc found
        }
    }

    return docs.join('\n\n');
}
