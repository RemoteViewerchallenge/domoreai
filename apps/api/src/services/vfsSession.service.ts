import { Volume } from 'memfs';
import { IFs, createFsFromVolume } from 'memfs';
import util from 'util';
import type { Dirent, Stats } from 'fs';

// Define the shape of our promise-based VFS
export interface IPromisifiedVfs {
  readdir: (path: string) => Promise<string[] | Dirent[]>;
  stat: (path: string) => Promise<Stats>;
  // Add other methods as needed
}

export class VfsSessionService {
  private globalVolume: Volume;
  public readonly fs: IFs; // This is the callback-based fs

  constructor() {
    this.globalVolume = Volume.fromJSON({
      '/project-a/src/index.js': 'console.log("Hello from Project A!");',
      '/project-a/README.md': '# Project A',
      '/project-b/README.md': '# Project B',
    });
    this.fs = createFsFromVolume(this.globalVolume);
  }

  /**
   * In this new model, we don't return a scoped VFS.
   * We return the global VFS, and the router will be responsible
   * for prepending the correct root path to all operations.
   */
  getFs(): IFs {
    return this.fs;
  }

  generateToken(payload: { userId: string; vfsRootPath: string }): string {
    // In a real implementation, this would create a JWT or other secure token
    return Buffer.from(JSON.stringify(payload)).toString('base64');
  }

  async getScopedVfs(token: string): Promise<IPromisifiedVfs | null> {
    try {
      const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
      if (decoded.userId && decoded.vfsRootPath) {
        // Promisify the methods we need from the callback-based fs instance
        const readdir = util.promisify(this.fs.readdir);
        const stat = util.promisify(this.fs.stat);

        return {
          // @ts-ignore - promisify types can be tricky
          readdir: readdir.bind(this.fs),
          // @ts-ignore
          stat: stat.bind(this.fs),
        };
      }
      return null;
    } catch (error) {
      console.error('Invalid VFS token:', error);
      return null;
    }
  }
}

// Export a singleton instance of the service
export const vfsSessionService = new VfsSessionService();
