# Tool Prompt Injection - Fix Documentation

## Problem

Tool prompts are not being injected into agent system prompts. Only `search_codebase` works, but MCP tools (`git`, `postgres`, `filesystem`, `browser`) are not being included.

## Root Cause

The `PromptFactory` expects tool documentation files in `.domoreai/tools/` directory:
- `{toolname}.d.ts` - TypeScript definitions
- `{toolname}_examples.md` - Usage examples

But these files don't exist for MCP tools, so they're never injected.

## Current Flow

```typescript
// PromptFactory.ts (lines 66-117)
async build(role, userQuery, memoryConfig, tools, projectPrompt) {
  // ...
  
  // Load tool files from .domoreai/tools
  const toolsDir = path.join(rootDir, '.domoreai/tools');
  const files = await fs.readdir(toolsDir);
  
  for (const file of files) {
    // Filter: only include tools in the role's tools array
    if (tools && tools.length > 0) {
      const serverName = file.split('.')[0].split('_')[0];
      if (!tools.includes(serverName)) {
        continue; // Skip this file
      }
    }
    
    // Load .d.ts files (definitions)
    if (file.endsWith('.d.ts')) {
      toolDefs += content;
    }
    
    // Load _examples.md files (usage examples)
    if (file.endsWith('_examples.md')) {
      toolExamples += content;
    }
  }
  
  // Inject into prompt
  return `${rolePrompt}\n${toolSection}`;
}
```

## Solution

### Option 1: Create Tool Documentation Files (Recommended)

Create the missing files in `.domoreai/tools/`:

**1. Create directory:**
```bash
mkdir -p /home/guy/mono/.domoreai/tools
```

**2. Create tool definition files:**

`git.d.ts`:
```typescript
/**
 * Git Repository Management Tool
 * Provides version control operations
 */
interface GitTool {
  /**
   * Execute a git command in the repository
   * @param command - Git command to execute (e.g., "status", "log", "diff")
   * @param args - Additional arguments for the command
   */
  execute(command: string, args?: string[]): Promise<string>;
  
  /**
   * Get the current branch name
   */
  getCurrentBranch(): Promise<string>;
  
  /**
   * Get commit history
   * @param limit - Number of commits to retrieve
   */
  getLog(limit?: number): Promise<Commit[]>;
}
```

`git_examples.md`:
```markdown
# Git Tool Usage Examples

## Check Repository Status
\`\`\`typescript
await git.execute('status');
\`\`\`

## View Recent Commits
\`\`\`typescript
const commits = await git.getLog(10);
\`\`\`

## Create a New Branch
\`\`\`typescript
await git.execute('checkout', ['-b', 'feature/new-feature']);
\`\`\`
```

**3. Repeat for other tools:**
- `postgres.d.ts` + `postgres_examples.md`
- `filesystem.d.ts` + `filesystem_examples.md`
- `browser.d.ts` + `browser_examples.md`
- `search_codebase.d.ts` + `search_codebase_examples.md` (already works)

### Option 2: Fix PromptFactory to Use MCP Tool Schemas Directly

Modify `PromptFactory.ts` to fetch tool schemas from MCP servers instead of files:

```typescript
// In PromptFactory.ts
async build(role, userQuery, memoryConfig, tools, projectPrompt) {
  // ...
  
  // NEW: Load tool schemas from MCP servers
  let toolSection = '';
  if (tools && tools.length > 0) {
    try {
      const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
      const { StdioClientTransport } = await import('@modelcontextprotocol/sdk/client/stdio.js');
      
      let toolDefs = '';
      let toolExamples = '';
      
      for (const toolName of tools) {
        try {
          // Get server config from registry
          const { RegistryClient } = await import('./mcp-registry-client.js');
          const config = await RegistryClient.getServerConfig(toolName);
          
          // Connect to MCP server
          const transport = new StdioClientTransport({
            command: config.command,
            args: config.args,
            env: config.env
          });
          
          const client = new Client({ name: 'prompt-factory', version: '1.0.0' }, {
            capabilities: {}
          });
          
          await client.connect(transport);
          
          // List available tools from this server
          const { tools: serverTools } = await client.listTools();
          
          // Add to definitions
          toolDefs += `\n// ${toolName} Tools\n`;
          for (const tool of serverTools) {
            toolDefs += `/**\n * ${tool.description}\n */\n`;
            toolDefs += `function ${tool.name}(params: ${JSON.stringify(tool.inputSchema)}): Promise<any>;\n\n`;
          }
          
          await client.close();
        } catch (error) {
          console.warn(`Failed to load schema for tool ${toolName}:`, error);
        }
      }
      
      if (toolDefs) {
        toolSection = `
## 🛠️ AVAILABLE TOOLS
\`\`\`typescript
${toolDefs}
\`\`\`
`;
      }
    } catch (error) {
      console.error('Failed to load MCP tool schemas:', error);
    }
  }
  
  return `${rolePrompt}\n${projectSection}\n${memoryBlock}${toolSection}`;
}
```

### Option 3: Hybrid Approach (Best)

1. Keep file-based system for custom tool documentation
2. Add fallback to MCP schema fetching
3. Cache tool schemas to avoid repeated connections

```typescript
async loadToolDocumentation(tools: string[]): Promise<string> {
  let toolDefs = '';
  let toolExamples = '';
  
  for (const toolName of tools) {
    // Try to load from files first
    const fromFiles = await this.loadToolFromFiles(toolName);
    if (fromFiles) {
      toolDefs += fromFiles.definitions;
      toolExamples += fromFiles.examples;
      continue;
    }
    
    // Fallback: Load from MCP server
    const fromMCP = await this.loadToolFromMCP(toolName);
    if (fromMCP) {
      toolDefs += fromMCP.definitions;
    }
  }
  
  return toolDefs || toolExamples ? `
## 🛠️ AVAILABLE TOOLS
${toolDefs ? `\`\`\`typescript\n${toolDefs}\n\`\`\`` : ''}
${toolExamples ? `\n## 💡 USAGE EXAMPLES\n${toolExamples}` : ''}
` : '';
}
```

## Quick Fix (Immediate)

The fastest fix is to create the tool documentation files manually:

```bash
cd /home/guy/mono
mkdir -p .domoreai/tools

# Create basic documentation for each tool
cat > .domoreai/tools/git_examples.md << 'EOF'
# Git Tool Examples

Use git commands to manage the repository:
- `git status` - Check repository status
- `git log -n 5` - View recent commits
- `git diff` - See changes
EOF

cat > .domoreai/tools/postgres_examples.md << 'EOF'
# Postgres Tool Examples

Execute SQL queries:
- SELECT queries to fetch data
- INSERT/UPDATE/DELETE for modifications
- CREATE TABLE for schema changes
EOF

cat > .domoreai/tools/filesystem_examples.md << 'EOF'
# Filesystem Tool Examples

Access local files:
- Read file contents
- Write/update files
- List directory contents
- Create/delete files and directories
EOF

cat > .domoreai/tools/browser_examples.md << 'EOF'
# Browser Tool Examples

Web browsing capabilities:
- Navigate to URLs
- Extract page content
- Search the web
- Download resources
EOF
```

## Verification

After implementing the fix, verify tool prompts are injected:

1. **Check agent creation logs:**
   ```
   [PromptFactory] Loading tools: git, postgres, filesystem
   [PromptFactory] Loaded tool documentation for: git, postgres, filesystem
   ```

2. **Inspect generated prompt:**
   The system prompt should include:
   ```
   ## 🛠️ AVAILABLE TOOLS
   ...tool definitions...
   
   ## 💡 USAGE EXAMPLES
   ...examples...
   ```

3. **Test in UI:**
   - Create a role with tools enabled
   - Spawn an agent
   - Check if the agent knows about the tools

## Files to Modify

1. **`apps/api/src/services/PromptFactory.ts`** - Fix tool loading logic
2. **`.domoreai/tools/*.md`** - Create tool documentation files
3. **`.domoreai/tools/*.d.ts`** - Create tool type definitions (optional)

## Related Files

- `apps/api/src/services/AgentFactory.ts` - Calls PromptFactory.build()
- `apps/api/src/routers/orchestrator.router.ts` - getToolExamples endpoint
- `apps/api/src/services/mcp-registry-client.ts` - MCP server registry
