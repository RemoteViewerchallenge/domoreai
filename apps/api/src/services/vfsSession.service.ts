import { Volume, createFsFromVolume } from 'memfs';
import type { IFS } from 'memfs/lib/fs.js';

export class VfsSessionService {
  private globalVolume: Volume;
  public readonly fs: IFS; // Expose the memfs instance directly

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
   * In this new model, we don't return a scoped VFS.
   * We return the global VFS, and the router will be responsible
   * for prepending the correct root path to all operations.
   */
  getFs(): IFS {
    return this.fs;
  }
}

// Export a singleton instance of the service
export const vfsSessionService = new VfsSessionService();
