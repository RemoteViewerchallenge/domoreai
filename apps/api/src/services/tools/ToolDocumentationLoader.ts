import { ToolDefinition } from '../protocols/LocalProtocol.js';

export async function loadToolDocs(
    tools: string[], 
    nativeTools: ToolDefinition[],
    additionalTools: ToolDefinition[] = [] 
): Promise<string> {
    const docs: string[] = [];
    const fs = await import('fs/promises');
    const path = await import('path');

    // Combine all available tool definitions (Native + Meta/Manual)
    const allDefinitions = [...nativeTools, ...additionalTools];

    // Resolve path to .domoreai/tools
    let rootDir = process.cwd();
    if (rootDir.endsWith('apps/api')) {
        rootDir = path.resolve(rootDir, '../../');
    }
    const toolsDir = path.join(rootDir, '.domoreai/tools');

    for (const toolRequest of tools) {
        // 1. Check if we have a definition for this tool (Native or Meta)
        const toolDef = allDefinitions.find(t => t.name === toolRequest);
        
        if (toolDef) {
            docs.push(`### Tool: \`system.${toolDef.name}\``);
            docs.push(`**Description:** ${toolDef.description}`);
            docs.push('**Signature:**');
            docs.push('```typescript');
            
            // Generic TypeScript Signature Generation
            const schema = toolDef.input_schema as { properties?: Record<string, { type: string; enum?: string[] }>; required?: string[] } | undefined;
            const props = schema?.properties || {};
            
            // Build prop string: "key: type"
            const args = Object.entries(props).map(([k, v]) => {
                let typeStr = v.type;
                if (v.type === 'array') typeStr = 'string[]'; // Simplified assumption
                if (v.enum) typeStr = v.enum.map(e => `'${e}'`).join(' | ');
                
                const isOptional = !(schema?.required?.includes(k));
                return `${k}${isOptional ? '?' : ''}: ${typeStr}`;
            }).join(', ');
            
            docs.push(`await system.${toolDef.name}({ ${args} })`);
            docs.push('```');
            docs.push('---');
            continue;
        }

        // 2. MCP Tools (Server Names)
        // If not found in definitions, it might be an MCP server name requesting all its docs
        try {
            const content = await fs.readFile(path.join(toolsDir, `${toolRequest}_examples.md`), 'utf-8');
            docs.push(content);
        } catch {
            // Ignore if no doc found
        }
    }

    return docs.join('\n\n');
}
