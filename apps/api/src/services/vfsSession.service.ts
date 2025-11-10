import { Jsvfs } from '@jsvfs/core';
import { NodefsStorage } from '@jsvfs/adapter-node-fs';
import { VfsSessionToken } from '@repo/common/types/agent.types';
import { randomBytes } from 'crypto';

interface VfsSession {
  token: VfsSessionToken;
  workspaceId: string;
  createdAt: number;
}

const SESSION_TTL = 1000 * 60 * 60; // 1 hour

export class VfsSessionService {
  private sessions: Map<VfsSessionToken, VfsSession> = new Map();

  public createToken(workspaceId: string): VfsSessionToken {
    const token = randomBytes(32).toString('hex');
    const session: VfsSession = {
      token,
      workspaceId,
      createdAt: Date.now(),
    };
    this.sessions.set(token, session);
    return token;
  }

  public validateToken(token: VfsSessionToken): VfsSession | null {
    const session = this.sessions.get(token);
    if (!session) {
      return null;
    }

    if (Date.now() - session.createdAt > SESSION_TTL) {
      this.sessions.delete(token);
      return null;
    }

    return session;
  }

  public async getScopedVfs(vfsToken: VfsSessionToken): Promise<Jsvfs> {
    console.log('VfsSessionService: Using mock getScopedVfs. Token:', vfsToken);

    // In a real implementation, you would validate the token
    // and fetch the user's workspace path.
    // For now, we'll use the current working directory.
    const vfs = new Jsvfs(new NodefsStorage({
      root: process.cwd()
    }));

    return vfs;
  }
}

export const vfsSessionService = new VfsSessionService();
