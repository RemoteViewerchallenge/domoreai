import fs from 'fs';
import path from 'path';
import YAML from 'yaml';
import { StrategyEngine } from './StrategyEngine.js';
import { config, isMock, TRACE_DIR } from './config.js';
import { Bandit } from './bandit.js';
import { TaskQueue, Task } from './task-queue.js';
import { eventBus } from './event-bus.js';
import { fileURLToPath } from 'url';

// ensure out dirs exist
fs.mkdirSync(TRACE_DIR, { recursive: true });
const TRACE_FILE = path.join(TRACE_DIR, 'events.jsonl');

function trace(event: any) {
  const line = JSON.stringify({ ts: new Date().toISOString(), ...event }) + '\n';
  fs.appendFileSync(TRACE_FILE, line);
  eventBus.emit(event.event, event);
}

// helper to parse spec (accept JSON object, JSON string, YAML string)
export function parseSpec(input: any) {
  if (!input) return null;
  if (typeof input === 'object') return input;
  if (typeof input === 'string') {
    input = input.trim();
    // try JSON
    try { return JSON.parse(input); } catch {}
    // try YAML
    try { return YAML.parse(input); } catch (e) { throw new Error('Spec parsing failed: input is not valid JSON or YAML'); }
  }
  throw new Error('Spec must be JSON object or string (JSON/YAML)');
}

async function buildComponents() {
  if (isMock()) {
    // local mocks
    const { Retriever } = await import('./retriever.js');
    const { Evaluator } = await import('./evaluator.js');
    const { ModelRegistry } = await import('./model-registry.js');
    return {
      retriever: new Retriever(),
      evaluator: new Evaluator(),
      registry: new ModelRegistry()
    };
  } else {
    // attempt to load prod modules; if missing, error loudly (no silent fallback)
    try {
      // dynamic requires so missing prod files fail here
      // @ts-ignore
      const ProdRegistry = (await import('./prod/model-registry.js')).default;
      // @ts-ignore
      const ProdRetriever = (await import('./prod/retriever.js')).default;
      // @ts-ignore
      const ProdEvaluator = (await import('./prod/evaluator.js')).default;
      return {
        retriever: new ProdRetriever(),
        evaluator: new ProdEvaluator(),
        registry: new ProdRegistry()
      };
    } catch (err) {
      throw new Error('COC_MODE=real requested but production modules under packages/coc/src/prod are missing. Add prod implementations or switch COC_MODE=mock');
    }
  }
}

export async function runDirective(specInput: any, meta: any = {}) {
  const { retriever, evaluator, registry } = await buildComponents();
  const spec = parseSpec(specInput);

  // normalize: spec must be an object with metadata, spec[], policies
  const tasks = spec.spec || [];
  const queue = new TaskQueue();
  const bandit = new Bandit(path.join(process.cwd(), 'out', 'bandit_state.json'));
  const strategyEngine = new StrategyEngine();

  // enqueue
  for (const t of tasks) {
    const task: Task = {
      id: t.id,
      title: t.title,
      role: t.role,
      payloadId: t.payloadId || null,
      promptTemplateId: t.promptTemplateId || `${t.role}.tpl`,
      acceptanceSchema: t.acceptance || null,
      modelHints: t.modelHints || {},
      retries: 0,
      meta: { directive: spec.metadata, specId: spec.metadata?.directive_id }
    };
    queue.enqueue(task);
    const ev = { event: 'task.enqueued', taskId: task.id, role: task.role, specId: spec.metadata?.directive_id };
    trace(ev);
  }

  while (!queue.empty()) {
    const task = await queue.dequeueReady();
    if (!task) break;
    trace({ event: 'task.picked', taskId: task.id, role: task.role });

    // Use Strategy Engine for model selection
    const modelName = strategyEngine.selectModel(task.role);
    
    // Still use bandit for other params if needed, or just log it
    // const arm = bandit.selectArm(task.role); 
    // For now we override the model selection entirely
    const arm = { modelName, id: 'strategy-override', topK: 5 }; 

    trace({ event: 'strategy.selected', taskId: task.id, model: modelName });

    const model = registry.pick({ role: task.role, name: modelName });
    trace({ event: 'model.call.start', taskId: task.id, model: model.name });

    const docs = await retriever.retrieve({ query: task.title, payloadId: task.payloadId, topK: arm.topK || 5 });
    let prompt = renderPrompt(task.promptTemplateId, { directive: task.meta.directive, task, docs, arm });
    // model run
    // we expect mock model.run to always return a consistent object:
    const response = await model.run(prompt);
    trace({ event: 'model.call.end', taskId: task.id, model: model.name });

    const evalResult = await evaluator.evaluate(task, response);
    trace({ event: 'evaluation', taskId: task.id, eval: evalResult });

    bandit.updateArm(arm.id, evalResult.score);
    trace({ event: 'bandit.update', taskId: task.id, armId: arm.id, reward: evalResult.score });

    if (evalResult.score >= (spec.policies?.approval_threshold ?? 0.8)) {
      await retriever.index({ id: task.id, content: response.text, metadata: { taskId: task.id } });
      trace({ event: 'task.done', taskId: task.id, score: evalResult.score, artifacts: response.artifacts || [] });
      // enqueue next roles produced by worker
      for (const nr of (response.nextRoles || [])) {
        const newTask: Task = {
          id: nr.taskId || `${task.id}-child-${Date.now()}`,
          title: nr.title || `Followup for ${task.id}`,
          role: nr.role,
          payloadId: nr.payloadId || response.artifactUri || null,
          promptTemplateId: nr.promptTemplateId || null,
          acceptanceSchema: nr.acceptance || null,
          modelHints: nr.modelHints || {},
          retries: 0,
          meta: { parent: task.id }
        };
        queue.enqueue(newTask);
        trace({ event: 'task.enqueued.followup', parent: task.id, child: newTask.id });
      }
    } else {
      task.retries = (task.retries || 0) + 1;
      if (task.retries <= (spec.policies?.retry_on_failure ?? 2)) {
        queue.requeue(task, { delayMs: 1000 * 5 });
        trace({ event: 'task.requeued', taskId: task.id, retries: task.retries });
      } else {
        const escTask: Task = {
          id: `${task.id}-debug-${Date.now()}`,
          title: `Debug ${task.title}`,
          role: spec.policies?.lead_role || 'department-lead',
          payloadId: task.payloadId,
          promptTemplateId: 'debug.tpl',
          acceptanceSchema: null,
          modelHints: {},
          retries: 0,
          meta: { parent: task.id, reason: 'escalation' }
        };
        queue.enqueue(escTask);
        trace({ event: 'task.escalated', taskId: task.id, escTo: escTask.role });
      }
    }
  }
}

function renderPrompt(templateId: string | null | undefined, ctx: any) {
  const templatePath = path.resolve(process.cwd(), 'agents', 'templates', templateId || '');
  if (!templateId || !fs.existsSync(templatePath)) return JSON.stringify({ ctx }); // safe fallback for mocks
  let tpl = fs.readFileSync(templatePath, 'utf8');
  tpl = tpl.replace(/{{\s*directive\s*}}/g, ctx.directive ? JSON.stringify(ctx.directive) : '');
  tpl = tpl.replace(/{{\s*task\.title\s*}}/g, ctx.task?.title || '');
  return tpl;
}

// CLI smoke-run
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  (async () => {
    console.log(`COC starting (mode=${config.mode}). Traces -> ${TRACE_FILE}`);
    const sampleSpecPath = path.resolve(process.cwd(), 'agents', 'scenarios', 'sample_happy.json');
    const spec = fs.existsSync(sampleSpecPath) ? JSON.parse(fs.readFileSync(sampleSpecPath, 'utf8')) : {
      metadata: { directive_id: 'demo-1', title: 'Demo' },
      spec: [{ id: 'task-1', title: 'create sample', role: 'worker', acceptance: ['includes example'] }],
      policies: { approval_threshold: 0.5, retry_on_failure: 1 }
    };
    try {
      await runDirective(spec);
      console.log('COC run finished. Check out/traces/events.jsonl for the event log.');
    } catch (e) {
      console.error('COC run error:', (e as Error)?.message || e);
    }
  })();
}