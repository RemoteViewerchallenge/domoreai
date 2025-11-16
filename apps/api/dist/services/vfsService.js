import { Volume } from 'memfs';
/**
 * Cache to hold in-memory file systems (Volumes) by workspaceId.
 * We cache the 'promises' API for async operations.
 */
const vfsCache = new Map();
/**
 * Gets (or creates) an isolated, in-memory file system
 * for a given workspace.
 *
 * @param workspaceId The unique ID for the workspace
 * @returns A Promise-based 'fs' compatible object
 */
export function getVfsForWorkspace(workspaceId) {
    let workspaceFs;
    const cachedFs = vfsCache.get(workspaceId);
    if (cachedFs) {
        workspaceFs = cachedFs;
    }
    else {
        // This workspace has no VFS. Create one.
        console.log(`VFS Service: Creating new VFS for workspace: ${workspaceId}`);
        const vol = new Volume();
        // Pre-populate the VFS with a default directory structure
        vol.fromJSON({
            '/src/index.js': 'console.log("Hello, Agent!");',
            '/package.json': `{ "name": "${workspaceId}", "version": "1.0.0" }`,
            '/README.md': `# ${workspaceId} Workspace`,
        }, '/' // Mount at the root
        );
        // Get the promise-based API and cache it
        workspaceFs = vol.promises;
        vfsCache.set(workspaceId, workspaceFs);
    }
    return workspaceFs;
}
/**
 * (Optional but recommended)
 * Clears a workspace VFS from memory, e.g., when a session ends.
 */
export function clearVfsForWorkspace(workspaceId) {
    vfsCache.delete(workspaceId);
    console.log(`VFS Service: Cleared VFS for workspace: ${workspaceId}`);
}
//# sourceMappingURL=vfsService.js.map