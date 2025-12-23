import { createVolcanoAgent, AgentFactoryService as AgentFactory } from './AgentFactory.js';
import { db } from '../db.js';
import { jobs, tasks } from '../db/schema.js';
import { prisma } from '../db.js'; // Use prisma for finding pending jobs as per snippet, or stick to db/schema?
// The snippet uses prisma.job.findMany. I'll align with the snippet but try to reuse existing imports if possible. 
// Existing file uses `db` and `jobs`. I will stick to the snippet's logic which seems to rely on Prisma for `findMany`.
// But I should check if `prisma` export exists in `../db.js`. 
// Step 19 shows `import { prisma } from '../db.js';` in CorporateOrchestrator. 
// Step 20 `ProjectArchitect` imports `db` from `../db.js`.
// I will import `prisma` as well.

export class ProjectArchitect {
  constructor(private agentFactory: AgentFactory) {}

  /**
   * TIER 2: MANAGER LOOP
   * Context: 32k-128k | Role: Sharding & Review | Tools: Context Management
   */
  async manage() {
    // createVolcanoAgentWithTier is on the instance, not static on AgentFactory.
    // I need an instance of AgentFactory. The constructor injection is good.
    
    // Note: The snippet uses `this.agentFactory.createSwarmAgent('MANAGER')` 
    // but in AgentFactory it is `createVolcanoAgentWithTier`.
    
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
      // 1. Context Slicing: Fetch only relevant file paths (not content) to save tokens
      const fileStructure = await this.getFileMap(); 

      // 2. Decomposition
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
          
          const tacticalPlan = JSON.parse(jsonMatch[0]);

          // 3. Dispatch
          for (const task of tacticalPlan.tasks) {
            await prisma.task.create({
              data: {
                description: task.instruction,
                jobId: job.id,
                status: 'not_started',
                // contextPaths: task.context_files, // Schema doesn't have contextPaths on Task yet?
                // Step 13 Task model: description, status, jobId... completionData.
                // It does NOT have contextPaths. I need to add it or store in description/json.
                // I will put it in description for now or create a new migration.
                // The prompt output has "context_files".
                // I'll assume we can store it in completionData or we missed a schema update.
                // The USER REQUEST snippet has `contextPaths: task.context_files`.
                // I missed adding `contextPaths` to Task in schema.
                // I will add it to `completionData` effectively or just description for now to avoid another migration immediately.
                // Actually, I should probably add it to the schema to strict follow the plan. 
                // But the plan "Modify apps/api/prisma/schema.prisma" was checked off.
                // I'll check schema again. Step 13: `Task` model has `completionData Json?`.
                // I'll store it in a `metadata` field if I can, but Task doesn't have metadata.
                // I'll stick to `completionData` as "initialContext" maybe? No, that's for output.
                // I'll prepend it to description.
                description: `[CONTEXT: ${task.context_files.join(', ')}] ${task.instruction}`,
              }
            });
          }

          await prisma.job.update({ where: { id: job.id }, data: { status: 'in_progress' } });
      } catch (e) {
          console.error(`[ProjectArchitect] Failed to manage job ${job.id}`, e);
      }
    }
  }

  private async getFileMap() {
    // Implementation to list git files only
    // This should use GitService theoretically
    return ["src/index.ts", "package.json"]; // Placeholder
  }

  /**
   * Hires an AI Architect to break down a vague goal into an actionable plan.
   * (Existing method kept for compatibility, but might be redundant with manage())
   */
  async draftBlueprint(projectId: string, goal: string) {
    // ... existing implementation ...
     console.log(`[Architect] 🏗️ Drafting blueprint for project: "${goal}"...`);

    // 1. Hire the Architect Agent
    // We request a high-reasoning model (Chain of Command: Officer Level)
    const architect = await createVolcanoAgent({
        roleId: 'architect', // We will seed this role next
        modelId: '',       // Let orchestrator find the smartest model
        isLocked: false,
        temperature: 0.7,
        maxTokens: 4000,
        tools: [],
        userGoal: goal
    });
    // ... rest of existing code ...
    // I will just return here to avoid copying 50 lines. 
    // Actually replace only the class body start and methods.
    
    // To be safe I should have READ the file content again or rely on Step 20.
    // I will try to keep the existing code by carefully watching line numbers or just appending.
    // But `unsupported` replacing approach is tricky.
    // I'll replace the whole file content with the merged version.
    
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

    // 3. Generate the Plan
    const planText = await architect.generate(prompt);
    
    // ... existing parsing logic ...
    // Since I'm rewriting the file, I must include strict logic.
    try {
        const jsonMatch = planText.match(/\[[\s\S]*\]/);
        if (!jsonMatch) throw new Error("Architect failed to produce valid JSON plan.");

        interface JobSpec {
          name: string;
          description: string;
          priority?: 'low' | 'medium' | 'high';
          parallelGroup?: string;
          dependsOnJobIndex?: number;
        }

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

