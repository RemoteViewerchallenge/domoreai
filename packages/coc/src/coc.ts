// Updated COC orchestrator with delayed role-credit bookkeeping.
// Key additions:
// - parentRouteLookup: map childTaskId -> { parentTaskId, parentRole, parentArmId }
// - when enqueueing followups (either worker-provided or arm-suggested) we record the mapping
// - when a child task completes we update roleBandit for the parent arm with the child's eval score
//
// This file is intended to replace the previous packages/coc/src/coc.ts in the coc/scaffold branch.
import fs from 'fs';
import path from 'path';
import YAML from 'yaml';
import { config, isMock, TRACE_DIR } from './config';
import { TaskQueue, Task } from './task-queue';
import { eventBus } from './event-bus';
import { ModelBandit } from './model-bandit_Version2';
import { RoleBanditV2 } from './role-bandit-v2';
import './real-tools'; // Register all tools
import { getRoleRequirements, scoreModelForRole } from './role-requirements';
import { executeCodeAndRunTools } from './code-executors';

const TRACE_FILE = path.join(TRACE_DIR, 'events.jsonl');
fs.mkdirSync(TRACE_DIR, { recursive: true });

function trace(event: any) {
  const line = JSON.stringify({ ts: new Date().toISOString(), ...event }) + '\n';
  fs.appendFileSync(TRACE_FILE, line);
  eventBus.emit(event.event, event);
}

export function parseSpec(input: any) {
  if (!input) return null;
  if (typeof input === 'object') return input;
  if (typeof input === 'string') {
    input = input.trim();
    try { return JSON.parse(input); } catch {}
    try { return YAML.parse(input); } catch (e) { throw new Error('Spec parsing failed: input is not valid JSON or YAML'); }
  }
  throw new Error('Spec must be JSON object or string (JSON/YAML)');
}

async function buildComponents() {
  if (isMock()) {
    const RetrieverModule = await import('./retriever');
    const EvaluatorModule = await import('./evaluator');
    const RegistryModule = await import('./model-registry');
    return { 
      retriever: new RetrieverModule.Retriever(), 
      evaluator: new EvaluatorModule.Evaluator(), 
      registry: new RegistryModule.ModelRegistry() 
    };
  } else {
    try {
      // Use the new production registry with rate limit tracking
      const prodRegistryPath = path.resolve(process.cwd(), 'packages', 'coc', 'src', 'model-registry.prod.js');
      let RegistryCtor;
      
      if (fs.existsSync(prodRegistryPath)) {
        console.log('[COC] Using production model registry with rate limit tracking');
        RegistryCtor = require('./model-registry.prod').ModelRegistry;
      } else {
        // Fallback to the old real registry (Ollama simulation)
        console.warn('[COC] Production registry not found, falling back to simulation');
        RegistryCtor = require('./model-registry.real').ModelRegistry;
      }
      
      const ProdRetriever = require('./prod/retriever').default;
      const ProdEvaluator = require('./prod/evaluator').default;
      return {
        retriever: new ProdRetriever(),
        evaluator: new ProdEvaluator(),
        registry: new RegistryCtor()
      };
    } catch (err) {
      console.error('[COC] Real mode initialization error:', err);
      throw new Error('COC_MODE=real requested but production modules are missing. Add packages/coc/src/prod/{model-registry,retriever,evaluator}.ts or use COC_MODE=mock');
    }
  }
}

type ParentRouteInfo = { parentTaskId: string; parentRole: string; parentArmId: string };

export async function runDirective(specInput: any, meta: any = {}) {
  const { retriever, evaluator, registry } = await buildComponents();
  const spec = parseSpec(specInput);
  const tasks = spec.spec || [];
  const queue = new TaskQueue();

  // instantiate bandits and seed from real data
  const modelBandit = new ModelBandit(path.join(process.cwd(), 'out', 'model_bandit_state.json'));
  const roleBandit = new RoleBanditV2(path.join(process.cwd(), 'out', 'role_bandit_state.json'));

  // Load real models from apps/api/latest_models/models.json
  const modelsPath = path.resolve(process.cwd(), '..', '..', 'apps', 'api', 'latest_models', 'models.json');
  let realModels: any[] = [];
  if (fs.existsSync(modelsPath)) {
    try {
      const modelsData = JSON.parse(fs.readFileSync(modelsPath, 'utf8'));
      realModels = Array.isArray(modelsData) ? modelsData : modelsData.models || [];
    } catch (e) { console.warn('Failed to load models.json:', e); }
  }

  // Load real roles from agents/roles.json
  const rolesPath = path.resolve(process.cwd(), 'agents', 'roles.json');
  let roles: string[] = [];
  if (fs.existsSync(rolesPath)) {
    try {
      const obj = JSON.parse(fs.readFileSync(rolesPath, 'utf8'));
      roles = Array.isArray(obj.roles) ? obj.roles : [];
    } catch (e) { roles = []; }
  }
  if (roles.length === 0) roles = ['worker', 'department-lead', 'test-writer', 'librarian', 'judge'];

  // Seed role bandit from real roles file
  roleBandit.seedFromRolesFile(rolesPath);

  // Seed model bandit with real free models from models.json
  // Use role requirements to intelligently select appropriate models
  const freeModels = realModels.filter(m => m.is_free);
  console.log(`[COC] Found ${freeModels.length} free models to seed bandits`);
  
  for (const r of roles) {
    const requirements = getRoleRequirements(r);
    
    // Score and filter models based on role requirements
    const scoredModels = freeModels
      .map(m => ({
        model: m,
        score: scoreModelForRole(
          m.context_window || 4096,
          {
            supportsCoding: true, // Most modern models support coding
            supportsTools: true,  // Most support function calling
            supportsVision: m.model_id.includes('vision') || m.model_id.includes('gpt-4'),
            supportsTTS: m.model_id.includes('tts') || m.model_id.includes('playai')
          },
          requirements
        )
      }))
      .filter(sm => sm.score > 0) // Only include compatible models
      .sort((a, b) => b.score - a.score); // Best matches first
    
    // Take top 10 models, with some randomization to avoid bias
    const topModels = scoredModels.slice(0, 15);
    const shuffled = [...topModels].sort(() => Math.random() - 0.5);
    const selectedModels = shuffled.slice(0, 10);
    
    const arms = selectedModels.map(sm => ({
      id: `${r}-model-${sm.model.provider}-${sm.model.model_id}`,
      modelName: sm.model.model_id,
      promptTemplate: `${r}.tpl`,
      topK: 5,
      meta: { 
        provider: sm.model.provider, 
        contextWindow: sm.model.context_window, 
        isFree: sm.model.is_free,
        requirementScore: sm.score,
        roleRequirements: {
          minContext: requirements.minContext,
          maxContext: requirements.maxContext,
          needsCoding: requirements.needsCoding,
          needsTools: requirements.needsTools
        }
      }
    }));
    
    if (arms.length > 0) {
      console.log(`[COC] Seeding ${r} (${requirements.minContext}-${requirements.maxContext} ctx, tools:${requirements.needsTools}) with ${arms.length} models:`, arms.map(a => `${a.modelName}(${a.meta.requirementScore})`).join(', '));
      modelBandit.ensureRoleArms(r, arms);
    } else {
      console.warn(`[COC] No compatible models found for role ${r}!`);
    }
  }

  // parent->route mapping (in-memory). Structure: childTaskId -> ParentRouteInfo
  const parentRouteLookup: Record<string, ParentRouteInfo> = {};

  // enqueue initial tasks
  for (const t of tasks) {
    const task: Task = {
      id: t.id,
      title: t.title,
      role: t.role,
      mode: t.mode || 'text',  // default to 'text' mode if not specified
      payloadId: t.payloadId || null,
      promptTemplateId: t.promptTemplateId || `${t.role}.tpl`,
      acceptanceSchema: t.acceptance || null,
      modelHints: t.modelHints || {},
      retries: 0,
      meta: { directive: spec.metadata, specId: spec.metadata?.directive_id }
    };
    queue.enqueue(task);
    trace({ event: 'task.enqueued', taskId: task.id, role: task.role, mode: task.mode, specId: spec.metadata?.directive_id });
  }

  // helper: record parent-route relationship for a child
  function recordParentRoute(childTaskId: string, parentTaskId: string, parentRole: string, parentArmId: string) {
    parentRouteLookup[childTaskId] = { parentTaskId, parentRole, parentArmId };
    trace({ event: 'parent.route.recorded', childTaskId, parentTaskId, parentRole, parentArmId });
  }

  // main worker loop
  while (!queue.empty()) {
    const task = await queue.dequeueReady();
    if (!task) break;
    trace({ event: 'task.picked', taskId: task.id, role: task.role });

    const modelArm = await modelBandit.selectArm(task.role);
    const routeArm = roleBandit.selectArm(task.role);
    trace({ event: 'bandit.model.selected', taskId: task.id, arm: modelArm, simulatedModel: modelArm.modelName });
    trace({ event: 'bandit.role.selected', taskId: task.id, arm: routeArm, simulatedRole: routeArm.nextRole });

    const model = registry.pick({ role: task.role, name: modelArm.modelName });
    trace({ event: 'model.call.start', taskId: task.id, model: model.name, simulatedModel: modelArm.modelName });

    const docs = await retriever.retrieve({ query: task.title, payloadId: task.payloadId, topK: modelArm.topK || 5 });
    const promptTemplate = task.promptTemplateId || modelArm.promptTemplate || 'default.tpl';
    let prompt = renderPrompt(promptTemplate, { directive: task.meta.directive, task, docs, arm: modelArm, routeHints: routeArm });
    
    // Log the actual prompt being sent for code-mode tasks
    if (task.mode === 'code') {
      trace({ event: 'prompt.rendered', taskId: task.id, promptPreview: prompt.substring(0, 800), templateId: promptTemplate });
    }

    const response = await model.run(prompt);
    trace({ event: 'model.call.end', taskId: task.id, model: model.name });

    // If task mode is 'code', execute tool calls from the response
    let toolResults: any[] = [];
    if (task.mode === 'code' && response.text) {
      trace({ event: 'tool.execution.start', taskId: task.id, mode: 'code', responsePreview: response.text.substring(0, 500) });
      try {
        toolResults = await executeCodeAndRunTools(response.text);
        for (const tr of toolResults) {
          trace({ 
            event: tr.error ? 'tool.error' : 'tool.result', 
            taskId: task.id, 
            toolName: tr.tool, 
            args: tr.args, 
            result: tr.result,
            error: tr.error 
          });
        }
        trace({ event: 'tool.execution.end', taskId: task.id, toolCount: toolResults.length, hadToolCalls: toolResults.length > 0 });
      } catch (e) {
        trace({ event: 'tool.execution.error', taskId: task.id, error: String(e) });
      }
    }

    const evalResult = await evaluator.evaluate(task, response);
    trace({ event: 'evaluation', taskId: task.id, eval: evalResult });

    // update model bandit immediately
    modelBandit.updateArm(task.role, modelArm.id, evalResult.score);
    trace({ event: 'bandit.model.update', taskId: task.id, armId: modelArm.id, reward: evalResult.score });

    // for role bandit we prefer delayed credit: if this task was itself a child for a parent route,
    // propagate reward back to the parent arm
    const parentInfo = parentRouteLookup[task.id];
    if (parentInfo) {
      // propagate child eval score back to parent route arm
      roleBandit.updateArm(parentInfo.parentRole, parentInfo.parentArmId, evalResult.score);
      trace({ event: 'bandit.role.delayed_update', taskId: task.id, parentTaskId: parentInfo.parentTaskId, armId: parentInfo.parentArmId, reward: evalResult.score });
      // option: delete mapping if you only want one-time credit
      delete parentRouteLookup[task.id];
    } else {
      // no recorded parent route — optionally update role bandit immediately for the task's role (initial behavior)
      roleBandit.updateArm(task.role, routeArm.id, evalResult.score);
      trace({ event: 'bandit.role.update', taskId: task.id, armId: routeArm.id, reward: evalResult.score });
    }

    if (evalResult.score >= (spec.policies?.approval_threshold ?? 0.8)) {
      await retriever.index({ id: task.id, content: response.text, metadata: { taskId: task.id } });
      trace({ event: 'task.done', taskId: task.id, score: evalResult.score, artifacts: response.artifacts || [] });

      // enqueue nextRoles from model response: record parent->route mapping so children credit parent route arm
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
        // record child -> parent route mapping using the routeArm chosen for the parent
        recordParentRoute(newTask.id, task.id, task.role, routeArm.id);
        trace({ event: 'task.enqueued.followup', parent: task.id, child: newTask.id });
      }

      // also consider route-arm-generated suggestions (the bandit suggested routeArm.nextRole)
      if (routeArm.nextRole) {
        const newTask: Task = {
          id: `${task.id}-hint-${routeArm.nextRole}-${Date.now()}`,
          title: `Handoff to ${routeArm.nextRole} for ${task.id}`,
          role: routeArm.nextRole,
          payloadId: null,
          promptTemplateId: undefined,
          acceptanceSchema: null,
          modelHints: {},
          retries: 0,
          meta: { parent: task.id, derivedFromRouteHint: true }
        };
        queue.enqueue(newTask);
        recordParentRoute(newTask.id, task.id, task.role, routeArm.id);
        trace({ event: 'task.enqueued.routehint', parent: task.id, child: newTask.id, nextRole: routeArm.nextRole });
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

function renderPrompt(templateId: string | undefined, ctx: any) {
  const templatePath = path.resolve(process.cwd(), 'agents', 'templates', templateId || '');
  if (!templateId || !fs.existsSync(templatePath)) return JSON.stringify({ ctx });
  let tpl = fs.readFileSync(templatePath, 'utf8');
  tpl = tpl.replace(/{{\s*directive\s*}}/g, ctx.directive ? JSON.stringify(ctx.directive) : '');
  tpl = tpl.replace(/{{\s*task\.title\s*}}/g, ctx.task?.title || '');
  if (ctx.routeHints) {
    tpl += `\n\n// RouteHints: ${JSON.stringify(ctx.routeHints)}`;
  }
  return tpl;
}

// CLI smoke-run (unchanged behavior)
if (require.main === module) {
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