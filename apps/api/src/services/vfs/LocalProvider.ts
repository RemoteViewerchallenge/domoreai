import fs from 'fs/promises';
import path from 'path';
import { IVfsProvider, FileEntry } from './IVfsProvider.js';

export class LocalProvider implements IVfsProvider {
  private rootPath: string;

  constructor(rootPath: string) {
    this.rootPath = path.resolve(rootPath);
  }

  private resolvePath(relativePath: string): string {
    // Sanitize and resolve the path
    const resolved = path.resolve(this.rootPath, relativePath);
    
    // Ensure the resolved path is within the rootPath (fencing)
    if (!resolved.startsWith(this.rootPath)) {
      throw new Error(`Access denied: Path '${relativePath}' is outside the allowable scope.`);
    }
    
    return resolved;
  }

  async list(dirPath: string): Promise<FileEntry[]> {
    const fullPath = this.resolvePath(dirPath);
    const entries = await fs.readdir(fullPath, { withFileTypes: true });

    return entries.map(entry => ({
      name: entry.name,
      type: entry.isDirectory() ? 'directory' : 'file',
      path: path.join(dirPath, entry.name), // Return relative path
      // Size would require a separate stat call, skipping for performance unless needed
    }));
  }

  async read(filePath: string): Promise<string> {
    const fullPath = this.resolvePath(filePath);
    return fs.readFile(fullPath, 'utf-8');
  }

  async write(filePath: string, content: string): Promise<void> {
    const fullPath = this.resolvePath(filePath);
    // Ensure parent directory exists
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content, 'utf-8');
  }

  async mkdir(dirPath: string): Promise<void> {
    const fullPath = this.resolvePath(dirPath);
    await fs.mkdir(fullPath, { recursive: true });
  }

  async exists(filePath: string): Promise<boolean> {
    try {
      const fullPath = this.resolvePath(filePath);
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }
}
