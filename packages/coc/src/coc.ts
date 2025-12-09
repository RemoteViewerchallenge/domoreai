/**
 * COC (Chain-Of-Command) Orchestrator
 * 
 * Main orchestrator implementing the runDirective flow:
 * 1. Ingest JSON/YAML spec
 * 2. Enqueue tasks
 * 3. Workers pick tasks
 * 4. Execute model.run(prompt)
 * 5. Evaluate results
 * 6. Index artifacts
 * 7. Trace events
 * 8. Handle retries/escalation
 * 9. Allow worker-provided nextRoles to enqueue followups
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import { config } from './config.js';
import { eventBus } from './event-bus.js';
import { Bandit } from './bandit.js';
import { TaskQueue, Task, TaskStatus } from './task-queue.js';
import { ModelRegistry } from './model-registry.js';
import { Retriever } from './retriever.js';
import { Evaluator } from './evaluator.js';

// Dynamic import for production modules
async function buildComponents() {
  if (config.isReal) {
    // Attempt to load production modules
    const prodPath = path.join(path.dirname(new URL(import.meta.url).pathname), 'prod');
    
    try {
      const { ModelRegistry: ProdModelRegistry } = await import(`${prodPath}/model-registry.js`);
      const { Retriever: ProdRetriever } = await import(`${prodPath}/retriever.js`);
      const { Evaluator: ProdEvaluator } = await import(`${prodPath}/evaluator.js`);
      
      return {
        modelRegistry: new ProdModelRegistry(),
        retriever: new ProdRetriever(),
        evaluator: new ProdEvaluator(),
      };
    } catch (error) {
      console.error('\n❌ ERROR: COC_MODE=real but production modules not found!\n');
      console.error('To use real mode, you must:');
      console.error('  1. Create packages/coc/src/prod/ directory');
      console.error('  2. Add production implementations:');
      console.error('     - packages/coc/src/prod/model-registry.ts');
      console.error('     - packages/coc/src/prod/retriever.ts');
      console.error('     - packages/coc/src/prod/evaluator.ts');
      console.error('\nOr switch back to mock mode: COC_MODE=mock\n');
      process.exit(1);
    }
  }
  
  // Use mock implementations
  return {
    modelRegistry: new ModelRegistry(),
    retriever: new Retriever(),
    evaluator: new Evaluator(),
  };
}

export interface DirectiveSpec {
  id: string;
  description: string;
  tasks: Array<{
    id: string;
    role: string;
    prompt: string;
    maxRetries?: number;
    metadata?: Record<string, any>;
  }>;
  policies?: {
    maxRetries?: number;
    retryDelayMs?: number;
    escalationThreshold?: number;
  };
}

/**
 * Trace event to JSONL
 */
function writeTraceEvent(event: any): void {
  const traceFile = path.join(config.traceDir, 'events.jsonl');
  
  // Ensure directory exists
  if (!fs.existsSync(config.traceDir)) {
    fs.mkdirSync(config.traceDir, { recursive: true });
  }
  
  const line = JSON.stringify(event) + '\n';
  fs.appendFileSync(traceFile, line, 'utf-8');
  
  // Publish trace event to event bus
  eventBus.publish({
    type: 'trace.event',
    timestamp: event.timestamp,
    data: event,
  });
}

/**
 * Parse spec from JSON or YAML
 */
function parseSpec(content: string, format: 'json' | 'yaml' = 'json'): DirectiveSpec {
  if (format === 'yaml') {
    return yaml.parse(content);
  }
  return JSON.parse(content);
}

/**
 * Render prompt with template
 */
function renderPrompt(template: string, variables: Record<string, any>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'g'), String(value));
  }
  return result;
}

/**
 * Run a directive
 */
export async function runDirective(spec: DirectiveSpec): Promise<void> {
  console.log(`\n🚀 Starting directive: ${spec.id}`);
  console.log(`   Mode: ${config.mode.toUpperCase()}`);
  console.log(`   Description: ${spec.description}`);
  
  // Initialize components
  const { modelRegistry, retriever, evaluator } = await buildComponents();
  const taskQueue = new TaskQueue();
  const bandit = Bandit.loadState(config.banditPath);
  
  // Register models with bandit
  const models = modelRegistry.getModels();
  models.forEach((model: string) => bandit.registerArm(model));
  
  // Trace directive start
  writeTraceEvent({
    type: 'directive.started',
    timestamp: new Date().toISOString(),
    directiveId: spec.id,
    mode: config.mode,
    taskCount: spec.tasks.length,
  });
  
  // Enqueue initial tasks
  for (const taskSpec of spec.tasks) {
    const task: Task = {
      id: taskSpec.id,
      role: taskSpec.role,
      prompt: taskSpec.prompt,
      status: 'queued',
      retries: 0,
      maxRetries: taskSpec.maxRetries ?? spec.policies?.maxRetries ?? 3,
      createdAt: new Date().toISOString(),
      metadata: taskSpec.metadata,
    };
    
    taskQueue.enqueue(task);
    
    await eventBus.publish({
      type: 'task.queued',
      timestamp: new Date().toISOString(),
      data: { taskId: task.id, role: task.role },
    });
    
    writeTraceEvent({
      type: 'task.queued',
      timestamp: new Date().toISOString(),
      taskId: task.id,
      role: task.role,
    });
  }
  
  // Process tasks
  while (taskQueue.size() > 0 || taskQueue.getTasksByStatus('running').length > 0) {
    const task = taskQueue.dequeue();
    if (!task) {
      // Wait for running tasks
      await new Promise(resolve => setTimeout(resolve, 100));
      continue;
    }
    
    console.log(`\n📋 Processing task: ${task.id} (role: ${task.role})`);
    
    await eventBus.publish({
      type: 'task.started',
      timestamp: new Date().toISOString(),
      data: { taskId: task.id },
    });
    
    writeTraceEvent({
      type: 'task.started',
      timestamp: new Date().toISOString(),
      taskId: task.id,
    });
    
    try {
      // Select model using bandit
      const model = bandit.selectArm();
      console.log(`   Using model: ${model}`);
      
      // Execute model
      const response = await modelRegistry.run(model, task.prompt);
      console.log(`   Response: ${response.content.substring(0, 100)}...`);
      
      task.result = response;
      
      // Evaluate result
      const evaluation = await evaluator.evaluate(task.id, response);
      console.log(`   Evaluation: ${evaluation.passed ? '✅ PASSED' : '❌ FAILED'} (score: ${evaluation.score.toFixed(2)})`);
      
      await eventBus.publish({
        type: 'evaluation.complete',
        timestamp: new Date().toISOString(),
        data: { taskId: task.id, evaluation },
      });
      
      writeTraceEvent({
        type: 'evaluation.complete',
        timestamp: new Date().toISOString(),
        taskId: task.id,
        score: evaluation.score,
        passed: evaluation.passed,
      });
      
      // Update bandit with reward
      bandit.update(model, evaluation.score);
      
      if (evaluation.passed) {
        // Index artifact
        await retriever.index({
          id: `artifact-${task.id}`,
          content: response.content,
          metadata: {
            taskId: task.id,
            role: task.role,
            model,
            score: evaluation.score,
          },
        });
        
        await eventBus.publish({
          type: 'artifact.indexed',
          timestamp: new Date().toISOString(),
          data: { taskId: task.id, artifactId: `artifact-${task.id}` },
        });
        
        writeTraceEvent({
          type: 'artifact.indexed',
          timestamp: new Date().toISOString(),
          taskId: task.id,
          artifactId: `artifact-${task.id}`,
        });
        
        taskQueue.updateTask(task.id, 'completed', { result: response });
        
        await eventBus.publish({
          type: 'task.completed',
          timestamp: new Date().toISOString(),
          data: { taskId: task.id },
        });
        
        writeTraceEvent({
          type: 'task.completed',
          timestamp: new Date().toISOString(),
          taskId: task.id,
        });
      } else {
        throw new Error(evaluation.feedback);
      }
      
    } catch (error) {
      console.error(`   ❌ Task failed: ${error instanceof Error ? error.message : String(error)}`);
      
      taskQueue.updateTask(task.id, 'failed', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      
      await eventBus.publish({
        type: 'task.failed',
        timestamp: new Date().toISOString(),
        data: { taskId: task.id, error: error instanceof Error ? error.message : String(error) },
      });
      
      writeTraceEvent({
        type: 'task.failed',
        timestamp: new Date().toISOString(),
        taskId: task.id,
        error: error instanceof Error ? error.message : String(error),
        retries: task.retries,
      });
      
      // Retry if under max retries
      if (task.retries < task.maxRetries) {
        console.log(`   🔄 Retrying task (attempt ${task.retries + 1}/${task.maxRetries})`);
        
        const retryDelayMs = spec.policies?.retryDelayMs ?? 1000;
        await new Promise(resolve => setTimeout(resolve, retryDelayMs));
        
        taskQueue.retry(task.id);
        
        await eventBus.publish({
          type: 'task.retried',
          timestamp: new Date().toISOString(),
          data: { taskId: task.id, attempt: task.retries },
        });
        
        writeTraceEvent({
          type: 'task.retried',
          timestamp: new Date().toISOString(),
          taskId: task.id,
          attempt: task.retries,
        });
      }
    }
  }
  
  // Save bandit state
  bandit.saveState(config.banditPath);
  
  // Trace directive complete
  writeTraceEvent({
    type: 'directive.completed',
    timestamp: new Date().toISOString(),
    directiveId: spec.id,
  });
  
  console.log(`\n✅ Directive completed: ${spec.id}\n`);
}

/**
 * CLI Smoke Run
 * Executes when this file is run directly
 */
async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  COC Orchestrator - Smoke Run');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  Mode: ${config.mode.toUpperCase()}`);
  if (config.isMock) {
    console.log(`  Mock Seed: ${config.mockSeed}`);
    console.log(`  Mock Failure Rate: ${config.mockInjectFailureRate}`);
    console.log(`  Mock Latency: ${config.mockLatencyMs}ms`);
  }
  console.log('═══════════════════════════════════════════════════════\n');
  
  // Try to load sample scenario
  const scenarioPath = path.join(config.repoRoot, 'agents', 'scenarios', 'sample_happy.json');
  let spec: DirectiveSpec;
  
  if (fs.existsSync(scenarioPath)) {
    console.log(`📄 Loading scenario from: ${scenarioPath}`);
    const content = fs.readFileSync(scenarioPath, 'utf-8');
    spec = parseSpec(content, 'json');
  } else {
    console.log('📄 Using inline demo spec (sample_happy.json not found)');
    spec = {
      id: 'demo-directive-1',
      description: 'Demo directive for smoke test',
      tasks: [
        {
          id: 'task-1',
          role: 'worker',
          prompt: 'Analyze the system status and provide recommendations.',
        },
        {
          id: 'task-2',
          role: 'reviewer',
          prompt: 'Review the analysis and provide feedback.',
        },
      ],
      policies: {
        maxRetries: 2,
        retryDelayMs: 500,
      },
    };
  }
  
  await runDirective(spec);
  
  console.log(`\n📊 Trace written to: ${path.join(config.traceDir, 'events.jsonl')}`);
  console.log(`📊 Bandit state saved to: ${config.banditPath}\n`);
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
