import { exec } from 'child_process';
import { promisify } from 'util';
import { z } from 'zod';

const execAsync = promisify(exec);

const ExecuteInputSchema = z.object({
  command: z.string().describe('The bash command to run'),
  cwd: z.string().optional().describe('Optional working directory (relative to repo root)')
});

export const terminalTools = {
  execute: {
    name: 'terminal_execute',
    description: 'EXECUTE: Run a bash command in the project root.\n\nRULES:\n1. You are in a secure environment.\n2. Output (stdout/stderr) is captured and returned to you.\n3. Use this to run tests, install packages (npm install), or manage git.\n4. Do NOT run interactive commands (like `top` or `nano`).\n5. Commands run with a 30s timeout; long-running tasks should be broken into smaller steps.',
    inputSchema: ExecuteInputSchema,
    handler: async ({ command, cwd }: { command: string; cwd?: string }) => {
      try {
        console.log(`[Terminal] 💻 Executing: ${command}`);
        const { stdout, stderr } = await execAsync(command, { cwd: cwd || process.cwd(), timeout: 30000 });
        return {
          status: 'success',
          stdout: stdout ? stdout.toString().trim() : '',
          stderr: stderr ? stderr.toString().trim() : '',
          exitCode: 0,
        };
      } catch (error: any) {
        console.warn(`[Terminal] ⚠️ Error executing: ${command}`);
        return {
          status: 'error',
          stdout: error.stdout ? String(error.stdout).trim() : '',
          stderr: error.stderr ? String(error.stderr).trim() : (error.message || 'Unknown error'),
          exitCode: typeof error.code === 'number' ? error.code : 1,
          hint: 'Check command syntax, working directory, and avoid interactive commands.'
        };
      }
    }
  }
};
