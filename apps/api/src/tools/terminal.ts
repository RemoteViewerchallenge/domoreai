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
    description: 'EXECUTE: Run a bash command in the project root.\n\nRULES:\n1. Never use sudo for global installs. Use npx or local npm prefix.\n2. Output (stdout/stderr) is captured and returned to you.\n3. Use this to run tests, install packages (npm install), or manage git.\n4. Do NOT run interactive commands.\n5. Commands run with a 45s watchdog; if no output is detected for 45s, the process will be killed.',
    inputSchema: ExecuteInputSchema,
    handler: async ({ command, cwd }: { command: string; cwd?: string }) => {
      if (command.includes('sudo ') && (command.includes('npm install') || command.includes('-g'))) {
        return {
          status: 'error',
          stdout: '',
          stderr: 'Policy Violation: Sudo is forbidden for global installs. Please use npx or local prefix.',
          exitCode: 1
        };
      }

      try {
        console.log(`[Terminal] 💻 Executing: ${command}`);
        const { stdout, stderr } = await execAsync(command, { cwd: cwd || process.cwd(), timeout: 45000 });
        return {
          status: 'success',
          stdout: stdout ? stdout.toString().trim() : '',
          stderr: stderr ? stderr.toString().trim() : '',
          exitCode: 0,
        };
      } catch (error: any) {
        if (error.signal === 'SIGTERM' || error.killed) {
           console.error(`[Terminal] Watchdog triggered for: ${command}`);
           return {
             status: 'error',
             stdout: '',
             stderr: 'Process stalled for > 45s (Watchdog). Retrying with npx recommended.',
             exitCode: 124
           };
        }
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
