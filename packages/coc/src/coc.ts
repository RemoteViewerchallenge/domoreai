#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import { pathToFileURL } from 'url';
import { isMock, getTraceDir, getBanditStatePath } from './config.js';
import { Bandit } from './bandit.js';
import { TaskQueue } from './task-queue.js';

// Dynamic imports based on config mode
let ModelRegistry: any;
let Retriever: any;
let Evaluator: any;

/**
 * Load appropriate implementations based on COC_MODE
 */
async function loadImplementations() {
  if (isMock()) {
    console.log('🎭 Running in MOCK mode (safe for local development)');
    // Use mock implementations
    const modelRegistryModule = await import('./model-registry.js');
    const retrieverModule = await import('./retriever.js');
    const evaluatorModule = await import('./evaluator.js');

    ModelRegistry = modelRegistryModule.ModelRegistry;
    Retriever = retrieverModule.Retriever;
    Evaluator = evaluatorModule.Evaluator;
  } else {
    console.log('🚀 Running in REAL mode (requires production modules)');
    try {
      // Attempt to load production implementations
      const modelRegistryModule = await import('./prod/model-registry.js');
      const retrieverModule = await import('./prod/retriever.js');
      const evaluatorModule = await import('./prod/evaluator.js');

      ModelRegistry = modelRegistryModule.ModelRegistry;
      Retriever = retrieverModule.Retriever;
      Evaluator = evaluatorModule.Evaluator;
    } catch (error) {
      console.error('\n❌ ERROR: Real mode is enabled but production modules are not available.\n');
      console.error('To use real integrations, you must implement:');
      console.error('  - packages/coc/src/prod/model-registry.ts');
      console.error('  - packages/coc/src/prod/retriever.ts');
      console.error('  - packages/coc/src/prod/evaluator.ts');
      console.error('\nEach module should export the same interface as its mock counterpart.');
      console.error('Alternatively, set COC_MODE=mock (or leave unset) to use mock implementations.\n');
      console.error('TODO: Implement production integration modules\n');
      process.exit(1);
    }
  }
}

/**
 * Trace event to JSONL
 */
interface TraceEvent {
  timestamp: string;
  type: string;
  data: unknown;
}

let traceStream: fs.WriteStream | null = null;

/**
 * Initialize trace logging
 */
function initTracing() {
  const traceDir = getTraceDir();
  if (!fs.existsSync(traceDir)) {
    fs.mkdirSync(traceDir, { recursive: true });
  }

  const tracePath = path.join(traceDir, 'events.jsonl');
  traceStream = fs.createWriteStream(tracePath, { flags: 'a' });
  console.log(`📝 Trace logging to: ${tracePath}`);
}

/**
 * Log a trace event
 */
function trace(type: string, data: unknown) {
  const event: TraceEvent = {
    timestamp: new Date().toISOString(),
    type,
    data,
  };

  if (traceStream) {
    traceStream.write(JSON.stringify(event) + '\n');
  }
}

/**
 * COC Orchestrator
 */
class CocOrchestrator {
  private modelRegistry: any;
  private retriever: any;
  private evaluator: any;
  private bandit: Bandit;
  private taskQueue: TaskQueue;

  constructor() {
    this.modelRegistry = new ModelRegistry();
    this.retriever = new Retriever();
    this.evaluator = new Evaluator();

    const modelIds = this.modelRegistry.getModelIds();
    this.bandit = new Bandit(modelIds, getBanditStatePath());
    this.taskQueue = new TaskQueue();

    trace('orchestrator_init', { modelIds, mode: isMock() ? 'mock' : 'real' });
  }

  /**
   * Execute a task with model selection
   */
  async executeTask(taskType: string, input: string): Promise<void> {
    console.log(`\n🎯 Executing task: ${taskType}`);
    trace('task_start', { taskType, input });

    // Enqueue task
    const task = this.taskQueue.enqueue(taskType, { input }, 1);
    trace('task_enqueued', { taskId: task.id });

    // Retrieve context
    console.log('🔍 Retrieving context...');
    const context = await this.retriever.retrieve(input);
    trace('context_retrieved', { taskId: task.id, contextSize: context.length });

    // Select model using bandit
    const selectedModel = this.bandit.selectArm();
    console.log(`🤖 Selected model: ${selectedModel}`);
    trace('model_selected', { taskId: task.id, modelId: selectedModel });

    // Simulate model execution
    const output = `Mock output from ${selectedModel} for input: "${input}"`;
    console.log(`💬 Output: ${output}`);
    trace('model_output', { taskId: task.id, modelId: selectedModel, output });

    // Evaluate output
    console.log('📊 Evaluating output...');
    const evaluation = await this.evaluator.evaluate(input, output);
    console.log(`✅ Score: ${evaluation.score.toFixed(2)} - ${evaluation.feedback}`);
    trace('evaluation_complete', {
      taskId: task.id,
      modelId: selectedModel,
      evaluation,
    });

    // Update bandit with reward (1 if score > 0.8, else 0)
    const reward = evaluation.score > 0.8 ? 1 : 0;
    this.bandit.update(selectedModel, reward);
    trace('bandit_updated', {
      taskId: task.id,
      modelId: selectedModel,
      reward,
      stats: this.bandit.getStats(),
    });

    // Complete task
    this.taskQueue.complete(task.id);
    trace('task_complete', { taskId: task.id });
  }

  /**
   * Print bandit statistics
   */
  printBanditStats() {
    console.log('\n📈 Bandit Statistics:');
    const stats = this.bandit.getStats();
    for (const [modelId, stat] of Object.entries(stats)) {
      console.log(
        `  ${modelId}: ${(stat.winRate * 100).toFixed(1)}% win rate (${stat.trials} trials)`
      );
    }
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    if (traceStream) {
      traceStream.end();
    }
  }
}

/**
 * Main entry point for CLI smoke-run
 */
async function main() {
  console.log('🎬 COC Orchestrator - Chain-Of-Command Scaffold\n');

  // Load implementations based on mode
  await loadImplementations();

  // Initialize tracing
  initTracing();

  // Create orchestrator
  let orchestrator: CocOrchestrator;
  try {
    orchestrator = new CocOrchestrator();
  } catch (error) {
    // Handle production stub errors
    if (error instanceof Error && error.message.includes('Production')) {
      console.error('\n❌ ERROR: Real mode is enabled but production modules are not implemented.\n');
      console.error('To use real integrations, you must implement:');
      console.error('  - packages/coc/src/prod/model-registry.ts');
      console.error('  - packages/coc/src/prod/retriever.ts');
      console.error('  - packages/coc/src/prod/evaluator.ts');
      console.error('\nEach module should export classes with the same interface as their mock counterparts.');
      console.error('Alternatively, set COC_MODE=mock (or leave unset) to use mock implementations.\n');
      console.error('TODO: Implement production integration modules\n');
      process.exit(1);
    }
    throw error;
  }

  try {
    // Run a few sample tasks
    await orchestrator.executeTask('code_review', 'Review the authentication module');
    await orchestrator.executeTask('code_generation', 'Generate a REST API endpoint');
    await orchestrator.executeTask('debugging', 'Fix the memory leak in worker process');

    // Print statistics
    orchestrator.printBanditStats();

    console.log('\n✨ Smoke-run completed successfully!');
    console.log(`📊 Check trace logs at: ${getTraceDir()}/events.jsonl`);
    console.log(`📈 Check bandit state at: ${getBanditStatePath()}\n`);
  } finally {
    orchestrator.cleanup();
  }
}

// Run if executed directly
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { CocOrchestrator };
