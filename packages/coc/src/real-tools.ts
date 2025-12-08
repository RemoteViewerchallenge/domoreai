// Real tools for COC orchestration - includes filesystem, database, and role operations
import fs from 'fs/promises';
import { execSync } from 'child_process';
import path from 'path';
import { registerTool } from './tool-registry';

// ========================================
// FILESYSTEM TOOLS
// ========================================

registerTool('read_file', async (args: { path: string }) => {
  const filePath = path.resolve(process.cwd(), args.path);
  const content = await fs.readFile(filePath, 'utf-8');
  return { path: args.path, content, size: content.length };
});

registerTool('write_file', async (args: { path: string; content: string }) => {
  const filePath = path.resolve(process.cwd(), args.path);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, args.content, 'utf-8');
  return { path: args.path, size: args.content.length, success: true };
});

registerTool('list_files', async (args: { path: string }) => {
  const dirPath = path.resolve(process.cwd(), args.path);
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  return {
    path: args.path,
    files: entries.filter(e => e.isFile()).map(e => e.name),
    directories: entries.filter(e => e.isDirectory()).map(e => e.name),
    total: entries.length
  };
});

registerTool('file_exists', async (args: { path: string }) => {
  const filePath = path.resolve(process.cwd(), args.path);
  try {
    await fs.access(filePath);
    return { path: args.path, exists: true };
  } catch {
    return { path: args.path, exists: false };
  }
});

// ========================================
// TERMINAL TOOLS
// ========================================

registerTool('terminal_execute', async (args: { cmd: string }) => {
  try {
    const output = execSync(args.cmd, {
      cwd: process.cwd(),
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024, // 10MB
      timeout: 30000 // 30s timeout
    });
    return { cmd: args.cmd, output, exitCode: 0, success: true };
  } catch (error: any) {
    return {
      cmd: args.cmd,
      output: error.stdout || '',
      error: error.stderr || error.message,
      exitCode: error.status || 1,
      success: false
    };
  }
});

// ========================================
// ROLE CREATION TOOLS
// ========================================

registerTool('create_role', async (args: {
  name: string;
  category?: string;
  basePrompt: string;
  needsVision?: boolean;
  needsReasoning?: boolean;
  needsCoding?: boolean;
  needsTools?: boolean;
  needsJson?: boolean;
  temperature?: number;
  maxTokens?: number;
}) => {
  // In real implementation, this would connect to Prisma/database
  // For now, we'll write to a local JSON file to simulate role creation
  const rolesDir = path.resolve(process.cwd(), 'out/roles');
  await fs.mkdir(rolesDir, { recursive: true });
  
  const roleId = `role_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const role = {
    id: roleId,
    name: args.name,
    category: args.category || 'custom',
    basePrompt: args.basePrompt,
    needsVision: args.needsVision || false,
    needsReasoning: args.needsReasoning || false,
    needsCoding: args.needsCoding || false,
    needsTools: args.needsTools || false,
    needsJson: args.needsJson || false,
    defaultTemperature: args.temperature || 0.7,
    defaultMaxTokens: args.maxTokens || 2048,
    createdAt: new Date().toISOString(),
    createdBy: 'coc_orchestrator'
  };
  
  const filePath = path.join(rolesDir, `${roleId}.json`);
  await fs.writeFile(filePath, JSON.stringify(role, null, 2), 'utf-8');
  
  return {
    success: true,
    roleId,
    role,
    filePath
  };
});

registerTool('list_roles', async (args: { category?: string }) => {
  const rolesDir = path.resolve(process.cwd(), 'out/roles');
  
  try {
    await fs.access(rolesDir);
  } catch {
    return { roles: [], total: 0 };
  }
  
  const files = await fs.readdir(rolesDir);
  const roleFiles = files.filter(f => f.endsWith('.json'));
  
  const roles = await Promise.all(
    roleFiles.map(async (file) => {
      const content = await fs.readFile(path.join(rolesDir, file), 'utf-8');
      return JSON.parse(content);
    })
  );
  
  const filtered = args.category
    ? roles.filter(r => r.category === args.category)
    : roles;
  
  return {
    roles: filtered,
    total: filtered.length,
    categories: [...new Set(roles.map(r => r.category))]
  };
});

registerTool('get_role', async (args: { roleId?: string; name?: string }) => {
  const rolesDir = path.resolve(process.cwd(), 'out/roles');
  
  if (args.roleId) {
    const filePath = path.join(rolesDir, `${args.roleId}.json`);
    const content = await fs.readFile(filePath, 'utf-8');
    return { role: JSON.parse(content), found: true };
  }
  
  if (args.name) {
    const files = await fs.readdir(rolesDir);
    for (const file of files) {
      if (file.endsWith('.json')) {
        const content = await fs.readFile(path.join(rolesDir, file), 'utf-8');
        const role = JSON.parse(content);
        if (role.name === args.name) {
          return { role, found: true };
        }
      }
    }
  }
  
  return { role: null, found: false };
});

// ========================================
// METADATA & ANALYSIS TOOLS
// ========================================

registerTool('analyze_code', async (args: { path: string }) => {
  const filePath = path.resolve(process.cwd(), args.path);
  const content = await fs.readFile(filePath, 'utf-8');
  
  const lines = content.split('\n');
  const stats = {
    path: args.path,
    totalLines: lines.length,
    codeLines: lines.filter(l => l.trim() && !l.trim().startsWith('//')).length,
    commentLines: lines.filter(l => l.trim().startsWith('//')).length,
    imports: lines.filter(l => l.trim().startsWith('import ')).length,
    exports: lines.filter(l => l.trim().startsWith('export ')).length,
    functions: (content.match(/function\s+\w+/g) || []).length,
    classes: (content.match(/class\s+\w+/g) || []).length,
    interfaces: (content.match(/interface\s+\w+/g) || []).length,
    types: (content.match(/type\s+\w+/g) || []).length
  };
  
  return stats;
});

registerTool('search_files', async (args: { pattern: string; path?: string }) => {
  const searchPath = args.path ? path.resolve(process.cwd(), args.path) : process.cwd();
  
  try {
    const output = execSync(`grep -r "${args.pattern}" "${searchPath}" --include="*.ts" --include="*.tsx" --include="*.js" -n`, {
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024
    });
    
    const matches = output.trim().split('\n').map(line => {
      const [filePath, ...rest] = line.split(':');
      const lineNum = rest[0];
      const content = rest.slice(1).join(':');
      return { file: filePath, line: parseInt(lineNum), content };
    });
    
    return {
      pattern: args.pattern,
      matches,
      total: matches.length
    };
  } catch {
    return {
      pattern: args.pattern,
      matches: [],
      total: 0
    };
  }
});

// ========================================
// JSON OPERATIONS
// ========================================

registerTool('read_json', async (args: { path: string }) => {
  const filePath = path.resolve(process.cwd(), args.path);
  const content = await fs.readFile(filePath, 'utf-8');
  const data = JSON.parse(content);
  return { path: args.path, data, keys: Object.keys(data), size: JSON.stringify(data).length };
});

registerTool('write_json', async (args: { path: string; data: any }) => {
  const filePath = path.resolve(process.cwd(), args.path);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const content = JSON.stringify(args.data, null, 2);
  await fs.writeFile(filePath, content, 'utf-8');
  return { path: args.path, size: content.length, success: true };
});

// ========================================
// INITIALIZATION
// ========================================

import { listTools } from './tool-registry';
const registeredTools = listTools();
console.log(`[Tools] Registered ${registeredTools.length} tools:`, registeredTools.join(', '));
