import { z } from 'zod';
import { GitService } from '../git.service.js';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs/promises';
import { type ToolDefinition } from '../protocols/LocalProtocol.js';

const prisma = new PrismaClient();
const git = new GitService();

interface ExecuteTaskArgs {
  rationale: string;
  code: string;
  affectedFiles: string[];
}

export const CreateGitAwareWorkerTools = (jobId: string, vfsToken: string): ToolDefinition => {
  return {
    name: "execute_task_logic",
    description: "Executes TypeScript code to solve the task. AUTO-COMMITS on success.",
    input_schema: z.object({
      rationale: z.string().describe("Explanation of the changes."),
      code: z.string().describe("The TypeScript code to execute."),
      affectedFiles: z.array(z.string()).describe("List of files this script modifies.")
    }) as unknown as Record<string, unknown>,
    
    handler: async (args: unknown) => {
      const typedArgs = args as ExecuteTaskArgs;
      // 1. Get the Ghost Branch for this Job
      const job = await prisma.job.findUnique({ where: { id: jobId } });
      if (!job) throw new Error(`Job ${jobId} not found`);

      const targetBranch = `volcano/job-${jobId}`;

      try {
          await git.checkoutBranch(vfsToken, targetBranch);
      } catch (e) {
          console.warn(`Branch ${targetBranch} check failed, attempting to create or stay on current.`, e);
      }

      // 3. Execute the Code (Sandboxed)
      const result = await runLocalSandbox(typedArgs.code);

      if (result.success) {
        // 4. AUTO-COMMIT (The "Resilience" Requirement)
        try {
            await git.commit(
            vfsToken, 
            `feat(bot): ${typedArgs.rationale} [Task: ${jobId}]`
            );
            return { 
                status: "success", 
                output: result.output, 
                git: "Changes committed to " + targetBranch 
            };
        } catch (commitErr) {
            return { status: "success_but_commit_failed", output: result.output, error: String(commitErr) };
        }
      } else {
        // 5. AUTO-REVERT
        await git.discardChanges(vfsToken);
        return { status: "error", error: result.error };
      }
    }
  };
};

async function runLocalSandbox(userScript: string) {
    const { runInNewContext } = await import('vm');
    
    const output: string[] = [];
    const sandbox = {
      console: { log: (msg: unknown) => output.push(String(msg)) },
      env: {
        fs: {
          read: async (p: string) => fs.readFile(p, 'utf-8'),
          write: async (p: string, c: string) => fs.writeFile(p, c),
          list: async (p: string) => fs.readdir(p)
        }
      }
    };
    
    if (userScript.includes("eval(")) return { success: false, error: "Security Violation: eval() forbidden" };

    try {
      await runInNewContext(`(async () => { ${userScript} })()`, sandbox);
      return { success: true, output: output.join('\n') };
    } catch (error) {
      return { success: false, error: `Runtime Error: ${error instanceof Error ? error.message : String(error)}` };
    }
}
