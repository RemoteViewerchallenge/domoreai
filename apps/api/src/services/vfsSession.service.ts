import { Volume, createFsFromVolume, type IFs } from 'memfs';
import crypto from 'crypto';

export class VfsSessionService {
  private globalVolume: Volume;
  public readonly fs: IFs; // Expose the memfs instance directly
  private tokens = new Map<string, { userId: string; rootPath: string }>();
  private sessions: Map<string, string> = new Map(); // Added for createSession

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
  generateToken(userId: string, vfsRootPath: string): string {
    const token = Math.random().toString(36).substring(2);
    this.tokens.set(token, { userId, rootPath: vfsRootPath });
    return token;
  }

  /**
   * Gets the scoped VFS for a token.
   */
  getScopedVfs(token: string): IFs | null {
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

  // ✅ Add async to satisfy Promise requirement (or remove await in router)
  async createSession(userId: string) {
    const sessionId = crypto.randomUUID();
    this.sessions.set(userId, sessionId);
    // Initialize mock fs for user if needed
    if (!this.fs.existsSync(`/${userId}`)) {
      this.fs.mkdirSync(`/${userId}`);
    }
    return { sessionId };
  }

  async listFiles(userId: string, path: string) {
    const targetPath = `/${userId}${path}`;
    if (!this.fs.existsSync(targetPath)) return [];
    
    return this.fs.readdirSync(targetPath).map((item) => {
      let itemName: string;
      if (typeof item === 'string') {
        itemName = item;
      } else if (item instanceof Buffer) {
        itemName = item.toString();
      } else {
        itemName = (item as any).name;
      }
      return {
        name: itemName,
        type: this.fs.statSync(`${targetPath}/${itemName}`).isDirectory() ? 'directory' : 'file',
        path: `${path}/${itemName}`.replace('//', '/'),
      };
    });
  }

  async readFile(userId: string, path: string) {
    const targetPath = `/${userId}${path}`;
    if (!this.fs.existsSync(targetPath)) throw new Error('File not found');
    return this.fs.readFileSync(targetPath, 'utf8');
  }

  async writeFile(userId: string, path: string, content: string) {
    const targetPath = `/${userId}${path}`;
    this.fs.writeFileSync(targetPath, content);
    return true;
  }
}

// Export a singleton instance of the service
export const vfsSessionService = new VfsSessionService();
