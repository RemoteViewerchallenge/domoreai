# Dead Code Cleanup Report - Frontend Analysis (FINAL)

**Date:** 2025-12-11  
**Analysis Tool:** Knip v5.73.3  
**Scope:** Frontend code (apps/ui) reachable from core pages + settings + workspace pages

## Entry Points Analyzed

The following pages were designated as entry points for the application:

### Primary Entry Points (User Specified)
1. **`/workspace`** → `apps/ui/src/pages/WorkSpace.tsx`
2. **`/providers`** → `apps/ui/src/pages/UnifiedProviderPage.tsx`
3. **`/creator`** → `apps/ui/src/pages/CreatorStudio.tsx`

### Additional Pages Kept (Per User Request)
4. **`/settings`** → `apps/ui/src/pages/SettingsPage.tsx` ⭐ **User requested to keep**
5. **`/file-location`** → `apps/ui/src/pages/FileLocationPage.tsx` ⭐ **User requested to keep**
6. **`/workspace/:id`** → `apps/ui/src/pages/workspace/[id].tsx` ⭐ **User requested to keep (#8)**
7. **`/workspace/smart-switch`** → `apps/ui/src/pages/workspace/SmartSwitch.tsx` ⭐ **User requested to keep (#9)**

### Components Kept (Per User Request)
- **`GitControls.tsx`** ⭐ **User requested to keep ("I want the git thing")**

### Pages Removed (Per User Request)
- **`DataLake.tsx`** ❌ **User requested to remove ("I dont need data lake if its a linked page")**

### Monaco Editor Status ✅
Monaco editor is **STILL AVAILABLE** and actively used:
- `MonacoEditor.tsx` component exists and is imported by:
  - `workspace/[id].tsx` (kept per user request)
  - `SmartEditor.tsx` → used by `SwappableCard.tsx` → used by `WorkSpace.tsx`
  - `WorkOrderCard.tsx` → used by workspace components
- Dependencies: `@monaco-editor/react`, `monaco-editor` are both in use

### Note on Menu Access
`/settings` and `/file-location` are accessible via `UnifiedMenuBar` which appears on all pages.

## Dead Code Identified

### Pages to Remove (9 files)

1. `apps/ui/src/pages/admin/models.tsx` - Admin models management page
2. `apps/ui/src/pages/DataLake.tsx` - Data lake view ❌ **User doesn't want linked pages**
3. `apps/ui/src/pages/ProjectCreator.tsx` - Project creation interface
4. `apps/ui/src/pages/ProjectPage.tsx` - Individual project view
5. `apps/ui/src/pages/ProjectsDashboard.tsx` - Projects dashboard/list
6. `apps/ui/src/pages/ProviderManager.tsx` - Provider management (old)
7. `apps/ui/src/pages/ProviderRecovery.tsx` - Provider recovery tool
8. `apps/ui/src/pages/RoleCreator.tsx` - Role creation page
9. `apps/ui/src/pages/WorkspaceList.tsx` - Workspace list view

### Component Files to Remove (19 files)

1. `apps/ui/src/components/BottomSummaryBar.tsx`
2. `apps/ui/src/components/DataLakeTable.tsx`
3. `apps/ui/src/components/InteractiveTerminal.tsx`
4. `apps/ui/src/components/JsonImportModal.tsx`
5. `apps/ui/src/components/nodes/ApiExplorerNode.tsx`
6. `apps/ui/src/components/nodes/DatabaseManagerNode.tsx`
7. `apps/ui/src/components/OrchestrationCreatorPanel.tsx`
8. `apps/ui/src/components/OrchestrationExecutor.tsx`
9. `apps/ui/src/components/ProviderList.tsx`
10. `apps/ui/src/components/settings/OrchestratorSettings.tsx`
11. `apps/ui/src/components/settings/ThemeCustomization.tsx`
12. `apps/ui/src/components/SimpleTableView.tsx`
13. `apps/ui/src/components/TerminalLogViewer.tsx`
14. `apps/ui/src/components/ToolSelector.tsx`
15. `apps/ui/src/components/TopSummaryBar.tsx`
16. `apps/ui/src/components/ui/Accordion.tsx`
17. `apps/ui/src/components/VfsViewer.tsx`
18. `apps/ui/src/components/work-order/WorkOrderCard.tsx`
19. `apps/ui/src/components/work-order/WorkOrderColumn.tsx`

**NOTE:** The following were in the original analysis but are NOW KEPT:
- ❌ ~~`GitControls.tsx`~~ → ✅ **KEPT** (actively used, user requested)
- ❌ ~~`ui/Button.tsx`~~ → ✅ **KEPT** (actively used)
- ❌ ~~`ui/Icon.tsx`~~ → ✅ **KEPT** (actively used)
- ❌ ~~`ui/Panel.tsx`~~ → ✅ **KEPT** (actively used)

### Utility & Hook Files to Remove (3 files)

1. `apps/ui/src/constants/savedQueries.ts`
2. `apps/ui/src/hooks/useWebSocket.ts`
3. `apps/ui/src/types.ts`

**NOTE:** The following were in the original analysis but are NOW KEPT:
- ❌ ~~`hooks/useVFS.ts`~~ → ✅ **KEPT** (used by FileLocationPage and workspace pages)
- ❌ ~~`lib/utils.ts`~~ → ✅ **KEPT** (actively used)

### Total Files to Delete: 31 (down from 37)

## Unused Dependencies

The following npm dependencies are not imported by any live code and can be removed from `apps/ui/package.json`:

### Production Dependencies (13)
1. `@codingame/monaco-vscode-api` ⚠️ (Monaco VSCode API - not directly used but may be needed)
2. `@repo/api-contract`
3. `@types/react-grid-layout`
4. `ag-grid-community`
5. `ag-grid-react`
6. `api`
7. `axios`
8. `flyonui`
9. `jspreadsheet-ce`
10. `monaco-languageclient`
11. `react-grid-layout`
12. `react-table`
13. `tailwindcss-animate`

**NOTE:** The following were in the original analysis but are NOW KEPT:
- ❌ ~~`@radix-ui/react-slot`~~ → ✅ **KEPT** (actively used)
- ❌ ~~`class-variance-authority`~~ → ✅ **KEPT** (actively used)
- ❌ ~~`clsx`~~ → ✅ **KEPT** (actively used)
- ❌ ~~`tailwind-merge`~~ → ✅ **KEPT** (actively used)
- ❌ ~~`superjson`~~ → ✅ **KEPT** (actively used for tRPC)

### Dev Dependencies (6)
1. `@eslint/js`
2. `@types/react-table`
3. `@typescript-eslint/eslint-plugin`
4. `@typescript-eslint/parser`
5. `eslint-plugin-react-refresh`
6. `vite-plugin-monaco-editor`

## Unused Exports & Types

The following exports exist but are never imported:

### Component Exports
- `SshConnectionModal` in `apps/ui/src/components/SshConnectionModal.tsx`
- `useFileSystem` in `apps/ui/src/stores/FileSystemContext.tsx`

### Theme Exports
- `lightTheme` in `apps/ui/src/theme/presets.ts`
- `minimalTheme` in `apps/ui/src/theme/presets.ts`
- `standardTheme` in `apps/ui/src/theme/presets.ts`
- `flashyTheme` in `apps/ui/src/theme/presets.ts`
- `extremeTheme` in `apps/ui/src/theme/presets.ts`
- `NEON_COLORS` in `apps/ui/src/utils/neonTheme.ts`
- `getNeonGlowClass` in `apps/ui/src/utils/neonTheme.ts`

### Type Exports (12)
- `FlowControlConfig` type
- `OrchestrationBlueprint` type
- `MenuStyle` type
- `IconTheme` type
- `Density` type
- `NeonColor` interface
- `ThemeColors` interface
- `VisualSettings` interface
- `AnimationSettings` interface
- `SoundSettings` interface
- `WidgetSettings` interface
- `LayoutSettings` interface

## Issues to Address

### Missing Dependency
- `@prisma/client` is used in `apps/ui/src/components/RoleModelOverride.tsx` but not listed in package.json dependencies

### Duplicate Exports
- `standardTheme` and `defaultTheme` both exported from `apps/ui/src/theme/presets.ts`

## Impact Analysis

### Routes to Remove from App.tsx

The following routes should be removed from `apps/ui/src/App.tsx`:

```tsx
<Route path="/projects" element={<ProjectsDashboard />} />
<Route path="/admin/models" element={<ModelsPage />} />
<Route path="/data-lake" element={<DataLake />} />             ❌ User doesn't want linked pages
<Route path="/role-creator" element={<RoleCreator />} />
<Route path="/project-creator" element={<ProjectCreator />} />
<Route path="/project/:id" element={<ProjectPage />} />
<Route path="/provider-recovery" element={<ProviderRecovery />} />
```

### Routes to Keep

```tsx
<Route path="/" element={<WorkSpace />} />
<Route path="/workspace" element={<WorkSpace />} />
<Route path="/providers" element={<UnifiedProviderPage />} />
<Route path="/creator" element={<CreatorStudio />} />
<Route path="/settings" element={<SettingsPage />} />              ⭐ KEPT per user request
<Route path="/file-location" element={<FileLocationPage />} />     ⭐ KEPT per user request
<Route path="/workspace/:id" element={<MyWorkspacePage />} />      ⭐ KEPT per user request (#8)
<Route path="/workspace/smart-switch" element={<SmartSwitch />} /> ⭐ KEPT per user request (#9)
```

## Recommendation

⚠️ **UPDATED PER USER FEEDBACK** 

User requested:
- ✅ **KEEP** workspace pages #8 and #9 (`workspace/[id].tsx`, `workspace/SmartSwitch.tsx`)
- ✅ **KEEP** GitControls component ("I want the git thing")
- ❌ **REMOVE** DataLake page ("I dont need data lake if its a linked page")

**Monaco Editor Status:** ✅ Still available and actively used through workspace components

**User Approval:** "you can get it back so go for it" - Proceeding with deletion

1. **File Deletion:** All 31 files listed above will be deleted
2. **Route Cleanup:** App.tsx will be updated to remove unused routes (including /data-lake)
3. **Dependency Cleanup:** package.json will be updated to remove unused dependencies
4. **Export Cleanup:** Unused exports will be removed from remaining files
5. **Build Verification:** Frontend build will be run to ensure no breakage
6. **Manual Testing:** The core pages will be tested in browser
3. **Dependency Cleanup:** package.json will be updated to remove unused dependencies
4. **Export Cleanup:** Unused exports will be removed from remaining files
5. **Build Verification:** Frontend build will be run to ensure no breakage
6. **Manual Testing:** The three core pages will be tested in browser

## Next Steps

Upon your approval, the agent will:
1. Delete all identified dead code files
2. Update App.tsx to remove unused imports and routes
3. Remove unused dependencies from package.json
4. Run cleanup on remaining files to remove unused exports
5. Verify the build succeeds
6. Create a reversal guide in case rollback is needed
7. Document all changes in `dead_code_cleanup_log.md`

---

**Awaiting User Confirmation to Proceed** ✋
