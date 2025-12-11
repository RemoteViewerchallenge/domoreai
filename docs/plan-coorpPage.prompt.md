# COORP Page Spec – Corporate Orchestration, Roles, and Crews

> COORP = Cognitive Orchestration & Routing Platform  
> This page is the **visual brain** of the system: it shows the corporate structure of AI roles, their capabilities, and how they are orchestrated into Volcano crews and project flows.

---

## 1. Purpose and Relationship to Other Surfaces

**COORP Page** is the **org + orchestration view**:

- Defines and visualizes:
  - Roles and their parameters (context range, vision, reasoning, TTS, embedding).
  - Departments, teams, and supervisors.
  - How roles are wired together into reusable orchestration blocks and Volcano crews.
- Is **not** the “workspace chat” or “one‑off project” UI; it’s the **company‑level planner**.

It complements:

- `CreatorStudio`:
  - **Roles tab** → detailed role creation/editing surface.
  - **Orchestrations tab** → low‑level orchestration graph (ReactFlow).
- `creatorstudionew.tsx`:
  - Provides a prototype for:
    - **Corporate structure builder** canvas (drag roles/departments).
    - Rate‑limit and model visualization.
- Design system (`DesignSystemSettingsPage` et al.):
  - Provides theme tokens that COORP uses for a **cohesive aesthetic**.

**Volcano crews**:

- COORP **does not replace Volcano**.
- COORP defines:
  - Corporate roles and parameters.
  - Graphs that become **crew templates** for Volcano.
- Volcano executes those crews using:
  - Agents mapped from these roles.
  - Tools for LLM calls and system actions.

---

## 2. Role Model and Parameter‑Ranged Capabilities

### 2.1. Base Role Definition

Each role in COORP is a persistent entity, not tied to a single project.

**Fields:**

- `id: string`
- `name: string`  
  e.g. `MCP Research Agent`, `Quality Check`, `Lead Developer`, `UI Designer`.
- `departmentId?: string`  
  e.g. `Research`, `Engineering`, `UI/UX`, `Orchestration R&D`.
- `teamId?: string`  
  Roles can be grouped into teams **independently** of departments.
- `supervisorRoleId?: string`  
  The supervisory role for chain‑of‑command flows.
- `basePrompt: string`  
  Role‑specific system prompt (job responsibilities, safety rules, output shape).
- `contextPolicy`:
  - `contextRange: 'low' | 'medium' | 'high' | 'ultra'`  
    - **Low**: narrow, focused snippets (e.g. a single function or card).  
    - **Medium**: one file or one screen.  
    - **High**: multiple files / pages.  
    - **Ultra**: large semantic index slices / project‑wide view.
  - `vision: boolean` (can consume images/screenshots).
  - `reasoningDepth: 'fast' | 'standard' | 'deep'` (for tool/model selection).
  - `tts: boolean` (text‑to‑speech relevant).
  - `embeddingAccess: boolean` (can query / update vector stores).
- `tools: string[]`  
  Names/IDs of tools (e.g. `mcp_catalog_search`, `fs_write`, `ts_code_runner`).
- `uiBindings?: string[]`  
  Optional IDs/names of UI components this role is **assigned to** (e.g., certain panels in the product).

> NOTE: Roles **do not embed static models** (“Grok is coding agent”). Instead, models are dynamically chosen per role invocation via model bandits and capabilities.

### 2.2. Parameter‑Ranged Roles

A **parameter‑ranged role** is a base role plus a parameter set that narrows its operational scope.

**Examples:**

- `MCP Research Agent`:
  - Base role:
    - `department: Research`
    - `contextPolicy.contextRange: high`
    - `tools: ['mcp_catalog_search', 'embedding_query']`
  - Parameter variants:
    - `alphabetRange: 'A–G'`
    - `alphabetRange: 'H–P'`
    - `alphabetRange: 'Q–Z'`
- `Developer`:
  - Base:
    - `department: Engineering`
    - `contextPolicy.contextRange: medium`
    - Tools: `['ts_code_runner', 'fs_read']`
  - Parameters:
    - `language: 'typescript' | 'python' | 'fullstack'`
    - `subsystem: 'ui', 'backend', 'infra'`

**Representation:**

- `roleInstance = { roleId, params: Record<string, unknown> }`
- COORP UI shows:
  - Base roles as primary nodes.
  - Parameter‑ranged instances as badges/tags or “slots” under base roles (for crew design).

### 2.3. QualityCheck Role (Universal Assessment)

**Role**: `Quality Check` (single, reusable role)

- **Mission**:  
  Evaluate any artifact against provided criteria and output a structured verdict.

- **Input**:
  - `artifact` (text, code, JSON, index list…)
  - `taskDefinition`
  - `acceptanceCriteria`
  - Optional: `projectMetadata`

- **Output**:
  - `score: number (0–1)`
  - `label: 'pass' | 'minor_fixes' | 'retry_same_agent' | 'escalate_to_supervisor'`
  - `feedbackText: string`
  - Optional `targetRoleId`

- **ContextPolicy**:
  - `contextRange: low` (only what’s needed to evaluate).
  - `vision: false` (unless specifically needed).
  - `embeddingAccess: true` (optional, for comparing against examples).

This role is used in **many crews** and **flows**, but the **orchestration’s routing logic** decides what happens after each label.

---

## 3. COORP Page UI – Layout and Sections

The COORP page uses the same **design system** and visual language as:

- `COORP.tsx` (header, background grid, AiButton).
- `CreatorStudio.tsx` (tabbed header, mono font).
- `creatorstudionew.tsx` (dark cyber‑ops style, grid, draggable roles/departments).

### 3.1. Top‑Level Layout

- Full‑screen, flex‑column:
  - Header (fixed).
  - Main area (split into Panes).
  - Footer/status bar.

**Header:**

- Left:
  - `Robot` icon (phosphor, same as current COORP).
  - Title: `COORP`
  - Subtitle: `Cognitive Orchestration Platform`
- Center:
  - Tab switcher (like `CreatorStudio`):
    - Tabs:
      - `Structure` – org chart and roles.
      - `Crews` – crew/orchestration templates using these roles.
      - `Projects` – running and recent projects mapped to crews.
- Right:
  - Quick actions:
    - `+ Role`
    - `+ Department`
    - `+ Crew from Selection`
    - Possibly an `AiButton` targeted at `coorp-page` for meta‑assistance.

### 3.2. Structure Tab (Org & Roles View)

**Left Pane – Role & Department Tree:**

- List of departments/teams:
  - Hierarchical tree similar to file explorer.
  - Each department node can be expanded:
    - Shows roles under it.
    - Roles may also be tagged with team memberships.
- Role items show:
  - Role name.
  - Context range badge (e.g. `HC` for high context).
  - Icons for vision, TTS, embeddings, reasoning depth.

Clicking a role:

- Opens details in the right pane.
- Optionally highlights linked nodes on the canvas.

**Center Pane – Graph Canvas (Structure)**

- Similar to `creatorstudionew.tsx`:
  - Draggable **Role** and **Department** nodes:
    - Departments as larger container nodes.
    - Roles as smaller nodes, possibly nested or grouped by `parentId`.
  - Grid background like `COORP.tsx`.
- Each role node:
  - Shows name, department/team, capability badges (vision, reasoning level, TTS, embedding).
  - Has an `AiButton` (source: `coorp-role`, `roleId`) to:
    - Suggest context policy changes.
    - Propose suitable tools.
    - Recommend orchestration placement (where it should appear in common crews).
- Supervisor relationships:
  - Visualized as arrows from **supervisor nodes** to **worker nodes** (or groups).
  - A consistent supervisory pattern:
    - Each team/division has a defined `Supervisor` node at the top.

**Right Pane – Role Detail Inspector**

- When a role is selected:
  - Show:
    - General info (name, department, teams).
    - `ContextPolicy` editor:
      - Range slider or dropdown (low/medium/high/ultra).
      - Toggles for vision, TTS, embeddings.
      - Reasoning depth.
    - Tools:
      - Multi‑select from registered tools.
      - Show which UI components this role is linked to (if any).
    - Parameter ranges:
      - E.g., tabs for `A–G`, `H–P`, `Q–Z` for MCP agents.
  - `AiButton`:
    - Proposes:
      - Improved base prompt.
      - Recommended context range and tools based on past usage (future integration).

Theme:

- Colors pulled from design system:
  - `var(--color-background)`, `var(--color-background-secondary)`, `var(--color-primary)`, etc.
- Typography:
  - `font-mono` for system/tech text (consistent with `CreatorStudio`).
  - Use gradient headings and subtle glows (like in design system preview).

### 3.3. Crews Tab (Crew / Orchestration Overview)

This tab is a **higher‑level view** than `OrchestrationDesigner`, but conceptually linked.

**Left Pane – Crew Templates List**

- List of crew templates:
  - `MCP Curation Crew`
  - `Code Change Crew`
  - `UI Design Crew`
  - `Autonomous Project Planner`
- Items show:
  - Name.
  - Roles involved (pill icons).
  - Number of steps/blocks.
  - Last modified time.

**Center Pane – Crew Graph**

- Similar to current `COORP` simple nodes, but specialized:
  - Nodes represent **role instances in a crew**:
    - e.g., `MCP Research Lead`, `MCP Research Agent A`, `Quality Check`, `IT Head`.
  - Edges represent:
    - Handoffs.
    - Assessment loops.
    - Supervisor returns.
- Each crew node:
  - Shows:
    - Role name.
    - If parameterized (e.g. `alphabetRange: A–G`).
    - Which **unit** it belongs to.
- The chain‑of‑command pattern is rendered:
  - Entry node is a supervisor.
  - Fail from QualityCheck → back to supervisor node.
  - Pass → forward to next unit or up the chain.

**Right Pane – Mapping to Detailed Orchestrations**

- When a crew template is selected:
  - Show link to **detailed orchestration** in `OrchestrationDesigner`:
    - “Open in Creator Studio” button.
  - Show:
    - Step list (name, assigned role, type).
    - Volcano template ID (if synced).
    - Project types/goals that commonly use this crew.

---

## 4. Tool Prompts, Code Mode, and TS Tool Calls

### 4.1. Code Mode Tool Call Style

The system uses **code‑mode tools**, not JSON schemas:

- Agents write TypeScript that calls tools:
  - e.g.:

    ```ts
    const result = await tools.mcpCatalog.search({ query, filters });
    ```

- This is consistent across roles and crews:
  - No “hidden” JSON DSLs; everything is TS tool calls.
- COORP page shows:
  - For each role:
    - Tools that role has bound access to.
    - Example code snippets (static, for now) showing how that role would call tools.

### 4.2. Role → Tool Bindings on COORP Page

- In the **Role inspector**:
  - Tools list:
    - Checkboxes for each available tool in the system.
    - Each tool has:
      - Name, description.
      - Example TS code snippet.
- Roles are not “model = X”; they are:
  - “Tool set + context policy + base prompt.”

### 4.3. Integration with AiButton

- On role and crew nodes:
  - `AiButton` is configured with:
    - `source: { type: 'coorp-role', roleId }`
    - Additional metadata:
      - Could ask AI to:
        - Optimize role parameters.
        - Suggest modifications to the crews that use this role.
  - COORP page handles AI feedback via `onResult` similar to `COORP.tsx`:
    - For now, logged; later used to auto‑update roles/orchestrations.

---

## 5. Integration Points with Existing Components

### 5.1. With `CreatorStudio` Tabs

- **Roles Tab**:
  - `RoleCreatorPanel` continues to be the detailed editing surface.
  - COORP’s role selection navigates to or syncs with this tab.
- **Orchestrations Tab**:
  - `OrchestrationDesigner` (ReactFlow‑based) is the **low‑level orchestration editor**.
  - From COORP’s **Crews** tab:
    - “Open in Creator Studio” takes you to the orchestration graph for that crew.

### 5.2. With `creatorstudionew.tsx` Concepts

Reused ideas:

- Node types: `role`, `department`.
- Model rate‑limit and context requirement visualization:
  - Instead of tying a role to a model, COORP shows:
    - Recommended model context requirements.
    - Typical free‑tier model usage (informational).
  - Real model routing still lives in backend bandits & `api-client`.

### 5.3. With Design System

- Use `DesignSystemSettingsPage` tokens:
  - Colors, gradients, typography to style:
    - Header.
    - Role cards.
    - Crew nodes.
- Provide a consistent **dark cyber‑ops** aesthetic:
  - Grid backgrounds.
  - Semi‑transparent cards.
  - Gradient text headings.

---

## 6. Future Hooks (Not Required for Initial Shelf Spec)

- Snapshot COORP graphs (for project binding and audit).
- Live overlays for running crews/projects:
  - Status indicators on roles (like `status` in `creatorstudionew.tsx`).
  - Token usage, rate‑limit warnings.
- Integration with Volcano:
  - Crew templates synced from COORP’s **Crews** tab to Volcano.
  - Volcano run IDs mapped to Project entries.

---

## 7. Summary

- Roles are **central**; models are **dynamic**, chosen per role run via bandits.
- Parameter‑ranged roles (context range, vision, TTS, embeddings, domain parameters) are an explicit, first‑class concept.
- COORP page:
  - Shows corporate structure of roles.
  - Provides a visual way to design & inspect crews/orchestrations.
  - Reuses Creator Studio’s roles & orchestration designers and design system theme.
- Tool usage is TS code‑mode; no JSON DSL, consistent with your agents writing TypeScript to use tools.

This spec is intended as a **design artifact** to implement later, not as immediate code.

