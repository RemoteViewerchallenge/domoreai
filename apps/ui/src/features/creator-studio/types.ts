/**
 * Unified Creator Studio Types
 * * This schema separates 'Orchestration' (Flow) from 'Role' (Identity)
 * while keeping them in a single portable Blueprint.
 */

// --- 1. The Role (Identity & Capability) ---
export type RoleConfig = {
  id: string; // UUID or temporary UI ID
  name: string;
  description: string;
  modelProvider: 'openai' | 'anthropic' | 'mistral' | 'llama' | 'vertex';
  model: string;
  systemPrompt: string;
  temperature: number;
  tools: string[]; // List of tool names (e.g., "web_search", "git_commit")
};

// --- 2. The Orchestration Step (Process & Flow) ---
export type FlowControlConfig = {
  // For 'conditional' / 'judge' nodes
  conditionExpression?: string; // e.g. "output.includes('INVALID')"
  trueTargetId?: string; // Step ID to go to if condition is true
  falseTargetId?: string; // Step ID to go to if condition is false (e.g., loop back)
  
  // For 'parallel' nodes
  parallelGroup?: string;
  
  // For 'loop' nodes
  maxRetries?: number;
};

export type OrchestrationStep = {
  id: string; // Unique Node ID
  label: string; // Display name on canvas
  type: 'agent' | 'judge' | 'manager' | 'router' | 'start' | 'end';
  
  // The Link to the Role (Identity) - Removed for decoupling
  // assignedRoleId?: string;  
  
  // Data Flow (Inputs)
  inputMapping: Record<string, string>; // e.g. { "code": "{{context.step1.output}}" }
  
  // Flow Logic
  flowControl: FlowControlConfig;

  // Visuals (React Flow specific)
  position: { x: number; y: number };
};

// --- 3. The Master Blueprint ---
export type OrchestrationBlueprint = {
  id: string;
  name: string;
  description?: string;
  roles: RoleConfig[]; // Embedded roles specific to this workflow
  steps: OrchestrationStep[]; // The graph nodes
};
