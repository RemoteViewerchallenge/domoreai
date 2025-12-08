// Central tool registry used by the orchestrator to run app tools.
// registerTool(name, fn) to add adapters and runTool(name, args) to execute.
type ToolFn = (args: any) => Promise<any> | any;
const tools: Record<string, ToolFn> = {};

export function registerTool(name: string, fn: ToolFn) {
  tools[name] = fn;
}

export async function runTool(name: string, args: any) {
  const fn = tools[name];
  if (!fn) throw new Error(`Tool not found: ${name}`);
  return await Promise.resolve(fn(args));
}

export function listTools() {
  return Object.keys(tools);
}