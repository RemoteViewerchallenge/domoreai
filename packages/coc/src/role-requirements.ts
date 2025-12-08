// Role requirements and constraints for intelligent model selection
// This maps role types to their computational and context needs

export interface RoleRequirements {
  role: string;
  minContext: number;  // Minimum context window needed
  maxContext: number;  // Maximum useful context (for efficiency)
  needsCoding: boolean;
  needsTools: boolean;
  needsVision: boolean;
  needsReasoning: boolean;
  needsJson: boolean;
  needsTTS?: boolean;
  needsImageGen?: boolean;
  priority: 'speed' | 'quality' | 'balanced'; // Selection priority
  description: string;
}

export const ROLE_REQUIREMENTS: Record<string, RoleRequirements> = {
  // ========================================
  // LOW CONTEXT ROLES (Fast, Efficient)
  // ========================================
  'worker': {
    role: 'worker',
    minContext: 4000,
    maxContext: 32000,
    needsCoding: true,
    needsTools: true,
    needsVision: false,
    needsReasoning: false,
    needsJson: true,
    priority: 'speed',
    description: 'Fast execution of simple tasks with tool calls'
  },
  
  'code-reviewer': {
    role: 'code-reviewer',
    minContext: 8000,
    maxContext: 64000,
    needsCoding: true,
    needsTools: true,
    needsVision: false,
    needsReasoning: true,
    needsJson: true,
    priority: 'quality',
    description: 'Reviews code for bugs and improvements'
  },
  
  'test-writer': {
    role: 'test-writer',
    minContext: 16000,
    maxContext: 64000,
    needsCoding: true,
    needsTools: true,
    needsVision: false,
    needsReasoning: true,
    needsJson: false,
    priority: 'quality',
    description: 'Writes comprehensive test cases'
  },

  // ========================================
  // MEDIUM CONTEXT ROLES (Balanced)
  // ========================================
  'department-lead': {
    role: 'department-lead',
    minContext: 32000,
    maxContext: 128000,
    needsCoding: false,
    needsTools: false,
    needsVision: false,
    needsReasoning: true,
    needsJson: true,
    priority: 'balanced',
    description: 'Coordinates team activities and decisions'
  },
  
  'data-analyst': {
    role: 'data-analyst',
    minContext: 32000,
    maxContext: 128000,
    needsCoding: true,
    needsTools: true,
    needsVision: false,
    needsReasoning: true,
    needsJson: true,
    priority: 'quality',
    description: 'Analyzes data and creates insights'
  },

  // ========================================
  // HIGH CONTEXT ROLES (Deep Analysis)
  // ========================================
  'planner': {
    role: 'planner',
    minContext: 64000,
    maxContext: 1000000,
    needsCoding: false,
    needsTools: false,
    needsVision: false,
    needsReasoning: true,
    needsJson: true,
    priority: 'quality',
    description: 'Strategic planning with large context'
  },
  
  'architect': {
    role: 'architect',
    minContext: 128000,
    maxContext: 1000000,
    needsCoding: true,
    needsTools: true,
    needsVision: false,
    needsReasoning: true,
    needsJson: true,
    priority: 'quality',
    description: 'System design and architecture'
  },
  
  'librarian': {
    role: 'librarian',
    minContext: 64000,
    maxContext: 1000000,
    needsCoding: false,
    needsTools: true,
    needsVision: false,
    needsReasoning: false,
    needsJson: true,
    priority: 'balanced',
    description: 'Information retrieval and organization'
  },

  // ========================================
  // SPECIALIZED ROLES (Multimodal)
  // ========================================
  'vision-analyst': {
    role: 'vision-analyst',
    minContext: 16000,
    maxContext: 128000,
    needsCoding: false,
    needsTools: true,
    needsVision: true,
    needsReasoning: true,
    needsJson: true,
    priority: 'quality',
    description: 'Analyzes images and visual content'
  },
  
  'content-creator': {
    role: 'content-creator',
    minContext: 32000,
    maxContext: 128000,
    needsCoding: false,
    needsTools: true,
    needsVision: false,
    needsReasoning: false,
    needsJson: false,
    needsTTS: true,
    needsImageGen: true,
    priority: 'quality',
    description: 'Creates multimedia content'
  },

  // ========================================
  // UTILITY ROLES
  // ========================================
  'judge': {
    role: 'judge',
    minContext: 16000,
    maxContext: 64000,
    needsCoding: false,
    needsTools: false,
    needsVision: false,
    needsReasoning: true,
    needsJson: true,
    priority: 'quality',
    description: 'Evaluates quality and correctness'
  }
};

// Get requirements for a role, with fallback to generic worker
export function getRoleRequirements(role: string): RoleRequirements {
  return ROLE_REQUIREMENTS[role] || ROLE_REQUIREMENTS['worker'];
}

// Check if a model meets role requirements
export function modelMeetsRequirements(
  modelContext: number,
  modelCapabilities: {
    supportsCoding?: boolean;
    supportsTools?: boolean;
    supportsVision?: boolean;
    supportsTTS?: boolean;
  },
  requirements: RoleRequirements
): boolean {
  // Context check
  if (modelContext < requirements.minContext) return false;
  
  // Capability checks
  if (requirements.needsCoding && !modelCapabilities.supportsCoding) return false;
  if (requirements.needsTools && !modelCapabilities.supportsTools) return false;
  if (requirements.needsVision && !modelCapabilities.supportsVision) return false;
  if (requirements.needsTTS && !modelCapabilities.supportsTTS) return false;
  
  return true;
}

// Score a model for a role (higher is better)
export function scoreModelForRole(
  modelContext: number,
  modelCapabilities: {
    supportsCoding?: boolean;
    supportsTools?: boolean;
    supportsVision?: boolean;
    supportsTTS?: boolean;
  },
  requirements: RoleRequirements
): number {
  if (!modelMeetsRequirements(modelContext, modelCapabilities, requirements)) {
    return 0;
  }
  
  let score = 100;
  
  // Prefer models close to maxContext (not too large, not too small)
  const contextRatio = modelContext / requirements.maxContext;
  if (contextRatio < 0.5) {
    score -= 20; // Too small
  } else if (contextRatio > 2) {
    score -= 10; // Unnecessarily large (slower, more expensive)
  }
  
  // Bonus for exact capability matches
  if (requirements.needsCoding && modelCapabilities.supportsCoding) score += 10;
  if (requirements.needsTools && modelCapabilities.supportsTools) score += 10;
  if (requirements.needsVision && modelCapabilities.supportsVision) score += 15;
  if (requirements.needsTTS && modelCapabilities.supportsTTS) score += 15;
  
  return score;
}
