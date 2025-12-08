// Minimal orchestrator skeleton - adapt to your model-registry & queue
import YAML from "yaml";
import { ModelRegistry } from "../model-registry"; // your registry
import { TaskQueue, Task } from "../task-queue";
import { Retriever } from "../retriever";
import { Evaluator } from "../evaluator";
import { Trace } from "../trace";

const registry = new ModelRegistry();
const queue = new TaskQueue();
const retriever = new Retriever();
const evaluator = new Evaluator();

export async function runDirective(directiveText: string, metadata: any) {
  // 1) Planner
  const planner = registry.pick({ role: "planner", tier: "large" });
  const specYaml = await planner.generateSpec(directiveText, metadata); // returns YAML string
  const spec = YAML.parse(specYaml);

  // 2) Enqueue tasks
  for (const t of spec.spec || []) {
    const task: Task = {
      id: t.id,
      title: t.title,
      role: t.role,
      deps: t.deps || [],
      promptTemplate: `templates/${t.role}.tpl`,
      acceptance: t.acceptance || [],
      retries: 0,
    };
    queue.enqueue(task);
  }

  // 3) Worker loop
  while (!queue.empty()) {
    const task = await queue.dequeueReady();
    if (!task) { await sleep(300); continue; }

    const model = registry.pick({ role: task.role, context: "short" });
    const docs = await retriever.retrieve({ query: task.title, repo: metadata.repo, topK: 5 });

    const prompt = renderPrompt(task.promptTemplate, { directive: directiveText, task, context: docs });
    await Trace.log({ event: "task.started", taskId: task.id, model: model.name });

    const resp = await model.run(prompt);
    const evalResult = await evaluator.evaluate(task, resp);

    await Trace.log({ event: "task.completed", taskId: task.id, eval: evalResult });

    if (evalResult.score >= spec.policies.approval_threshold) {
      await retriever.index({ id: task.id, content: resp.text, metadata: { taskId: task.id } });
      queue.markDone(task);
    } else {
      task.retries = (task.retries || 0) + 1;
      if (task.retries <= spec.policies.retry_on_failure) {
        queue.requeue(task);
      } else {
        // escalate: create debug task for department lead
        const leadModel = registry.pick({ role: "department-lead" });
        const debugPlan = await leadModel.debugPlan(task, resp, evalResult);
        queue.enqueue({ ...debugPlan, id: `${task.id}-debug` });
      }
    }
  }
}

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }
function renderPrompt(templatePath: string, ctx: any) {
  // load + simple templating - replace tokens like {{directive}} in template
  return "TODO: implement render (use mustache/handlebars)";
}