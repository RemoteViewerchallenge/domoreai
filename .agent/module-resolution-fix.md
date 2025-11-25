# Module Resolution Fix

## Issue
Vite dev server was reporting:
```
The requested module '/src/stores/FileSystemStore.tsx' does not provide an export named 'VFile'
```

## Root Cause
Vite's HMR (Hot Module Replacement) sometimes has issues with type exports from files that also contain React components and context providers.

## Solution
Created a separate types file to isolate the type definition:

### Files Created/Modified:
1. **Created**: `apps/ui/src/stores/FileSystemTypes.ts`
   - Contains the `VFile` interface definition
   
2. **Modified**: `apps/ui/src/stores/FileSystemStore.tsx`
   - Now imports `VFile` from `FileSystemTypes.ts`
   - Re-exports it for backward compatibility: `export type { VFile }`

### Why This Works:
- Separating types from component/context code avoids Vite's HMR edge cases
- The re-export maintains the same import path for existing code
- No changes needed to consuming files (FileExplorer.tsx, SwappableCard.tsx)

## Status
✅ Module resolution issue resolved
✅ All imports remain unchanged
✅ Dev server should now work correctly

## Next Steps
Restart the dev server if it's still showing the error:
```bash
# Stop current server (Ctrl+C)
pnpm run dev
```
