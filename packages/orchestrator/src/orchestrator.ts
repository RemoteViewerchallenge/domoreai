// Minimal orchestrator - drop into packages/orchestrator/src
import fs from 'fs';
import path from 'path';
import YAML from 'yaml';

import { ModelRegistry } from './model-registry';
import { Retriever } from './retriever';
import { TaskQueue, Task } from './task-queue';
import { Evaluator } from './evaluator';
import { Bandit } from './bandit';

const TRACE_DIR = path.resolve(process.cwd(), 'out', 'traces');
fs.mkdirSync(TRACE_DIR, { recursive: true });

const registry = new ModelRegistry();
const retriever = new Retriever();
const queue = new TaskQueue();
const evaluator = new Evaluator();
const bandit = new Bandit(path.resolve(process.cwd(), 'out', 'bandit_state.json'));

function trace(event: any) {
  const line = JSON.stringify({ ts: new Date().toISOString(), ...event }) + '\n';
  fs.appendFileSync(path.join(TRACE_DIR, 'events.jsonl'), line);
}

export async function runDirective(directive: string, meta: any = {}) {
  const planner = registry.pick({ role: 'planner', context: 'large' });
  const specYaml = await planner.generateSpec(directive, meta);
  const spec = YAML.parse(specYaml);

  for (const t of spec.spec || []) {
    const task: Task = {
      id: t.id,
      title: t.title,
      role: t.role,
      payloadId: t.payloadId || null,
      promptTemplateId: t.promptTemplateId || `${t.role}.tpl`,
      acceptanceSchema: t.acceptance || null,
      modelHints: t.modelHints || {},
      retries: 0,
      meta: { directive, specId: spec.metadata?.directive_id || null },
    };
    queue.enqueue(task);
    trace({ event: 'task.enqueued', taskId: task.id, role: task.role });
  }

  while (!queue.empty()) {
    const task = await queue.dequeueReady();
    if (!task) { await sleep(200); continue; }

    trace({ event: 'task.picked', taskId: task.id, role: task.role });
    const arm = bandit.selectArm(task.role);
    trace({ event: 'strategy.selected', taskId: task.id, arm });

    const model = registry.pick({ role: task.role, name: arm.modelName, context: arm.context || 'short' });
    const docs = await retriever.retrieve({ query: task.title, payloadId: task.payloadId, topK: arm.topK || 5 });

    const prompt = renderPrompt(task.promptTemplateId, { directive: task.meta.directive, task, docs, arm });

    trace({ event: 'model.call.start', taskId: task.id, model: model.name });
    const response = await model.run(prompt);
    trace({ event: 'model.call.end', taskId: task.id, model: model.name });

    const evalResult = await evaluator.evaluate(task, response);
    trace({ event: 'evaluation', taskId: task.id, eval: evalResult });

    bandit.updateArm(arm.id, evalResult.score);

    if (evalResult.score >= (spec.policies?.approval_threshold ?? 0.8)) {
      await retriever.index({ id: task.id, content: response.text, metadata: { taskId: task.id } });
      trace({ event: 'task.done', taskId: task.id, score: evalResult.score });
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
          meta: { parent: task.id },
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
          meta: { parent: task.id, reason: 'escalation' },
        };
        queue.enqueue(escTask);
        trace({ event: 'task.escalated', taskId: task.id, escTo: escTask.role });
      }
    }
  }
}

function renderPrompt(templateId: string | null | undefined, ctx: any) {
  if (!templateId) return JSON.stringify({ ctx });
  const p = path.resolve(process.cwd(), 'agents', 'templates', templateId);
  if (!fs.existsSync(p)) return JSON.stringify({ ctx });
  let tpl = fs.readFileSync(p, 'utf8');
  tpl = tpl.replace(/{{\s*directive\s*}}/g, ctx.directive || '');
  tpl = tpl.replace(/{{\s*task\.title\s*}}/g, ctx.task?.title || '');
  return tpl;
}

function sleep(ms: number) { 
  return new Promise(r => setTimeout(r, ms)); 
}

// Allow CLI run for quick smoke
if (require.main === module) {
  (async () => {
    console.log('Starting local orchestrator smoke run...');
    await runDirective('Create a minimal sample feature that demonstrates dynamic handoffs', {});
    console.log('Run complete (or ended).');
  })();
}
