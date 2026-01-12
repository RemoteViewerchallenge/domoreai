# REPO_INDEX.md

## /apps/ui
**Intent:** The frontend client (Web & Electron) acting as the visual OS for the AI platform.
**Rules:** React+Vite environment. Use `trpc` for backend comms. `features/` directory for domain logic.

### Root Config
- `package.json`: Dependencies include `electron`, `reactflow`, `@repo/nebula`, and `trpc`.
- `vite.config.ts`: Vite config with `vite-plugin-node-polyfills` to support Node libs in the browser/electron renderer.
- `tailwind.config.js`: Styling configuration.
- `tsconfig.json`: TypeScript configuration.

### /electron
**Intent:** Electron main process code.
- `main.cjs`: Bootstraps the application window, handles dev/prod URL loading, and manages lifecycle events.

### /scripts
**Intent:** Build-time scripts.
- `generate-theme.mjs`: Node script to generate CSS variables/tokens from theme config before build.

### /src
**Intent:** Application source code.
- `App.tsx`: Main Router definition. Maps URL paths to Pages.
- `main.tsx`: Entry point. Initializes `trpcClient`, `QueryClient`, and mounts the React root.
- `constants.ts`: Global configuration (Default Model Config, Role Form Data).

#### /src/components
**Intent:** Reusable UI components.
- `NativeBrowser.tsx`: A browser-in-browser component. Uses `<webview>` in Electron and `<iframe>` in Web.
- `UnifiedLayout.tsx`: The main application shell/layout wrapper.
- `MonacoEditor.tsx`: Code editor wrapper.
- `VisualQueryBuilder.tsx`: Component for building queries visually.
- `XtermTerminal.tsx`: Web-based terminal emulator component.
- `FileExplorer.tsx`: Tree view of the VFS.

#### /src/components/ui
**Intent:** Low-level UI primitives (Buttons, Inputs, Modals).
- `SuperAiButton.tsx`: **Core Component**. A floating button that dispatches prompts to the AI orchestrator with context awareness.
- `AiButton.tsx`: Standard button with AI styling.
- `SimpleErrorModal.tsx`: Error display dialog.

#### /src/features
**Intent:** Complex, domain-specific modules.

**Sub-Feature: /src/features/creator-studio**
**Intent:** Node-based editor for defining AI roles and orchestration flows.
- `OrchestrationDesigner.tsx`: Main canvas using `ReactFlow`. Handles node rendering and state.
- `CustomNodes.tsx`: Definitions for custom flow nodes (Agent, Judge, etc.).
- `InspectorPanel.tsx`: Sidebar for editing selected node properties.

**Sub-Feature: /src/features/nebula-renderer**
**Intent:** Runtime engine for rendering dynamic AI-generated interfaces (`NebulaTree`).
- `NebulaRenderer.tsx`: Recursive renderer that maps JSON tree nodes to React components. Handles data-binding and AI overlays.

**Sub-Feature: /src/features/ui-builder**
**Intent:** Drag-and-drop UI construction tools.
- `CraftComponents.tsx`: Components compatible with the builder.
- `Toolbox.tsx`: Palette of available components.

#### /src/hooks
**Intent:** Custom React hooks.
- `useAudioPlayer.ts`: Audio playback logic.
- `useCardVFS.ts`: VFS access scoped to a specific card.
- `useHotkeys.ts`: Keyboard shortcut management.
- `useLSP.ts`: Language Server Protocol integration for editors.
- `useTheme.ts`: Theme switching logic.

#### /src/nebula
**Intent:** Core definitions and maps for the Nebula UI system.
- `component-map.tsx`: Registry mapping string names (e.g., "Button") to actual React components.
- `library.ts`: Definitions of available Nebula components.

#### /src/pages
**Intent:** Top-level route components.
- `AgentWorkbench.tsx`: **Core Page**. A tiling window manager allowing users to spawn and arrange "Cards" (AI Roles).
- `CommandCenter.tsx`: High-level operational view.
- `Constitution.tsx`: Settings and governance page.
- `RoleCreatorPage.tsx`: Wrapper for the `creator-studio` feature.
- `DataCenter.tsx`: Database or resource management view.
- `LaunchPad.tsx`: Home/Dashboard view.

#### /src/stores
**Intent:** Global client-state management (Zustand).
- `workspace.store.ts`: Manages the layout (columns), active cards, and global AI context scope.
- `FileSystemStore.tsx`: Client-side interface for the Virtual File System.
- `websocket.store.ts`: Manages real-time socket connections.
- `ingest.store.ts`: State for file ingestion processes.

#### /src/utils
**Intent:** Helper functions.
- `trpc.ts`: Typed tRPC client instance.
- `neonTheme.ts`: Logic for determining color coding based on VFS paths.

## Suggested Moves / Refactors
- **Consolidate Utils**: Merge `src/utils/*` into `src/lib/` to avoid confusion.
- **Delete Rot**: Remove `src/pages/creator.tsx`, `src/pages/settings.tsx`, `src/pages/file-location.tsx`, and `src/pages/nebula-builder.tsx` as they are effectively dead code not referenced by `App.tsx`.
- **Rename**: `src/pages/workspace/smart-switch.tsx` should likely be `SmartSwitch.tsx` to match the PascalCase convention of other components if it is indeed a component, or deleted if unused.