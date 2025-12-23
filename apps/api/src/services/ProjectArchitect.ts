import { createVolcanoAgent, AgentFactoryService as AgentFactory } from './AgentFactory.js';
import { db, prisma } from '../db.js';
import { jobs } from '../db/schema.js';

interface TacticalTask {
  instruction: string;
  context_files: string[];
  capability_required: 'code' | 'test' | 'review';
}

interface TacticalPlan {
  tasks: TacticalTask[];
}

interface JobSpec {
  name: string;
  description: string;
  priority?: 'low' | 'medium' | 'high';
  parallelGroup?: string;
  dependsOnJobIndex?: number;
}

export class ProjectArchitect {
  constructor(private agentFactory: AgentFactory) {}

  /**
   * TIER 2: MANAGER LOOP
   * Decompose jobs into tasks
   */
  async manage() {
    const managerAgent = await this.agentFactory.createVolcanoAgentWithTier({
        roleId: 'manager_architect', 
        userGoal: "Decompose jobs into tasks",
        tools: [],
        modelId: '',
        isLocked: false,
        temperature: 0.3,
        maxTokens: 32000
    }, 'Manager');

    const pendingJobs = await prisma.job.findMany({
      where: { status: 'not_started' },
      include: { tasks: true }
    });

    for (const job of pendingJobs) {
      const fileStructure = await this.getFileMap(); 

      const PROMPT = `
      You are the ENGINEERING LEAD.
      GOAL: Convert the Job into atomic TASKS for Workers.
      JOB DESCRIPTION: ${job.description}
      CRITERIA: ${JSON.stringify(job.id)}
      
      CONTEXT FILES (Truncated):
      ${JSON.stringify(fileStructure).slice(0, 10000)}
      
      RULE: Each task must be executable by a Worker with <32k context.
      
      OUTPUT JSON:
      {
        "tasks": [
          { 
            "instruction": "string", 
            "context_files": ["string (file paths)"], 
            "capability_required": "code" | "test" | "review" 
          }
        ]
      }
      `;

      try {
          const responseCtx = await managerAgent.generate(PROMPT);
          const jsonMatch = responseCtx.match(/\{[\s\S]*\}/);
          if (!jsonMatch) throw new Error("No JSON found");
          
          const tacticalPlan = JSON.parse(jsonMatch[0]) as TacticalPlan;

          for (const task of tacticalPlan.tasks) {
            await prisma.task.create({
              data: {
                jobId: job.id,
                status: 'not_started',
                description: `[CONTEXT: ${task.context_files.join(', ')}] ${task.instruction}`,
              }
            });
          }

          await prisma.job.update({ 
            where: { id: job.id }, 
            data: { status: 'in_progress' } 
          });
      } catch (e) {
          console.error(`[ProjectArchitect] Failed to manage job ${job.id}`, e);
      }
    }
  }

  private async getFileMap() {
    return ["src/index.ts", "package.json"]; // Placeholder
  }

  /**
   * Hires an AI Architect to break down a vague goal into an actionable plan.
   */
  async draftBlueprint(projectId: string, goal: string) {
     console.log(`[Architect] 🏗️ Drafting blueprint for project: "${goal}"...`);

    const architect = await createVolcanoAgent({
        roleId: 'architect',
        modelId: '', 
        isLocked: false,
        temperature: 0.7,
        maxTokens: 4000,
        tools: [],
        userGoal: goal
    });
    
    const prompt = `
      You are the Chief Architect of a software development firm.
      PROJECT GOAL: "${goal}"

      Your task is to break this project down into a series of sequential or parallel JOBS.
      
      RULES:
      1. Start with setup/scaffolding.
      2. Break complex features into separate jobs.
      3. End with a QA/Testing job.
      4. Return ONLY a JSON array.
      
      Format:
      [
        { "name": "Init Repo", "description": "Initialize git and npm...", "priority": "high", "parallelGroup": "setup" },
        { "name": "Build UI", "description": "Create React components...", "dependsOnJobIndex": 0 }
      ]
    `;

    const planText = await architect.generate(prompt);
    
    try {
        const jsonMatch = planText.match(/\[[\s\S]*\]/);
        if (!jsonMatch) throw new Error("Architect failed to produce valid JSON plan.");

        const plan = JSON.parse(jsonMatch[0]) as JobSpec[];
        console.log(`[Architect] 📋 Generated ${plan.length} jobs.`);

        const createdJobIds: string[] = [];

        try {
          for (const jobSpec of plan) {
              const dependencyId = (jobSpec.dependsOnJobIndex !== undefined && createdJobIds[jobSpec.dependsOnJobIndex])
                  ? createdJobIds[jobSpec.dependsOnJobIndex]
                  : undefined;

              const [job] = await db.insert(jobs).values({
                  projectId: projectId,
                  name: jobSpec.name,
                  description: jobSpec.description,
                  priority: jobSpec.priority || 'medium',
                  parallelGroup: jobSpec.parallelGroup,
                  dependsOnJobId: dependencyId,
                  status: 'not_started'
              }).returning();

              if (job) createdJobIds.push(job.id);
          }

          console.log(`[Architect] ✅ Blueprint active. Workers notified.`);
        } catch (dbError: unknown) {
          console.error(dbError);
        }

    } catch (e) {
        console.error("[Architect] 💥 Planning meeting failed:", e);
    }
  }
}
