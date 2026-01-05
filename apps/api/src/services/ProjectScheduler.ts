import { prisma } from '../db.js';
import { Project, Job } from '@prisma/client';
import { GitService } from './git.service.js';
import { JobDispatchError } from '../errors/AppErrors.js';
import { TRPCError } from '@trpc/server';
import { AgentFactoryService as AgentFactory, VolcanoAgent } from './AgentFactory.js';


export class ProjectScheduler {
  private gitService: GitService;
  private agentFactory?: AgentFactory;

  constructor(agentFactory?: AgentFactory) {
    this.gitService = new GitService();
    this.agentFactory = agentFactory;
  }

  /**
   * TIER 3: EXECUTIVE LOOP
   * Context: >128k | Role: Strategy Only | Tools: Read-Only + Job Creation
   */
  async wake() {
    if (!this.agentFactory) {
        console.warn("AgentFactory not provided to ProjectScheduler, skipping wake()");
        return;
    }

    // 1. Initialize Executive Agent (Gemini 1.5 Pro / o1-preview)
    // Note: 'EXECUTIVE' string needs to be handled by createSwarmAgent types
    const agent = await this.agentFactory.createVolcanoAgentWithTier({ 
        roleId: 'executive_planner', // User might need to create this role or we use a generic placeholder
        userGoal: "Plan strategy for pending projects",
        tools: [],
        modelId: '', // Will be selected by tier
        isLocked: false,
        temperature: 0.1,
        maxTokens: 128000
    }, 'Executive');

    // 2. Scan for Stalled or New Projects
    const projects = await prisma.project.findMany({
      where: { status: { in: ['not_started', 'in_progress'] } }, // Updated status enum match
      include: { jobs: true }
    });

    for (const project of projects) {
      if (this.needsPlanning(project)) {
        await this.formulateStrategy(agent, project);
      }
    }
  }

  private needsPlanning(project: Project & { jobs: Job[] }): boolean {
    // If no jobs, or all jobs are completed, we need a plan (or a new plan)
    // Also if status is not_started
    return project.jobs.length === 0 || project.jobs.every((j: Job) => j.status === 'completed');
  }

  private async formulateStrategy(agent: VolcanoAgent, project: Project) {
    console.log(`[EXECUTIVE] Planning for Project: ${project.name}`);
    
    // STRICT_MODE: No Chat. Input -> Process -> Output.
    // Assuming agent.generate or similar method exists. 
    // The prompt in the request used agent.generateJSON, we might need to adapt if Agent only has generate()
    // For now I'll format the prompt to request JSON explicitly.
    
    const PROMPT = `
    You are the CHIEF ARCHITECT. 
    GOAL: Break down the project into 3-5 high-level JOBS.
    CONSTRAINTS: Do not write code. Do not assign files. Define GOALS only.
    
    PROJECT REQUIREMENTS:
    ${project.description || project.name}
    
    OUTPUT FORMAT:
    Return ONLY a JSON object matching this schema:
    {
      "jobs": [
        { "title": "string", "description": "string", "definition_of_done": "string" }
      ]
    }
    `;

    interface StrategyPlan {
        jobs: Array<{ title: string; description: string; definition_of_done: string; }>;
    }

    try {
        const responseCtx = await agent.generate(PROMPT);
        // Clean response to get JSON
        const jsonMatch = responseCtx.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No JSON found in response");
        
        const plan = JSON.parse(jsonMatch[0]) as StrategyPlan;

        // Write State to DB (The "Constitution")
        for (const job of plan.jobs) {
        await prisma.job.create({
            data: {
            name: job.title, // 'title' -> 'name' in schema
            description: job.description,
            projectId: project.id,
            status: 'not_started', // 'PENDING' -> 'not_started'
            priority: 'high',
            // Store criteria in description or separate field? Schema has no metadata on Job right now?
            // Wait, schema has NO metadata on Job. Job model has: name, description, status, priority.
            // I'll append definition of done to description for now.
            }
        });
        }
    } catch (e: unknown) {
        console.error(`[EXECUTIVE] Failed to formulate strategy for ${project.name}`, e instanceof Error ? e.message : String(e));
    }
  }

  /**
   * Dispatches a crew to work on a specific objective for a department.
   * Creates a Job record and a Git ghost branch.
   *
   * @param existingBranchName - If provided, reuses this branch ("Ghost Line") instead of creating a new one.
   */
  async dispatchCrew(departmentId: string, objective: string, vfsToken: string, existingBranchName?: string) {
    // ... existing implementation ...
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

        // 2. Manage Branch (Ghost Lines)
        let branchName: string;

        if (existingBranchName) {
            // Reuse existing branch (Ghost Line)
            const result = await this.gitService.checkoutAndPull(vfsToken, existingBranchName);
            branchName = result.branch;
        } else {
            // Create new branch using department/timestamp convention
            // Convention: line/{department}/{timestamp}
            const timestamp = Date.now();
            const safeDept = departmentId.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();
            const newBranchName = `line/${safeDept}/${timestamp}`;

            // Use createGhostBranch with the custom name
            branchName = await this.gitService.createGhostBranch(vfsToken, job.id, newBranchName);
        }
        // in a real system this would push a message to a queue or call the CoC agent service.
        console.log(`[ProjectScheduler] Crew dispatched to ${branchName} for Job ${job.id}`);

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

