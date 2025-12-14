import fs from 'fs/promises';
import path from 'path';

export interface GraphNode {
  id: string; // Absolute path or relative to root
  label: string;
  type: 'file' | 'directory';
  roleId: string; // 'frontend', 'backend', 'database' etc
  imports: string[];
  path: string;
}

export class CodeGraphService {
  async generateGraph(rootPath?: string): Promise<GraphNode[]> {
    const startPath = rootPath || process.cwd();
    const nodes: GraphNode[] = [];
    
    await this.scanDirectory(startPath, startPath, nodes);
    return nodes;
  }

  private async scanDirectory(currentPath: string, rootPath: string, nodes: GraphNode[]) {
    try {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        const relativePath = path.relative(rootPath, fullPath);
        
        // Skip node_modules, .git, dist, etc.
        if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'dist') {
          continue;
        }

        if (entry.isDirectory()) {
          // Add Directory Node (optional, but good for structure)
          nodes.push({
            id: fullPath,
            label: entry.name,
            type: 'directory',
            roleId: this.determineRole(relativePath),
            imports: [],
            path: fullPath
          });
          
          // Recurse
          await this.scanDirectory(fullPath, rootPath, nodes);
        } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
          // Parse Imports
          const content = await fs.readFile(fullPath, 'utf-8');
          const imports = this.parseImports(content);

          nodes.push({
            id: fullPath, // Use full path as ID for uniqueness
            label: entry.name,
            type: 'file',
            roleId: this.determineRole(relativePath),
            imports: imports.map(imp => {
                // Resolve relative imports to absolute-ish paths or keep as is?
                // For simplified graph, we just keep the module specifier
                // Ideally we resolve it to a file path if starts with .
                if (imp.startsWith('.')) {
                    return path.resolve(path.dirname(fullPath), imp);
                }
                return imp;
            }),
            path: fullPath
          });
        }
      }
    } catch (error) {
      console.error(`Error scanning directory ${currentPath}:`, error);
    }
  }

  private determineRole(relativePath: string): string {
    const lower = relativePath.toLowerCase();
    
    if (lower.includes('apps/ui') || lower.includes('frontend') || lower.includes('components')) return 'frontend-lead';
    if (lower.includes('apps/api') || lower.includes('backend') || lower.includes('services')) return 'backend-architect';
    if (lower.includes('db') || lower.includes('prisma') || lower.includes('database')) return 'database-admin';
    if (lower.includes('docker') || lower.includes('config')) return 'devops-engineer';
    
    return 'general-developer';
  }

  private parseImports(content: string): string[] {
    const imports: string[] = [];
    // Simple regex for import ... from '...'
    const regex = /import\s+.*?\s+from\s+['"](.*?)['"];?/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      imports.push(match[1]);
    }
    // Dynamic imports? import(...)
    return imports;
  }
}

export const codeGraphService = new CodeGraphService();
