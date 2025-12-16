# Tool Prompt Injection - Fix Summary

## ✅ Problem Fixed

Tool prompts were not being injected into agent system prompts because the required documentation files didn't exist.

## 🔧 What Was Done

### 1. Created `.domoreai/tools/` Directory
```bash
mkdir -p /home/guy/mono/.domoreai/tools
```

### 2. Created Tool Documentation Files

Created usage example files for all MCP tools:

- ✅ `git_examples.md` - Git repository management examples
- ✅ `postgres_examples.md` - Database query examples  
- ✅ `filesystem_examples.md` - File system operations examples
- ✅ `browser_examples.md` - Web browsing examples

### 3. How It Works Now

When an agent is created with tools enabled:

1. **AgentFactory** calls **PromptFactory.build()** with the role's tools array
2. **PromptFactory** reads files from `.domoreai/tools/` directory
3. For each tool in the role's tools array:
   - Loads `{toolname}_examples.md` if it exists
   - Loads `{toolname}.d.ts` if it exists (optional TypeScript definitions)
4. Injects tool documentation into the system prompt:

```
[Role's Base Prompt]

## 🛠️ AVAILABLE TOOLS (TYPE DEFINITIONS)
[TypeScript definitions if .d.ts files exist]

## 💡 USAGE EXAMPLES
[Content from _examples.md files]
```

## 📋 Verification Steps

### 1. Check Files Were Created
```bash
ls -la /home/guy/mono/.domoreai/tools/
```

Expected output:
```
browser_examples.md
filesystem_examples.md
git_examples.md
postgres_examples.md
```

### 2. Test Tool Injection

**Create a test role with tools:**
1. Open Role Creator Panel in UI
2. Create a new role
3. Enable tools: `git`, `postgres`, `filesystem`, `browser`
4. Save the role

**Spawn an agent:**
1. Create an agent with this role
2. Check server logs for:
   ```
   [PromptFactory] Loading tool documentation for: git, postgres, filesystem, browser
   ```

**Verify prompt includes tools:**
The generated system prompt should contain sections like:
```
## 💡 USAGE EXAMPLES

# Git Tool Usage Examples
...

# Postgres Tool Usage Examples
...
```

### 3. Test Agent Knowledge

Ask the agent:
- "What tools do you have access to?"
- "How do I check git status?"
- "Show me how to query the database"

The agent should reference the tool examples in its responses.

## 🎯 Next Steps (Optional Enhancements)

### Add TypeScript Definitions

Create `.d.ts` files for better tool documentation:

**Example: `git.d.ts`**
```typescript
/**
 * Git Repository Management Tool
 */
interface GitTool {
  /**
   * Execute a git command
   * @param command - Git command (e.g., "status", "log", "diff")
   * @param args - Additional arguments
   */
  execute(command: string, args?: string[]): Promise<string>;
  
  /**
   * Get current branch name
   */
  getCurrentBranch(): Promise<string>;
}
```

### Add More Tools

When adding new MCP tools to the registry:
1. Create `{toolname}_examples.md` in `.domoreai/tools/`
2. Optionally create `{toolname}.d.ts` for type definitions
3. Add the tool name to roles that should use it

### Dynamic Tool Loading

For a more advanced solution, modify `PromptFactory.ts` to:
1. Try loading from files first (current behavior)
2. Fall back to fetching schemas from MCP servers directly
3. Cache tool schemas to avoid repeated connections

See `/home/guy/mono/apps/api/docs/TOOL_PROMPT_INJECTION_FIX.md` for implementation details.

## 📁 Files Created

1. `/home/guy/mono/.domoreai/tools/git_examples.md`
2. `/home/guy/mono/.domoreai/tools/postgres_examples.md`
3. `/home/guy/mono/.domoreai/tools/filesystem_examples.md`
4. `/home/guy/mono/.domoreai/tools/browser_examples.md`
5. `/home/guy/mono/apps/api/docs/TOOL_PROMPT_INJECTION_FIX.md` (documentation)

## 🔍 How to Debug

If tool prompts still aren't being injected:

1. **Check PromptFactory logs:**
   ```
   [PromptFactory] Loading tool documentation...
   ```

2. **Verify role has tools enabled:**
   ```sql
   SELECT name, tools FROM "Role" WHERE id = 'your-role-id';
   ```

3. **Check file permissions:**
   ```bash
   ls -la /home/guy/mono/.domoreai/tools/
   ```

4. **Test file reading:**
   ```bash
   cat /home/guy/mono/.domoreai/tools/git_examples.md
   ```

5. **Check PromptFactory filtering logic:**
   The tool name in the role's `tools` array must match the filename prefix.
   - Role has tool: `"git"` → Looks for: `git_examples.md`
   - Role has tool: `"postgres"` → Looks for: `postgres_examples.md`

## ✨ Result

Tool prompts are now properly injected into agent system prompts! Agents will have access to detailed usage examples for:
- Git operations
- Database queries
- File system access
- Web browsing

This enables agents to use tools effectively with proper context and examples.
