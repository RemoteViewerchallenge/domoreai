Generate TypeScript code ONLY. No explanations.

Task: {{task.title}}

Use these functions:
callTool('read_file', { path: 'file.txt' })
callTool('list_files', { path: 'dir' })
callTool('analyze_code', { path: 'file.ts' })
callTool('search_files', { pattern: 'text', path: 'dir' })

Output format:
```ts
callTool('function_name', { argument: 'value' });
```

Code:

