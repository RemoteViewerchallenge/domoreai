# MCP Server Status Report

Generated: 2026-01-12

**Transport Note**: All active servers below are configured to use **Stdio** (Standard Input/Output) pipes. They do **not** bind to network ports (like 3000) in this configuration, preventing conflicts with web applications or each other.

## ✅ Working Servers (Installed & Configured)

| Server | Description | Entry Point | Tools |
|--------|-------------|-------------|-------|
| **filesystem** | Surgical file editing | `node_modules/@cyanheads/filesystem-mcp-server/dist/index.js` | ~10 (read_file, write_file, edit_file, etc.) |
| **git** | Git history and operations | `node_modules/git-mcp-server/build/index.js` | 21 (git_status, git_log, git_commit, etc.) |
| **postgres** | Database inspection | `npx @henkey/postgres-mcp-server` | 19 (query, schema_info, etc.) |
| **playwright** | UI verification | `npx @automatalabs/mcp-server-playwright` | 10 (browser_open, page_click, etc.) |
| **memory** | Knowledge Graph | `knowledgegraph-mcp-main/dist/index.js` | 11 (add_node, add_edge, search_graph, etc.) |
| **linear** | Linear Issues | `mcp-linear-main/dist/index.js` | ~8 (create_issue, search_issues, etc.) |
| **docker** | Sandboxed execution | `mcp-server-docker-main/.venv/bin/mcp-server-docker` | 20 (run_container, etc.) |
| **context7** | Documentation fetching (Patched `CLERK_DOMAIN` in `constants.ts`) | `context7-master/packages/mcp/dist/index.js` | 2 (resolve-library-id, query-docs) |
| **planning** | Software Planning Tool | `Software-planning-mcp-main/build/index.js` | 6 (start_planning, save_plan, add_todo, etc.) |
| **language-server** | Code Intelligence (Go/TS) | `mcp-language-server-main/mcp-language-server` | 5 (Definition, References, Completion, etc.) |
| **deep-research** | Deep Web & Academic Search | `Claude-Deep-Research-main/deep_research.py` | 1 (deep_research) |
| **commander** | Process & Fuzzy Search | `DesktopCommanderMCP-main/dist/index.js` | 17 (list_processes, kill_process, start_search) |

**Total Working Tools**: 125 (Verified via Startup Sync)

---

## ⚠️ Missing Functionality: Dynamic Discovery
**Gap**: Agents cannot currently search for and install new MCP servers dynamically. `ncp` was intended for this but is broken.

---

## 🔧 In Progress / To Be Installed

*None*

---

## 🛑 Hold (Wait)
| Server | Notes |
|--------|-------|
| **mastra** | **HOLD**: User doesn't know purpose + build errors. |
| **react-mcp** | **HOLD**: Complex, wait until later. |
| **flyonui-mcp** | **HOLD**: React server UI, wait. |
| **ncp** | **Broken**: Discovery tool. |

---

## ❌ Deleted
| Server | Reason |
|--------|--------|
| **roundtable** | Redundant with Agent Runtime (Orchestrator). |
| **openspec** | Not a server (CLI tool only). |
| **codemode-mcp** | Redundant. |
| **web-search** | Redundant. |
| **vscode-internal** | Control IDE from agent (VS Internal Commands). |
| **codex-mcp** | OpenAI Codex CLI wrapper (Redundant with Coding Agent). |
| **deepwiki** | Broken. |
| **tavily** | Paid. |
| **mcp-proxy** | Redundant. |
| **mcp-registry** | Redundant. |
| **dockmaster** | Redundant. |
| **registry** | Redundant. |
| **MCPJungle** | Redundant. |
| **uLoopMCP** | Unity Project Automation (Irrelevant). |
| **VectorChord** | Postgres Vector Extension (Irrelevant). |
