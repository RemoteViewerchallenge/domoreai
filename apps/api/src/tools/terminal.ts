import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const terminalTools = {
  execute: async ({ command, cwd }: { command: string, cwd?: string }) => {
    // Security check: prevent 'rm -rf /' etc. if needed
    try {
      const { stdout, stderr } = await execAsync(command, { cwd: cwd || process.cwd() });
      return { stdout, stderr, exitCode: 0 };
    } catch (error: any) {
      return { 
        stdout: error.stdout, 
        stderr: error.stderr || error.message, 
        exitCode: error.code || 1 
      };
    }
  }
};
