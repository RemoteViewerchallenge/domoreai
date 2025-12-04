import { db } from '../db.js';
import { jobs } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { createVolcanoAgent } from './AgentFactory.js';

export class JobScheduler {
  private isRunning = false;
  private interval: NodeJS.Timeout | null = null;

  start(intervalMs: number = 5000) {
    if (this.isRunning) return;
    console.log('[CEO] Starting Corporate Heartbeat...');
    this.isRunning = true;
    this.interval = setInterval(() => this.cycle(), intervalMs);
  }

  stop() {
    if (this.interval) clearInterval(this.interval);
    this.isRunning = false;
  }

  private async cycle() {
    try {
      const pendingJobs = await db.query.jobs.findMany({
        where: eq(jobs.status, 'not_started'),
        limit: 5
      });

      for (const job of pendingJobs) {
        // Check if job has a dependency
        if (job.dependsOnJobId) {
          const dependency = await db.query.jobs.findFirst({
            where: eq(jobs.id, job.dependsOnJobId)
          });
          if (dependency && dependency.status !== 'completed') {
            continue;
          }
        }

        console.log(`[JobScheduler] 🟢 Starting Job: ${job.name} (${job.id})`);
        await this.executeJob(job);
      }

    } catch (error: any) {
      // Silently handle "relation does not exist" errors (table not yet created)
      if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
        // Table doesn't exist yet - scheduler will retry on next cycle
        return;
      }
      console.error('[JobScheduler] 🔴 Cycle Error:', error);
    }
  }

  private async executeJob(job: any) {
    await db.update(jobs).set({
        status: 'in_progress',
        startedAt: new Date()
    }).where(eq(jobs.id, job.id));

    try {
      const agent = await createVolcanoAgent({
        roleId: job.roleId || 'general_worker',
        modelId: null,
        isLocked: false,
        temperature: 0.7,
        maxTokens: 4096,
        userGoal: job.description
      });

      const result = await agent.generate(job.description);

      await db.update(jobs).set({
        status: 'completed',
        completedAt: new Date()
      }).where(eq(jobs.id, job.id));

      console.log(`[JobScheduler] ✅ Job Completed: ${job.name}`);

    } catch (error) {
      console.error(`[JobScheduler] ❌ Job Failed: ${job.name}`, error);
      await db.update(jobs).set({
        status: 'failed',
        completedAt: new Date()
      }).where(eq(jobs.id, job.id));
    }
  }
}

export const scheduler = new JobScheduler();
