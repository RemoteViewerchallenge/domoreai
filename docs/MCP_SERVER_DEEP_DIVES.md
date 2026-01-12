# MCP Server Deep Dives & Redundancy Analysis

This document provides a detailed breakdown of specific MCP servers, their usage, and a critical analysis of whether they duplicate existing functionality in the **DoMoreAI / Nebula** architecture.

---

## 1. Roundtable (`roundtable-ai`)
**Verdict: 🔴 HIGHLY REDUNDANT**

### What it is
A local orchestrator that delegates tasks to other CLI tools (Claude, Gemini, Codex). It acts as a "Middle Manager" agent.

### Redundancy Analysis
*   **Your System**: `AgentRuntime` + `VolcanoAgent` + `ProviderManager` IS an orchestrator. You already support multi-model fallback (`ModelSelector`), tool calling, and context management.
*   **Conflict**: Using `Roundtable` would mean: `AgentRuntime` -> `Roundtable MCP` -> `Gemini CLI` -> `Gemini API`.
*   **Better Approach**: `AgentRuntime` -> `ProviderManager` -> `Gemini API`.
*   **Recommendation**: **Remove**. It adds latency and dependency on external CLIs. Your architecture is already superior.

---

## 2. Memory (`knowledgegraph-mcp`)
**Verdict: 🟡 PARTIALLY REDUNDANT**

### What it is
A persistent Knowledge Graph (Entities + Relations) stored in SQLite/Postgres. Allows agents to "remember" facts across sessions.

### Redundancy Analysis
*   **Your System**:
    *   **DNA (`ContextConfig`)**: Defines *Static* access and strategy.
    *   **VectorService**: Handles *Semantic* memory (Embeddings/RAG).
    *   **Prisma**: Handles structured application data.
*   **Gap**: You do *not* currently have a graph-based "Fact Store" (e.g. "User prefers dark mode", "Project A depends on Project B") accessible to the agent via tools.
*   **Overlap check**:
    *   If `DNA` is just configuration strings, it's not "Memory".
    *   If `VectorService` is only document chunks, it isn't "Structured Facts".
*   **Recommendation**: **Keep** for now as a "Structured Long-Term Memory" tool, distinct from Vector RAG. But consider building a native `GraphService` later to replace it.

---

## 3. Deep Research (`deep-research`)
**Verdict: 🟢 UNIQUE (USEFUL)**

### What it is
An agentic loop for deep web and academic research. It performs multiple searches, scrapes content, and synthesizes a report.

### Redundancy Analysis
*   **Your System**: Has `search_web` (Tavily/Google). This is a "single shot" tool.
*   **Value Add**: `deep-research` automates the *Process* of research (Search -> Click -> Read -> Refine -> Search Again). It also accesses **Semantic Scholar** (Academic papers).
*   **Recommendation**: **Keep**. It provides a "High Level" capability that saves your main agent many steps.

---

## 4. OpenSpec (`openspec`)
**Verdict: 🟢 UNIQUE (WORKFLOW)**

### What it is
A strict **Spec-Driven Development** framework. It forces a workflow: Proposal -> Spec -> Code.

### Redundancy Analysis
*   **Your System**: You have `Software-planning-mcp` (generic todos).
*   **Value Add**: `OpenSpec` enforces a specific *methodology* (SDD). If you want your agents to write strict specs before coding, this is unique.
*   **Recommendation**: **Keep** if you like the Spec-Driven workflow. If you prefer free-form capability, it adds friction.

---

## 5. Software Planning (`software-planning-mcp`)
**Verdict: ⚪ BASELINE TOOL**

### What it is
Your currently integrated planning tool. Maintains a Todo list and "Plan" markdown.

### Redundancy Analysis
*   This *is* the tool you are using for the "Planning" capability. There is no internal duplication unless you wrote a native `PlanningService`.
*   **Recommendation**: **Keep**. It's lightweight and effective.

---

## 6. Linear (`mcp-linear`)
**Verdict: ⚪ EXTERNAL API WRAPPER**

### What it is
A wrapper around the linear.app API (Issue Tracking).

### Cost & Usage
*   **Cost**: Linear has a Free tier, but it is a paid SaaS product for teams.
*   **Redundancy**: None. You cannot access Linear data without an API wrapper.
*   **Recommendation**: **Keep** only if you actually use Linear for project management. If you use JIRA or GitHub Issues, remove this.

---

## 🧬 DNA vs. Tools: The "Strategy" Distinction

You asked if "DNA" (RoleVariant) allows different strategies. **Yes.**

*   **Role DNA (`RoleVariant` structure)**:
    *   **Identity**: "Who am I?" (Persona).
    *   **Cortex**: "How do I think?" (Orchestration). **Includes the Tool List**.
    *   **Governance**: "What rules do I follow?" (Linting).
    *   **Context**: "What do I know?" (Permissions).
*   **MCP Servers**: These are the **Executables** (Binaries/Scripts) that provide the *Tools*.

**The Connection**:
1.  **Server**: Provides the capability (e.g., `deep-research` server provides `deep_research` tool).
2.  **DNA**: The `RoleFactory` decides: "This 'Researcher' Role needs the `deep_research` tool."
3.  **Agent**: Reads the DNA, sees "I need `deep_research`", and activates the connection to the Server.

**Conclusion**:
You are correct that we should avoid duplication.
*   **Action**: I recommend **Removing `Roundtable`** immediately as your `AgentRuntime` supersedes it.
