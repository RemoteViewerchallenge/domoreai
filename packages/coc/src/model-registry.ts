// Mock model registry
export class ModelRegistry {
  pick(opts: any) {
    const name = opts?.name || (opts.role === 'planner' ? 'mock-planner' : 'mock-worker');
    return {
      name,
      // generateSpec: returns either JSON object (stringified) or YAML string; we include JSON by default
      async generateSpec(directive: any) {
        // deterministic simple JSON spec for loader reuse
        const spec = {
          metadata: { directive_id: 'spec-1', title: 'Auto spec (mock)' },
          spec: [
            { id: 'task-1', title: 'Create README snippet', role: 'worker', acceptance: ['includes example line'] }
          ],
          policies: { approval_threshold: 0.5, retry_on_failure: 1 }
        };
        // return JSON object (the orchestrator will accept JSON objects)
        return spec;
      },
      async run(prompt: string) {
        // simple deterministic response
        return {
          text: 'mock response - completed',
          nextRoles: [],
          artifacts: [],
          artifactUri: null
        };
      },
      async debugPlan(task: any, resp: any, evalRes: any) {
        return { title: `Debug ${task.id}`, role: 'department-lead', promptTemplateId: 'debug.tpl' };
      }
    };
  }
}