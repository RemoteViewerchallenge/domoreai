
import { Volume, createFsFromVolume } from 'memfs';
import type { IFs } from 'memfs';
import { randomBytes } from 'crypto';
import { join } from 'path';

export class VfsSessionService {
  private globalVolume: Volume;
  private sessions = new Map<string, string>(); // Map<vfsToken, workspaceId>

  constructor() {
    this.globalVolume = Volume.fromJSON({
      '/project-a/src/index.js': 'console.log("Hello from Project A!");',
      '/project-a/README.md': '# Project A',
      '/project-b/README.md': '# Project B',
    });
  }

  createSession(workspaceId: string): string {
    const token = randomBytes(16).toString('hex');
    this.sessions.set(token, workspaceId);
    return token;
  }

  getScopedVfs(vfsToken: string): IFs | null {
    const workspaceId = this.sessions.get(vfsToken);
    if (!workspaceId) return null;

    const fs = createFsFromVolume(this.globalVolume);
    const workspaceRoot = `/${workspaceId}`;

    return new Proxy(fs, {
      get: (target: IFs, prop: string | symbol, receiver: any) => {
        const original = target[prop as keyof IFs];
        if (typeof original === 'function') {
          return (...args: any[]) => {
            const pathIndex = original.name.toLowerCase().includes('file') ? 0 : -1;
            if (typeof args[pathIndex] === 'string') {
              args[pathIndex] = join(workspaceRoot, args[pathIndex]);
            }
            return original.apply(target, args);
          };
        }
        return Reflect.get(target, prop, receiver);
      },
    });
  }
}

export const vfsSessionService = new VfsSessionService();
