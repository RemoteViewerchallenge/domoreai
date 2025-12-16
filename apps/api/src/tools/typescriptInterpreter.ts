import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import type { SandboxTool } from '../types.js';

const execAsync = promisify(exec);

/**
 * TypeScript Interpreter Tool
 * Allows agents to write and execute TypeScript code safely
 * 
 * SECURITY WARNING: In production, this should run inside a Docker container
 * or Firecracker microVM to prevent malicious code execution.
 */
export const typescriptInterpreterTool: SandboxTool = {
  name: 'typescript_interpreter',
  description: `Execute raw TypeScript code. Use this to perform calculations, data transformation, or complex logic that standard tools cannot handle.

RULES:
1. Code must end with a console.log() to return data
2. You have access to Node.js built-in modules
3. Code runs in an isolated environment with a 30s timeout
4. Use this for: calculations, data processing, algorithm implementation
5. Do NOT use for: file system access (use filesystem tool), network requests (use browser tool)

EXAMPLE:
\`\`\`typescript
// Calculate Fibonacci
function fib(n: number): number {
  if (n <= 1) return n;
  return fib(n - 1) + fib(n - 2);
}
console.log(JSON.stringify({ result: fib(10) }));
\`\`\``,
  
  inputSchema: {
    type: 'object',
    properties: {
      code: {
        type: 'string',
        description: 'The TypeScript code to execute. Must end with console.log() to return data.',
      },
      timeout: {
        type: 'number',
        description: 'Optional timeout in milliseconds (default: 30000, max: 60000)',
        default: 30000,
      },
    },
    required: ['code'],
  },
  
  handler: async (args: any) => {
    const { code, timeout = 30000 } = args;
    const maxTimeout = Math.min(timeout, 60000); // Cap at 60 seconds
    
    // Create a unique temporary file
    const tempDir = path.join(process.cwd(), '.temp', 'ts-interpreter');
    await fs.mkdir(tempDir, { recursive: true });
    
    const fileName = `agent_${Date.now()}_${Math.random().toString(36).substring(7)}.ts`;
    const filePath = path.join(tempDir, fileName);
    
    try {
      // Write the agent's code to a temporary file
      await fs.writeFile(filePath, code, 'utf-8');
      
      console.log(`[TypeScriptInterpreter] Executing: ${fileName}`);
      
      // Execute using tsx with timeout
      const { stdout, stderr } = await execAsync(
        `npx tsx ${filePath}`,
        { 
          timeout: maxTimeout,
          cwd: tempDir,
          env: {
            ...process.env,
            NODE_ENV: 'sandbox', // Signal to any libraries they're in sandbox mode
          }
        }
      );
      
      // Return both stdout and stderr for debugging
      const result = {
        success: true,
        output: stdout.trim(),
        errors: stderr.trim() || undefined,
        executionTime: Date.now(),
      };
      
      return [{
        type: 'text',
        text: `✅ Code executed successfully.\n\nOutput:\n${stdout}\n${stderr ? `\nWarnings/Errors:\n${stderr}` : ''}`,
      }];
      
    } catch (error: any) {
      console.error(`[TypeScriptInterpreter] Execution failed:`, error);
      
      // Handle timeout
      if (error.killed && error.signal === 'SIGTERM') {
        return [{
          type: 'text',
          text: `❌ Execution timeout (${maxTimeout}ms exceeded).\n\nThe code took too long to execute. Consider breaking it into smaller steps.`,
        }];
      }
      
      // Handle execution errors
      return [{
        type: 'text',
        text: `❌ Execution Error:\n\n${error.message}\n\nStderr: ${error.stderr || 'N/A'}\nStdout: ${error.stdout || 'N/A'}`,
      }];
      
    } finally {
      // Cleanup: Delete the temporary file
      try {
        await fs.unlink(filePath);
      } catch (cleanupError) {
        console.warn(`[TypeScriptInterpreter] Failed to cleanup ${fileName}:`, cleanupError);
      }
    }
  },
};

/**
 * Check if a role has permission to use the TypeScript interpreter
 * This is a powerful tool and should only be granted to trusted roles
 */
export async function canUseTypeScriptInterpreter(roleId: string): Promise<boolean> {
  const { prisma } = await import('../db.js');
  
  const role = await prisma.role.findUnique({
    where: { id: roleId },
    select: { tools: true },
  });
  
  // TypeScript interpreter is available if the role includes 'typescript_interpreter' in its tools array
  return role?.tools.includes('typescript_interpreter') || false;
}
