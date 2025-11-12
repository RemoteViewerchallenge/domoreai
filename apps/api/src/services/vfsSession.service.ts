import { VirtualFileSystem } from '@jsvfs/core';
import { NodeFSAdapter } from '@jsvfs/adapter-node-fs';
import { VfsSessionToken } from '../types.js';
import { randomBytes } from 'crypto';

interface VfsSession {
  token: VfsSessionToken;
  workspaceId: string;
  createdAt: number;
}

const SESSION_TTL = 1000 * 60 * 60; // 1 hour
/**
 * The VfsSessionService is responsible for generating and validating
 * short-lived, scoped VFS tokens that are linked to a user session.
 * This is a mock implementation that stores sessions in memory.
 * In a real-world scenario, you would use a more persistent storage
 * like Redis or a database.
 */
export class VfsSessionService {
  private sessions: Map<VfsSessionToken, VfsSession> = new Map();

  /**
   * Creates a new VFS session for a given workspace.
   * @param workspaceId The ID of the workspace to scope the session to.
   * @returns The session token.
   */
  public createSession(workspaceId: string): VfsSessionToken {
    const token = randomBytes(16).toString('hex');
    const session: VfsSession = {
      token,
      workspaceId,
      createdAt: Date.now(),
    };
    this.sessions.set(token, session);
    console.log(`VfsSessionService: Created session for workspace ${workspaceId} with token ${token}`);
    return token;
  }

  /**
   * Validates a session token and returns the session if it is valid.
   * @param token The session token to validate.
   * @returns The session if valid, otherwise null.
   */
  private getValidSession(token: VfsSessionToken): VfsSession | null {
    const session = this.sessions.get(token);
    if (!session) {
      console.warn(`VfsSessionService: Session not found for token ${token}`);
      return null;
    }

    if (Date.now() - session.createdAt > SESSION_TTL) {
      console.warn(`VfsSessionService: Session expired for token ${token}`);
      this.sessions.delete(token);
      return null;
    }

    return session;
  }

  /**
   * Returns a VFS instance scoped to the workspace of the given token.
   * @param vfsToken The user's VFS token.
   * @returns A VFS instance, or null if the token is invalid.
   */
  public getScopedVfs(vfsToken: VfsSessionToken): VirtualFileSystem | null {
    const session = this.getValidSession(vfsToken);
    if (!session) {
      return null;
    }

    // In a real implementation, you would resolve the workspaceId to a path.
    // For now, we'll assume the workspaceId is the path.
    const workspacePath = session.workspaceId;

    return new VirtualFileSystem(new NodeFSAdapter({ cwd: workspacePath }));
  }
}

export const vfsSessionService = new VfsSessionService();
