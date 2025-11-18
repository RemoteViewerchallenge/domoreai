import { Volume, createFsFromVolume, type IFs } from 'memfs';

export class VfsSessionService {
  private globalVolume: Volume;
  public readonly fs: IFs; // Expose the memfs instance directly
  private tokens = new Map<string, { userId: string; rootPath: string }>();

  constructor() {
    // Initialize a single, global memfs volume with some default data
    this.globalVolume = Volume.fromJSON({
      '/project-a/src/index.js': 'console.log("Hello from Project A!");',
      '/project-a/README.md': '# Project A',
      '/project-b/README.md': '# Project B',
    });

    this.fs = createFsFromVolume(this.globalVolume);
  }

  /**
   * Generates a token for a user and root path.
   */
  async generateToken(userId: string, vfsRootPath: string): Promise<string> {
    const token = Math.random().toString(36).substring(2);
    this.tokens.set(token, { userId, rootPath: vfsRootPath });
    return token;
  }

  /**
   * Gets the scoped VFS for a token.
   */
  async getScopedVfs(token: string): Promise<IFs | null> {
    if (!this.tokens.has(token)) {
      return null;
    }
    return this.fs;
  }

  /**
   * In this new model, we don't return a scoped VFS.
   * We return the global VFS, and the router will be responsible
   * for prepending the correct root path to all operations.
   */
  getFs(): IFs {
    return this.fs;
  }
}

// Export a singleton instance of the service
export const vfsSessionService = new VfsSessionService();
