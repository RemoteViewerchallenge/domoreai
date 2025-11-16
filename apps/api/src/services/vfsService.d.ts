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
    readdir(path: string, options?: {
        withFileTypes?: boolean;
    }): Promise<string[] | Buffer[] | Dirent[]>;
}
/**
 * Gets (or creates) an isolated, in-memory file system
 * for a given workspace.
 *
 * @param workspaceId The unique ID for the workspace
 * @returns A Promise-based 'fs' compatible object
 */
export declare function getVfsForWorkspace(workspaceId: string): FsPromises;
/**
 * (Optional but recommended)
 * Clears a workspace VFS from memory, e.g., when a session ends.
 */
export declare function clearVfsForWorkspace(workspaceId: string): void;
