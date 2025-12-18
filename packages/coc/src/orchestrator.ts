// Legacy orchestrator skeleton - not actively used
// Main COC logic is in coc.ts
import { ModelRegistry } from "./model-registry.js";
import { TaskQueue } from "./task-queue.js";
import { Retriever } from "./retriever.js";
import { Evaluator } from "./evaluator.js";

const registry = new ModelRegistry();
const queue = new TaskQueue();
const retriever = new Retriever();
const evaluator = new Evaluator();

export async function runDirective(_directiveText: string) {
  // Legacy example - see coc.ts for actual implementation
  console.log("Legacy orchestrator - use coc.ts instead");
  return { status: "deprecated" };
}
