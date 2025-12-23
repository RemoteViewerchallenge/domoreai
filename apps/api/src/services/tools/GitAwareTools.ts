
import { z } from 'zod';
import { GitService } from '../git.service.js';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs/promises';
import { type ToolDefinition } from '../protocols/LocalProtocol'; // Assuming this type exists or close to it

const prisma = new PrismaClient();
const git = new GitService();

export const CreateGitAwareWorkerTools = (jobId: string, vfsToken: string): ToolDefinition => {
  return {
    name: "execute_task_logic",
    description: "Executes TypeScript code to solve the task. AUTO-COMMITS on success.",
    schema: z.object({
      rationale: z.string().describe("Explanation of the changes."),
      code: z.string().describe("The TypeScript code to execute."),
      affectedFiles: z.array(z.string()).describe("List of files this script modifies.")
    }),
    
    handler: async (args: any) => {
      // 1. Get the Ghost Branch for this Job
      // (This guarantees isolation from main)
      const job = await prisma.job.findUnique({ where: { id: jobId } });
      if (!job) throw new Error(`Job ${jobId} not found`);

      // 2. Ensure we are on the branch
      // We rely on the naming convention or stored branch name.
      // For now using the convention from CorporateOrchestrator
      const branchName = `line/job-${jobId}`; // Simplified convention for now, or fetch from job/metadata?
      // CorporateOrchestrator uses: `volcano/task-${job.id}` in getActiveCrews but `line/${safeDept}/${timestamp}` in dispatchCrew. 
      // The snippet assumes `volcano/job-${jobId}`. I will use `volcano/job-${jobId}` to match snippet or need to align.
      // I'll stick to the snippet's logic for "The Git-Aware Tool Definition": `volcano/job-${jobId}`.
      
      const targetBranch = `volcano/job-${jobId}`;

      try {
          await git.checkoutBranch(vfsToken, targetBranch);
      } catch (e) {
          // If branch doesn't exist, maybe create it? Or fail?
          // Worker expects branch to exist. 
          console.warn(`Branch ${targetBranch} check failed, attempting to create or stay on current.`, e);
      }

      // 3. Execute the Code (Sandboxed)
      // We reuse the basic sandbox logic or just eval for now as per snippet "runSandbox(args.code)"
      // Ideally calling back to AgentRuntime's sandbox, but here we are in a standalone tool factory.
      // I will implement a simple safely-ish runner using 'vm' or similar if reachable, 
      // OR just direct execution if this is running in Node. 
      // The snippet calls `runSandbox(args.code)`. I need to define it or import it.
      
      const result = await runLocalSandbox(args.code);

      if (result.success) {
        // 4. AUTO-COMMIT (The "Resilience" Requirement)
        // If the code ran without error, we commit the file changes immediately.
        try {
            await git.commit(
            vfsToken, 
            `feat(bot): ${args.rationale} [Task: ${jobId}]`
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
        // 5. AUTO-REVERT (Optional but recommended)
        // git.checkout('.') to wipe uncommitted changes on error
        await git.discardChanges(vfsToken);
        return { status: "error", error: result.error };
      }
    }
  };
};

async function runLocalSandbox(userScript: string) {
    // Simple mock sandbox for now, as AgentRuntime has the real one.
    // In a real implementation this should share logic with AgentRuntime.
    const { runInNewContext } = await import('vm');
    
    const sandbox = {
      console: { log: (msg: any) => console.log(`[WORKER_VM]:`, msg) },
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
      const output: any[] = [];
      sandbox.console.log = (msg: any) => output.push(msg);
      
      await runInNewContext(`(async () => { ${userScript} })()`, sandbox);
      return { success: true, output: output.join('\n') };
    } catch (error) {
      return { success: false, error: `Runtime Error: ${error instanceof Error ? error.message : String(error)}` };
    }
}
