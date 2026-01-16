export async function loadToolDocs(
    tools: string[]
): Promise<string> {
    const fs = await import('fs/promises');
    const path = await import('path');

    // Resolve path to .domoreai/tools
    let rootDir = process.cwd();
    if (rootDir.endsWith('apps/api')) {
        rootDir = path.resolve(rootDir, '../../');
    }
    const toolsDir = path.join(rootDir, '.domoreai/tools');

    const examples: string[] = [];

    // Load requested toolsets (system, filesystem, git, or MCP server names)
    for (const toolRequest of tools) {
        try {
            // Check if it's a grouped doc (e.g., system_examples.md, filesystem_examples.md)
            const content = await fs.readFile(path.join(toolsDir, `${toolRequest}_examples.md`), 'utf-8');
            examples.push(content);
        } catch {
            // Try fallback to just server name if examples suffix is missing
            try {
                const content = await fs.readFile(path.join(toolsDir, `${toolRequest}.md`), 'utf-8');
                examples.push(content);
            } catch {
                // Ignore if no doc found
            }
        }
    }

    if (examples.length === 0) return "";

    return examples.join('\n\n---\n\n');
}
