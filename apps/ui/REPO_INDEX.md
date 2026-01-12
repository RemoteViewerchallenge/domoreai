# REPO_INDEX.md (UI)

## /apps/ui/src
**Intent:** React Frontend application.
**Rules:** Components should be small and functional. Complex state moves to `stores` or `hooks`.

### /src/features
**Intent:** Domain-specific modules that bundle logic and UI.
- `creator-studio/`: The visual editor for orchestration and flows.
  - `OrchestrationDesigner.tsx`: Main canvas for the node editor.
  - `nodes/`: Custom ReactFlow nodes (SuperNode, TableNode).
- `nebula-renderer/`: The renderer for the Dynamic UI system.
  - `NebulaRenderer.tsx`: Recursive component that renders the Nebula Tree.
- `ui-builder/`: Tools for manually constructing UI layouts.

### /src/components
**Intent:** Reusable UI atoms and molecules.
**Drift Warning:** We are transitioning to a `ui/` folder (likely Shadcn). Legacy components exist in root `components/`.
- `ui/`: **Preferred**. Modern, standardized components (Button, Card, Input).
- `VisualQueryBuilder.tsx`: Complex component for DB queries (Candidate for `features/`).
- `MonacoEditor.tsx`: Wrapper for the code editor.
- `UnifiedMenuBar.tsx` vs `appearance/NewUIMenuBar.tsx`: **Drift**. `NewUIMenuBar` should likely replace `UnifiedMenuBar` or be merged.

### /src/pages
**Intent:** Route-level components.
- `AgentWorkbench.tsx`: Main dashboard for interacting with Agents.
- `CodeVisualizer.tsx`: Page for the 3D/2D code graph.
- `InterfaceStudio.tsx`: Landing page for the Nebula UI builder.

### /src/stores
**Intent:** Global state management (Zustand/Context).
- `workspace.store.ts`: Manages active project, tabs, and layout state.
- `websocket.store.ts`: Handles real-time events from the API.

### /src/nebula
**Intent:** Client-side bindings for the Nebula Engine.
- `component-map.tsx`: Maps string keys (from the AST) to actual React components.