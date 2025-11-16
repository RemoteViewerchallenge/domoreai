import { VirtualFileSystem } from '@jsvfs/core';
import { VfsSessionToken } from '../types.js';
/**
 * The VfsSessionService is responsible for generating and validating
 * short-lived, scoped VFS tokens that are linked to a user session.
 * This is a mock implementation that stores sessions in memory.
 * In a real-world scenario, you would use a more persistent storage
 * like Redis or a database.
 */
export declare class VfsSessionService {
    private sessions;
    /**
     * Creates a new VFS session for a given workspace.
     * @param workspaceId The ID of the workspace to scope the session to.
     * @returns The session token.
     */
    createSession(workspaceId: string): VfsSessionToken;
    /**
     * Validates a session token and returns the session if it is valid.
     * @param token The session token to validate.
     * @returns The session if valid, otherwise null.
     */
    private getValidSession;
    /**
     * Returns a VFS instance scoped to the workspace of the given token.
     * @param vfsToken The user's VFS token.
     * @returns A VFS instance, or null if the token is invalid.
     */
    getScopedVfs(vfsToken: VfsSessionToken): VirtualFileSystem | null;
}
export declare const vfsSessionService: VfsSessionService;
