export interface Tool {
  id: string;
  name: string;
  description: string;
  instruction: string; // Tool Prompt
  schema: string;
  isEnabled: boolean;
  serverId?: string;
  implementation?: string;
}

export interface Model {
  id: string;
  name: string;
  providerId: string;
  providerLabel?: string;
  contextWindow?: number;
  specs?: {
    contextWindow?: number;
    hasVision?: boolean;
    hasReasoning?: boolean;
    hasImageGen?: boolean;
    maxOutput?: number;
  };
}

export interface Role {
  id: string;
  name: string;
  basePrompt: string;
  description?: string;
  categoryId?: string;
  categoryString?: string;
  // Category object is purely optional for display
  category?: { id: string; name: string };
  
  // Flattened tools for UI (references by name or ID)
  tools?: string[]; 
  
  // Metadata Configuration
  minContext?: number;
  maxContext?: number;
  needsVision?: boolean;
  needsReasoning?: boolean;
  needsCoding?: boolean;
  needsTools?: boolean;
  needsJson?: boolean;
  needsUncensored?: boolean;
  needsImageGeneration?: boolean;
  
  defaultTemperature?: number;
  defaultMaxTokens?: number;
  defaultTopP?: number;
  defaultFrequencyPenalty?: number;
  defaultPresencePenalty?: number;
  defaultStop?: string[];
  defaultSeed?: number;
  defaultResponseFormat?: 'text' | 'json_object';
  
  terminalRestrictions?: {
      mode: 'whitelist' | 'blacklist' | 'unrestricted';
      commands: string[];
  };
  
  criteria?: Record<string, unknown>;
  orchestrationConfig?: {
      requiresCheck: boolean;
      judgeRoleId?: string;
      minPassScore: number;
  };
  memoryConfig?: {
      useProjectMemory: boolean;
      readOnly: boolean;
  };

  currentModel?: string; // Resolved model name
  scope?: string;
}

export interface CategoryNode {
  id: string;
  name: string;
  parentId?: string;
  children: CategoryNode[];
  roles: Role[];
}

export interface RoleFormState {
  name: string;
  basePrompt: string;
  category: string;
  minContext: number;
  maxContext: number;
  needsVision: boolean;
  needsReasoning: boolean;
  needsCoding: boolean;
  needsTools: boolean;
  needsJson: boolean;
  needsUncensored: boolean;
  needsImageGeneration: boolean;
  tools: string[];
  defaultTemperature: number;
  defaultMaxTokens: number;
  defaultTopP: number;
  defaultFrequencyPenalty: number;
  defaultPresencePenalty: number;
  defaultStop: string[];
  defaultSeed?: number;
  defaultResponseFormat: 'text' | 'json_object';
  terminalRestrictions: { mode: 'whitelist' | 'blacklist' | 'unrestricted'; commands: string[] };
  criteria: Record<string, unknown>;
  orchestrationConfig: { requiresCheck: boolean; judgeRoleId?: string; minPassScore: number };
  memoryConfig: { useProjectMemory: boolean; readOnly: boolean };
}
