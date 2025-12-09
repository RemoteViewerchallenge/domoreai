export class ModelRegistry {
  pick(opts: any) {
    const name = opts?.name || (opts.role === 'planner' ? 'mock-planner' : 'mock-worker');
    return {
      name,
      async generateSpec(directive: string, meta?: any) {
        // Return a tiny YAML spec used by orchestrator
        return `metadata:\n  directive_id: "spec-1"\n  title: "Auto spec"\nspec:\n  - id: task-1\n    title: "Create README snippet"\n    role: worker\n    acceptance:\n      - "includes example line"\npolicies:\n  approval_threshold: 0.5\n`;
      },
      async run(prompt: string) {
        return {
          text: 'mock response - completed',
          nextRoles: [] as Array<{taskId?: string; title?: string; role: string; payloadId?: string; promptTemplateId?: string; acceptance?: any; modelHints?: any}>,
          artifacts: [],
          artifactUri: null,
        };
      },
      async debugPlan(task: any, resp: any, evalRes: any) {
        return { title: `Debug ${task.id}`, role: 'department-lead', promptTemplateId: 'debug.tpl' };
      }
    };
  }
}
