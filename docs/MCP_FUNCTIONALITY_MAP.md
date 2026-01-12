# MCP Functionality Map & Guide

This document maps capabilities to specific MCP servers to help you choose the right tool for the job. It also provides deep-dive instructions for advanced servers.

## 🗺️ Capability Map

| Capability | Server / Tool | Description |
| :--- | :--- | :--- |
| **System Control** | `desktop-commander` | Process management (`list_processes`, `kill_process`), Screenshot, System Info. |
| **Filesystem** | `filesystem` | Read/Write files, list directories (Standard). |
| **Coding Intelligence** | `language-server` | Go/TS LSP support (Go to definition, References, etc.). |
| **Web Research** | `deep-research` | Deep web & **Academic** search (Semantic Scholar). |
| **Planning (Personal)** | `planning` | Interactive Todo/Plan management for the agent itself. |
| **Planning (Team/Spec)** | `openspec` | Spec-Driven Development. collaborative process (Proposals -> Specs -> Code). |
| **Project Mgmt (External)** | `linear` | Interact with Linear Issues, Cycles, and Projects. |
| **Orchestration** | `roundtable` | **Parallel Execution**. Delegate tasks to sub-agents (Claude, Gemini, Codex). |
| **Memory** | `memory` | Persistent Knowledge Graph. "Remember I like X", "Project Y uses React". |
| **Docker** | `docker` | Manage containers. |

---

## 🔍 Deep Dive: Advanced Servers

### 1. Deep Research (`deep-research`)
A powerful research assistant that goes beyond simple Google searches.
*   **How it works**: Combines **DuckDuckGo** (Web) and **Semantic Scholar** (Academic) to find high-quality sources, extracts content, and synthesizes findings.
*   **Tool**: `deep_research`
*   **Parameters**:
    *   `query`: Your research question.
    *   `sources`: `"web"`, `"academic"`, or `"both"` (Default: Both).
    *   `num_results`: How many deep dives to perform (1-3).
*   **Use Case**: "Find the latest papers on Transformer efficiency" or "Research the history of Origami using academic sources."

### 2. OpenSpec (`openspec`)
A **Process Framework** for agreeing on strict requirements before coding.
*   **Philosophy**: Specs -> Code.
*   **Workflow**:
    1.  `proposal`: You (or AI) draft a change.
    2.  `review`: You iterate on the spec until agreed.
    3.  `implement`: The AI writes code satisfying the spec.
    4.  `archive`: The spec is merged into the "Living Specs".
*   **Tools**: `/openspec:proposal`, `/openspec:apply` (Slash commands via text tools).
*   **Use Case**: Building complex features where requirements are vague. "Make a proposal for adding 2FA."

### 3. Software Planning (`planning`)
A local, interactive "scratchpad" for the Agent's own plan.
*   **How it works**: Maintains a stateful list of Todos and Goals during a session.
*   **Tools**:
    *   `start_planning(goal)`: Initialize.
    *   `add_todo(title, complexity, codeExample)`: Add task.
    *   `update_todo_status`: Mark done.
    *   `save_plan`: Export markdown.
*   **Use Case**: Long-running refactors. "Start planning the migration to Next.js 14."

### 4. Roundtable (`roundtable`)
The "Force Multiplier". It allows **Parallel Execution**.
*   **How it works**: You send a single prompt, and Roundtable dispatches it to multiple "Sub-Agents" (e.g., Claude for reasoning, Codex for code, Gemini for large context). It then synthesizes the results.
*   **Tools**: `dispatch_task` (or similar).
*   **Requires**: `CLI_MCP_SUBAGENTS` environment variable and installed CLIs.
*   **Use Case**: "Debug this issue. Use Gemini to read logs, Claude to analyze logic, and Codex to propose a fix."

### 5. Linear (`linear`)
Integration with your Linear Issue Tracker.
*   **Purpose**: Read/Write tickets.
*   **Use Case**: "Find the ticket for 'Login Bug' and mark it In Progress." (Requires API Key).

### 6. Memory (`knowledgegraph-mcp`)
Persistent "Long Term Memory" for the Agent.
*   **Concept**: Stores facts in a **Knowledge Graph** (Entities + Relations).
*   **Tools**:
    *   `create_entities`: "John Smith is a dev".
    *   `create_relations`: "John Smith [WORKS_ON] Project Alpha".
    *   `search_knowledge`: "Who works on Project Alpha?"
*   **Use Case**: Storing preferences, team structure, or project architecture details that persist across sessions.

---

## 🧬 Memory vs. DNA (RoleVariant)
You asked if `memory` is the same as `cortexConfig.tools` (DNA).
**No, they are completely different.**

| Concept | What is it? | Example | Where is it stored? |
| :--- | :--- | :--- | :--- |
| **DNA (CortexConfig)** | **Static Configuration**. Defines *Who* the agent is and *What Tools* it has access to. | "You are a Frontend Dev. You have access to `read_file` and `deep_research`." | Postgres (`RoleVariant` table). |
| **Memory (MCP)** | **Dynamic Knowledge**. Defines *What* the agent knows/remembers from past interactions. | "User prefers usage of `const` over `let`." | SQLite (`.knowledge-graph/knowledgegraph.db`). |

**Analogy**:
*   **DNA**: The brain structure and manuals you are born with.
*   **Memory**: The diary you write in every day.
