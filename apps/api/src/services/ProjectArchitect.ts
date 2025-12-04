import { createVolcanoAgent } from './AgentFactory.js';
import { db } from '../db.js';
import { jobs, projects } from '../db/schema.js';
import { eq } from 'drizzle-orm';

export class ProjectArchitect {

  /**
   * Hires an AI Architect to break down a vague goal into an actionable plan.
   */
  async draftBlueprint(projectId: string, goal: string) {
    console.log(`[Architect] 🏗️ Drafting blueprint for project: "${goal}"...`);

    // 1. Hire the Architect Agent
    // We request a high-reasoning model (Chain of Command: Officer Level)
    const architect = await createVolcanoAgent({
        roleId: 'architect', // We will seed this role next
        modelId: null,       // Let orchestrator find the smartest model
        isLocked: false,
        temperature: 0.7,
        maxTokens: 4000
    });

    // 2. The Planning Prompt
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

    // 4. Parse and Enforce the Plan
    try {
        const jsonMatch = planText.match(/\[[\s\S]*\]/);
        if (!jsonMatch) throw new Error("Architect failed to produce valid JSON plan.");

        const plan = JSON.parse(jsonMatch[0]);
        console.log(`[Architect] 📋 Generated ${plan.length} jobs.`);

        // 5. Commit to Corporate Database
        // We need to map the relative indices to actual DB IDs
        const createdJobIds: string[] = [];

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

            createdJobIds.push(job.id);
        }

        console.log(`[Architect] ✅ Blueprint active. Workers notified.`);

    } catch (e) {
        console.error("[Architect] 💥 Planning meeting failed:", e);
    }
  }
}

