 The Master Architecture DocFile: docs/architecture/nebula-engine.mdMarkdown# 🌌 Nebula Engine Architecture

**Version:** 2.0 (Shell Architecture)
**Objective:** A "No-Code" Runtime Environment driven by Backend Truth.

---

## 1. Core Philosophy: The "Browser" Model
Nebula (`apps/ui`) is not a static website. It is a **Runtime Environment** (similar to a Web Browser or a Video Game Engine).

* **The Player:** The React Codebase. It contains the logic, the components, and the renderer.
* **The Cartridge:** The Data (`.json` files). This defines the layout, the flow, and the content of an application.

We do not write "Pages" in React anymore. We write **Atomic Components** in React, and we assemble **Pages** in JSON.

---

## 2. The Nebula Protocol (The Data Structure)
Every piece of UI in the system is defined by a `NebulaNode`. This is a recursive JSON object that tells the renderer what to paint.

### The Node Interface
```typescript
interface NebulaNode {
  id: string;           // Unique ID for React keys and selection
  type: string;         // Must match a key in component-map.tsx
  
  // 1. Static Props (Passed directly to the React Component)
  props: {
    className?: string;
    title?: string;
    [key: string]: any;
  };

  // 2. Responsive Behavior (The "Morphing" Logic)
  // Allows a single JSON tree to adapt to Mobile/Desktop
  responsive?: {
    visibility?: {
      mobile: 'hidden' | 'visible';
      desktop: 'hidden' | 'visible';
    };
    mode?: {
      mobile: 'stack' | 'bottom-bar' | 'drawer'; 
      desktop: 'sidebar' | 'grid' | 'default';   
    };
  };

  // 3. Hierarchy
  children?: NebulaNode[];
}
The Project ManifestAn "App" is just a collection of nodes routed by URL.TypeScriptinterface ProjectManifest {
  id: string;        // e.g. "crm-v1"
  name: string;      // e.g. "Sales CRM"
  themeId: string;   // e.g. "corporate-light"
  routes: {
    [path: string]: NebulaNode; // e.g. "/dashboard" -> { type: "Grid" ... }
  };
}
3. The Runtime: NebulaShell & NebulaRendererThe Shell (NebulaShell.tsx)This is the outer wrapper (The "IDE"). It manages the lifecycle of the application.Workbench Mode: Renders the System Tools (AgentWorkbench, DataCenter, ThemeManager) directly.Preview Mode: Renders the Target Project (e.g., crm.json) inside a simulated viewport (Mobile/Tablet/Desktop).The Renderer (NebulaRenderer.tsx)This is the recursive component that paints pixels.Lookup: It reads node.type (e.g., "SmartForm").Registry Check: It looks for "SmartForm" in apps/ui/src/nebula/component-map.tsx.Responsive Check: If node.responsive.visibility.mobile is "hidden" and screen is small, it renders null.Render: It passes props and children to the resolved React Component.⚠️ The Golden Rule:If a component is not registered in component-map.tsx, it does not exist to the Engine.4. The "Forge" Workflow (Backend -> Frontend)We do not manually design forms. We generate them from the Backend Source of Truth.Smart ComponentsWe use specific components designed to "self-configure" based on backend data.ComponentPurposeBackend TriggerSmartFormCreates a form with validation.mutation.create(z.object(...))SmartDataGridFetches and displays tables.query.list()TokenIconRenders icons based on semantic variables.theme.assets.iconsAI Generation ProtocolTo build a new feature (e.g., Role Creator):Deep Scan: The AI scans apps/api/src/routers/role.router.ts and schema.prisma.Map: It identifies the Inputs (Zod) and Relations (Prisma).Forge: It generates a JSON NebulaNode containing a SmartForm mapped to the router's mutation.Result: The UI is instantly playable in the Shell.5. Directory Structureapps/ui/src/nebula/ -> The Engine Core (Shell, Renderer, Types).apps/ui/src/data/projects/ -> The "Cartridges" (JSON definitions for apps).apps/ui/src/components/nebula/ -> The Atomic Blocks (SmartForm, ThemeManager).
### 2. The "Deep Scan" Prompt
You also need to save the **AI Instruction** that makes this workflow possible. Save this as `docs/prompts/nebula-deep-scan.md`.

```markdown
# Role: Nebula Architect (Backend Scanner)

**Objective:** Map the full "Vertical Slice" of a feature to prepare for UI generation.

**Instruction:**
I want to build the UI for: **"{FEATURE_NAME}"** (e.g., Role Creation).
Do not generate UI yet. First, scan the backend codebase and identify the following 3 layers:

1.  **The API Layer (The Door)**
    * Find the relevant TRPC Router(s) (e.g., `role.router.ts`).
    * Identify the `mutation` used to create/update.
    * Identify the `query` used to fetch lists/details.

2.  **The Data Layer (The Foundation)**
    * Look at `schema.prisma`.
    * Identify the main Model (e.g., `Role`) and its **Relations** (e.g., `Role` has many `Capabilities`).
    * *Critical:* Does the UI need to fetch these relations to populate a dropdown/multiselect?

3.  **The Logic Layer (The Brain)**
    * Look for Service files (e.g., `RoleFactoryService.ts`, `RoleService.ts`).
    * Are there hidden rules? (e.g., "Admin role cannot be deleted", "Name must be unique").

**Output Format:**
Return a "Feature Manifest" JSON block that I can feed into the UI Generator:

```json
{
  "feature": "Role Manager",
  "primaryRouter": "role.router.ts",
  "relatedRouters": ["capabilities.router.ts", "users.router.ts"],
  "dataModels": ["Role", "Capability", "User"],
  "requiredInputs": [
    { "name": "name", "type": "string", "source": "zod" },
    { "name": "capabilities", "type": "relation_multi", "source": "prisma", "lookup": "capabilities.list" }
  ]
}

With these two files, you have fully documented the system and th