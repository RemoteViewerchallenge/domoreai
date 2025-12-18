import { prisma } from '../db.js';
import { GitService } from './git.service.js';
import { JobDispatchError } from '../errors/AppErrors.js';
import { TRPCError } from '@trpc/server';

export class CorporateOrchestrator {
  private gitService: GitService;

  constructor() {
    this.gitService = new GitService();
  }

  /**
   * Dispatches a crew to work on a specific objective for a department.
   * Creates a Job record and a Git ghost branch.
   */
  async dispatchCrew(departmentId: string, objective: string, vfsToken: string) {
    // 1. Create a Job record
    // departmentId is treated as projectId here.
    // If departmentId doesn't exist as a Project, we might need to handle it or assume it's valid.
    // Ideally we verify project existence first.
    
    // For now, let's assume departmentId IS the projectId.
    // We create a job with status 'in_progress' immediately as we are "dispatching" it.
    
    try {
        const job = await prisma.job.create({
            data: {
                name: `Mission: ${objective.substring(0, 50)}...`, // Truncate for name
                description: objective,
                status: 'in_progress',
                priority: 'high',
                projectId: departmentId,
                // We could assign a lead role here if we knew it?
                // For now leave roleId null or set a default if needed.
            }
        });

        // 2. Create Ghost Branch
        const branchName = await this.gitService.createGhostBranch(vfsToken, job.id);

        // 3. (Mock) Trigger AI Agent
        // in a real system this would push a message to a queue or call the CoC agent service.
        console.log(`[CorporateOrchestrator] Crew dispatched to ${branchName} for Job ${job.id}`);

        return {
            jobId: job.id,
            branchName,
            status: 'dispatched'
        };

    } catch (error: unknown) {
        throw new JobDispatchError(
            `Dispatch Crew failed: ${error instanceof Error ? error.message : String(error)}`
        );
    }
  }

  /**
   * Returns active crews (in_progress jobs).
   */
  async getActiveCrews() {
      try {
        const jobs = await prisma.job.findMany({
            where: {
                status: 'in_progress'
            },
            include: {
                project: true // Include department info
            }
        });

        return jobs.map(job => ({
            jobId: job.id,
            objective: job.description,
            department: job.project.name,
            branchName: `volcano/task-${job.id}`, // Derived convention
            startedAt: job.createdAt
        }));

      } catch (error: unknown) {
         throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Get Active Crews failed: ${error instanceof Error ? error.message : String(error)}`
        });
      }
  }
}
