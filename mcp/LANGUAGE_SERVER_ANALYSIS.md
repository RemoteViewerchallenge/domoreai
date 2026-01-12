# Language Server Analysis

## Your Current Implementation

**File**: `apps/api/src/services/languageServer.service.ts`

**What it does:**
- Spawns `typescript-language-server` via WebSocket
- Provides TypeScript LSP features over WebSocket at `/language-server`
- Features: autocomplete, go-to-definition, type checking, etc.
- **Scope**: TypeScript only
- **Integration**: Direct WebSocket connection to your UI

## MCP Language Server

**File**: `mcp/extracted/mcp-language-server-main/mcp-language-server`

**What it does:**
- Wraps ANY LSP server (not just TypeScript) via MCP protocol
- Takes `-lsp` flag to specify which language server to run
- Provides LSP features as MCP tools (Definition, References, Completion, TypeDefinition)
- **Scope**: Any language (Go, Python, Rust, etc.)
- **Integration**: MCP protocol (tool-based, not direct LSP)

---

## Key Differences

| Feature | Your LanguageServerService | MCP Language Server |
|---------|---------------------------|---------------------|
| **Protocol** | Native LSP over WebSocket | LSP wrapped in MCP tools |
| **Languages** | TypeScript only | Any language (configurable) |
| **Integration** | Direct UI connection | Via MCP tool calls |
| **Use Case** | Real-time editor features | AI agent code intelligence |
| **Performance** | Fast (direct connection) | Slower (tool call overhead) |
| **Flexibility** | Single language | Multi-language support |

---

## Recommendation: **Keep Both, But Different Purposes**

### Keep Your LanguageServerService For:
✅ **Real-time editor features** in your UI
- Autocomplete while typing
- Instant error checking
- Go-to-definition clicks
- Hover tooltips
- **Why**: Direct WebSocket = low latency, essential for good UX

### Use MCP Language Server For:
✅ **AI agent code intelligence**
- Let AI agents query code definitions
- AI-driven refactoring across multiple languages
- Automated code analysis
- **Why**: MCP tools = AI can invoke programmatically

---

## Suggested Action

### Option 1: Keep Both (Recommended)
- **Your LanguageServerService**: UI editor features
- **MCP Language Server**: AI agent tools
- **Benefit**: Best of both worlds

### Option 2: Remove MCP Language Server
- If you don't need AI agents to query code intelligence
- If you only care about TypeScript
- **Saves**: One less MCP server to maintain

### Option 3: Hardcode MCP Tools into Your App
Instead of running MCP language server, you could:
1. Create native API endpoints that wrap `typescript-language-server`
2. Expose them as tools in your tool registry
3. **Benefit**: No external MCP process
4. **Downside**: More code to maintain, TypeScript-only

---

## My Recommendation

**Remove the MCP Language Server** because:

1. ✅ You already have a better implementation for UI
2. ✅ Your use case (orchestration) doesn't need AI agents querying code definitions
3. ✅ The MCP version adds overhead without clear benefit
4. ✅ If you need multi-language support later, you can add it to your existing service

**What to keep:**
- Your `LanguageServerService` (apps/api/src/services/languageServer.service.ts)
- Focus on orchestration tools (Roundtable, OpenSpec, etc.)

Would you like me to remove the MCP language server from the registry?
