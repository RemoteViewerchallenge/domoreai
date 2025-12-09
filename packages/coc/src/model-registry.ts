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
        // Parse the prompt to understand what tools to call
        let text = 'mock response - completed';
        
        // If the prompt mentions tool calls or is from orchestrator role, generate tool call code
        if (prompt.includes('callTool') || prompt.includes('list_roles') || prompt.includes('get_role') || prompt.includes('create_role')) {
          // Extract task objective from prompt
          if (prompt.includes('List all available roles')) {
            text = '```ts\ncallTool(\'list_roles\', {});\n```';
          } else if (prompt.includes('Create a new test role')) {
            text = '```ts\ncallTool(\'create_role\', { name: \'test_engineer\', category: \'engineering\', basePrompt: \'You are a test engineer responsible for QA tasks\' });\n```';
          } else if (prompt.includes('test_engineer role')) {
            text = '```ts\ncallTool(\'get_role\', { name: \'test_engineer\' });\n```';
          } else {
            // Default tool call for code mode
            text = '```ts\ncallTool(\'list_files\', { path: \'.\' });\n```';
          }
        }
        
        return {
          text,
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