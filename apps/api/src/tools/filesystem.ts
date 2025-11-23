import fs from 'fs/promises';
import path from 'path';

export const fsTools = {
  readFile: async ({ path: filePath }: { path: string }) => {
    return await fs.readFile(filePath, 'utf-8');
  },
  writeFile: async ({ path: filePath, content }: { path: string, content: string }) => {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content);
    return { success: true };
  },
  listFiles: async ({ path: dirPath }: { path: string }) => {
    // Implement recursive walk or simple readdir
    const files = await fs.readdir(dirPath, { withFileTypes: true });
    return files.map(f => ({ name: f.name, isDir: f.isDirectory() }));
  }
};
