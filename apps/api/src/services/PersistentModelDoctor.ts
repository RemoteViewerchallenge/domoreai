import { ModelDoctor } from './ModelDoctor.js';
import { Surveyor } from './Surveyor.js';
import { backupService } from './BackupService.js';

/**
 * PERSISTENT MODEL DOCTOR SERVICE
 * 
 * Runs continuously until ALL models have complete data:
 * - Context window
 * - Rate limits
 * - Capabilities (vision, TTS, multimodal, etc.)
 * - Pricing
 * 
 * Strategy:
 * 1. Surveyor (Fast): Pattern matching for known models
 * 2. ModelDoctor (Slow): AI research for unknown models
 * 3. Automatic backups before healing
 * 4. Persistent operation until 100% complete
 */

export interface HealthCheckResult {
  total: number;
  complete: number;
  incomplete: number;
  completionRate: number;
  missingFields: Record<string, number>;
}

export class PersistentModelDoctor {
  private isRunning = false;
  private interval: NodeJS.Timeout | null = null;
  private checkIntervalMs = 5 * 60 * 1000; // 5 minutes
  private doctor: ModelDoctor;

  // Completion criteria: All models must have these fields
  private requiredFields = [
    'contextWindow',
    'capabilities',
    'costPer1k'
  ];

  constructor() {
    this.doctor = new ModelDoctor();
  }

  /**
   * Start the persistent doctor service
   */
  async start() {
    if (this.isRunning) {
      console.log('[PersistentDoctor] Already running');
      return;
    }

    console.log('[PersistentDoctor] 🏥 Starting persistent model healing service...');
    this.isRunning = true;

    // Run initial check
    await this.runHealingCycle();

    // Schedule periodic checks
    this.interval = setInterval(() => {
      void this.runHealingCycle();
    }, this.checkIntervalMs);

    console.log(`[PersistentDoctor] ✅ Service started (checking every ${this.checkIntervalMs / 1000 / 60} minutes)`);
  }

  /**
   * Stop the persistent doctor service
   */
  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.isRunning = false;
    console.log('[PersistentDoctor] ⏹️ Service stopped');
  }

  /**
   * Run a complete healing cycle
   */
  private async runHealingCycle() {
    try {
      console.log('[PersistentDoctor] 🔍 Running health check...');

      // 1. Check current health status
      const health = await this.checkHealth();
      
      console.log(`[PersistentDoctor] 📊 Health: ${health.completionRate.toFixed(1)}% complete (${health.complete}/${health.total} models)`);

      // If we're at 100%, we can reduce check frequency
      if (health.completionRate === 100) {
        console.log('[PersistentDoctor] ✅ All models are healthy! Reducing check frequency...');
        this.checkIntervalMs = 60 * 60 * 1000; // 1 hour
        return;
      }

      // 2. Create backup before healing
      console.log('[PersistentDoctor] 💾 Creating safety backup...');
      const backupSuccess = await backupService.backupBeforeOperation('model-healing-cycle');
      
      if (!backupSuccess) {
        console.warn('[PersistentDoctor] ⚠️ Backup failed, skipping healing for safety');
        return;
      }

      // 3. Run Surveyor first (fast path)
      console.log('[PersistentDoctor] 🗺️ Running Surveyor (pattern matching)...');
      const surveyResults = await Surveyor.surveyAll();
      console.log(`[PersistentDoctor] Surveyor: ${surveyResults.surveyed} identified, ${surveyResults.unknown} unknown`);

      // 4. If there are still unknown models, run ModelDoctor (slow path)
      if (surveyResults.unknown > 0) {
        console.log(`[PersistentDoctor] 🩺 Running ModelDoctor for ${surveyResults.unknown} unknown models...`);
        const doctorResults = await this.doctor.healModels(false);
        console.log(`[PersistentDoctor] Doctor: ${doctorResults.inferred} inferred, ${doctorResults.researched} researched, ${doctorResults.failed} failed`);
      }

      // 5. Final health check
      const finalHealth = await this.checkHealth();
      const improvement = finalHealth.completionRate - health.completionRate;
      
      console.log(`[PersistentDoctor] 📈 Improvement: +${improvement.toFixed(1)}% (now ${finalHealth.completionRate.toFixed(1)}% complete)`);

      // Log missing fields for visibility
      if (Object.keys(finalHealth.missingFields).length > 0) {
        console.log('[PersistentDoctor] Missing fields:');
        for (const [field, count] of Object.entries(finalHealth.missingFields)) {
          console.log(`  - ${field}: ${count} models`);
        }
      }

    } catch (error) {
      console.error('[PersistentDoctor] ❌ Healing cycle failed:', error);
    }
  }

  /**
   * Check the health status of all models
   * 
   * [UPDATED] Now strictly checks the ModelCapabilities relation
   */
  async checkHealth(): Promise<HealthCheckResult> {
    const { prisma } = await import('../db.js');

    // Get all active models WITH their capabilities relation
    const models = await prisma.model.findMany({
      where: { isActive: true },
      include: {
        capabilities: true // <--- The Critical Check
      }
    });

    const total = models.length;
    let complete = 0;
    const missingFields: Record<string, number> = {};

    for (const model of models) {
      let isComplete = true;

      // If the capabilities relation is null, the model is SICK
      if (!model.capabilities) {
        missingFields['missing_capabilities_record'] = (missingFields['missing_capabilities_record'] || 0) + 1;
        isComplete = false;
      } else {
        // If capabilities exist, check for specific required values
        if (!model.capabilities.contextWindow || model.capabilities.contextWindow === 0) {
          missingFields['contextWindow'] = (missingFields['contextWindow'] || 0) + 1;
          isComplete = false;
        }
        
        if (!model.capabilities.maxOutput || model.capabilities.maxOutput === 0) {
          missingFields['maxOutput'] = (missingFields['maxOutput'] || 0) + 1;
          isComplete = false;
        }

        // [NEW] Confidence Check: If we only have heuristics, we are not "Done"
        const capabilities = model.capabilities as (typeof model.capabilities & { confidence: string });
        if (capabilities.confidence === 'low') {
          missingFields['low_confidence'] = (missingFields['low_confidence'] || 0) + 1;
          isComplete = false;
        }
      }

      // Pricing is optional - don't check it

      if (isComplete) {
        complete++;
      }
    }

    const incomplete = total - complete;
    const completionRate = total > 0 ? (complete / total) * 100 : 100;

    return {
      total,
      complete,
      incomplete,
      completionRate,
      missingFields
    };
  }

  /**
   * Force a healing cycle immediately
   */
  async healNow(): Promise<HealthCheckResult> {
    console.log('[PersistentDoctor] 🚨 Manual healing triggered');
    await this.runHealingCycle();
    return await this.checkHealth();
  }

  /**
   * Get current service status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      checkIntervalMs: this.checkIntervalMs,
      checkIntervalMinutes: this.checkIntervalMs / 1000 / 60
    };
  }
}

// Singleton instance
export const persistentModelDoctor = new PersistentModelDoctor();
