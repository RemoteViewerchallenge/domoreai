import { Volume } from 'memfs';

export interface Dirent {
  name: string;
  isDirectory(): boolean;
  isFile(): boolean;
  isBlockDevice(): boolean;
  isCharacterDevice(): boolean;
  isSymbolicLink(): boolean;
  isFIFO(): boolean;
  isSocket(): boolean;
}

export interface FsPromises {
  readFile(path: string, encoding: string): Promise<string | Buffer>;
  writeFile(path: string, data: string): Promise<void>;
  readdir(path: string, options?: { withFileTypes?: boolean }): Promise<string[] | Buffer[] | Dirent[]>;
}

/**
 * Cache to hold in-memory file systems (Volumes) by workspaceId.
 * We cache the 'promises' API for async operations.
 */
const vfsCache = new Map<string, FsPromises>();

/**
 * Gets (or creates) an isolated, in-memory file system
 * for a given workspace.
 *
 * @param workspaceId The unique ID for the workspace
 * @returns A Promise-based 'fs' compatible object
 */
export function getVfsForWorkspace(workspaceId: string): FsPromises {
  let workspaceFs: FsPromises;
  const cachedFs = vfsCache.get(workspaceId);

  if (cachedFs) {
    workspaceFs = cachedFs;
  } else {
    // This workspace has no VFS. Create one.
    console.log(`VFS Service: Creating new VFS for workspace: ${workspaceId}`);
    const vol = new Volume();

    // Pre-populate the VFS with a default directory structure
    vol.fromJSON(
      {
        '/src/index.js': 'console.log("Hello, Agent!");',
        '/package.json': `{ "name": "${workspaceId}", "version": "1.0.0" }`,
        '/README.md': `# ${workspaceId} Workspace`,
      },
      '/' // Mount at the root
    );

    // Get the promise-based API and cache it
    workspaceFs = vol.promises as FsPromises;
    vfsCache.set(workspaceId, workspaceFs);
  }

  return workspaceFs;
}

/**
 * (Optional but recommended)
 * Clears a workspace VFS from memory, e.g., when a session ends.
 */
export function clearVfsForWorkspace(workspaceId: string): void {
  vfsCache.delete(workspaceId);
  console.log(`VFS Service: Cleared VFS for workspace: ${workspaceId}`);
}