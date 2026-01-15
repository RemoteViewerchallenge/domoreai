# meta Tool Documentation

## Overview
The `meta` tool provides agents with **system-level control** over C.O.R.E. itself. This allows agents to create roles, design multi-agent workflows (orchestrations), and manage the system configuration.

**⚠️ CRITICAL**: This is the most powerful tool in C.O.R.E. Only assign it to roles that need to modify the system architecture. Agents with this tool can create other agents, define workflows, and change system behavior.

## Permission Model
```typescript
// Only roles with 'meta' in their tools array can use these operations
const metaRole = await prisma.role.create({
  name: "System Architect",
  tools: ['meta'], // 🔑 This grants meta-tool access
  needsTools: true
});
```

## Available Operations

The meta tool provides **10 core operations** organized into three categories:

### 📋 Role Management (4 operations)
1. `create_role` - Create new AI roles
2. `list_roles` - List all available roles
3. `update_role` - Modify role configuration
4. `delete_role` - Remove roles

### 🔄 Orchestration Management (6 operations)
5. `create_orchestration` - Define multi-step workflows
6. `list_orchestrations` - List/filter orchestrations
7. `get_orchestration` - Get detailed orchestration info
8. `execute_orchestration` - Start an orchestration
9. `get_execution_status` - Check execution progress
10. `update_orchestration` - Update orchestration metadata
11. `delete_orchestration` - Remove orchestrations

---

## Role Management Operations

### 1. create_role
Create a new AI role with specific capabilities and constraints.

**Input Schema:**
```typescript
{
  name: string;              // Required: Unique role name
  basePrompt: string;        // Required: System prompt defining behavior
  capabilities?: {           // Optional: Capability flags
    needsVision?: boolean;
    needsReasoning?: boolean;
    needsCoding?: boolean;
    needsTools?: boolean;
    needsJson?: boolean;
    needsUncensored?: boolean;
  };
  contextLimits?: {          // Optional: Context window constraints
    minContext?: number;
    maxContext?: number;
  };
  tools?: string[];          // Optional: MCP tools (e.g., ['git', 'postgres'])
  hyperparameters?: {        // Optional: Model parameters
    temperature?: number;    // 0-2
    maxTokens?: number;
    topP?: number;           // 0-1
  };
}
```

**Example: Creating a Code Reviewer**
```typescript
const result = await meta({
  operation: 'create_role',
  data: {
    name: 'Code Reviewer',
    basePrompt: `You are an expert code reviewer with 15+ years of experience.

Your responsibilities:
- Review code for bugs, security issues, and performance problems
- Suggest improvements following best practices
- Ensure code is maintainable and well-documented
- Check for proper error handling and edge cases

Always provide constructive feedback with specific examples.`,
    capabilities: {
      needsCoding: true,
      needsTools: true
    },
    tools: ['git', 'filesystem', 'search_codebase'],
    contextLimits: {
      minContext: 16000,
      maxContext: 128000
    },
    hyperparameters: {
      temperature: 0.3,  // Low temperature for consistency
      maxTokens: 4096
    }
  }
});

// Returns: ✅ Role "Code Reviewer" created successfully.
//          ID: clx123abc...
```

**Example: Creating a Research Assistant**
```typescript
await meta({
  operation: 'create_role',
  data: {
    name: 'Research Assistant',
    basePrompt: 'You are a thorough research assistant who finds and synthesizes information from multiple sources.',
    capabilities: {
      needsTools: true
    },
    tools: ['browser', 'search_codebase', 'filesystem'],
    hyperparameters: {
      temperature: 0.7,
      maxTokens: 8192
    }
  }
});
```

### 2. list_roles
Get all available roles in the system.

**Input Schema:**
```typescript
{} // No parameters required
```

**Example:**
```typescript
const roles = await meta({
  operation: 'list_roles'
});

// Returns JSON array:
// [
//   {
//     "id": "clx123",
//     "name": "Code Reviewer",
//     "basePrompt": "You are an expert...",
//     "tools": ["git", "filesystem"]
//   },
//   ...
// ]
```

### 3. update_role
Modify an existing role's configuration.

**Input Schema:**
```typescript
{
  roleId: string;           // Required: Role ID to update
  updates: {
    basePrompt?: string;
    tools?: string[];
    // Add other updatable fields
  };
}
```

**Example: Adding Tools to a Role**
```typescript
await meta({
  operation: 'update_role',
  data: {
    roleId: 'clx123abc',
    updates: {
      tools: ['git', 'filesystem', 'postgres'],  // Added postgres
      basePrompt: 'Updated system prompt with database access...'
    }
  }
});

// Returns: ✅ Role "Code Reviewer" updated successfully.
```

### 4. delete_role
Remove a role from the system.

**Input Schema:**
```typescript
{
  roleId: string;  // Required: Role ID to delete
}
```

**Example:**
```typescript
await meta({
  operation: 'delete_role',
  data: {
    roleId: 'clx123abc'
  }
});

// Returns: ✅ Role "Old Role" deleted successfully.
```

---

## Orchestration Management Operations

### 5. create_orchestration
Define a multi-step workflow that chains multiple roles together.

**Input Schema:**
```typescript
{
  name: string;              // Required: Unique orchestration name
  description?: string;      // Optional: What this orchestration does
  tags?: string[];           // Optional: For categorization
  steps: Array<{             // Required: Workflow steps
    name: string;            // Step name
    description?: string;
    order: number;           // Execution order (0, 1, 2, ...)
    roleName?: string;       // Name of role to use
    stepType?: 'sequential' | 'parallel' | 'conditional' | 'loop';
    inputMapping?: object;   // Map context to step input
    outputMapping?: object;  // Map step output to context
    condition?: object;      // Conditional logic
    maxRetries?: number;     // Retry attempts
    timeout?: number;        // Timeout in ms
    parallelGroup?: string;  // Group ID for parallel execution
  }>;
}
```

**Example: Code Review Pipeline**
```typescript
const orchestration = await meta({
  operation: 'create_orchestration',
  data: {
    name: 'Code Review Pipeline',
    description: 'Multi-stage code review with static analysis and human-readable feedback',
    tags: ['code-review', 'quality-assurance'],
    steps: [
      {
        name: 'Static Analysis',
        order: 0,
        roleName: 'Code Analyzer',
        stepType: 'sequential',
        inputMapping: {
          code: '{{context.input.codeToReview}}',
          language: '{{context.input.language}}'
        },
        outputMapping: {
          issues: '{{output.foundIssues}}'
        },
        timeout: 30000
      },
      {
        name: 'Security Scan',
        order: 1,
        roleName: 'Security Expert',
        stepType: 'sequential',
        inputMapping: {
          code: '{{context.input.codeToReview}}',
          staticIssues: '{{context.issues}}'
        },
        outputMapping: {
          securityReport: '{{output.report}}'
        }
      },
      {
        name: 'Final Review',
        order: 2,
        roleName: 'Senior Developer',
        stepType: 'sequential',
        inputMapping: {
          code: '{{context.input.codeToReview}}',
          issues: '{{context.issues}}',
          securityReport: '{{context.securityReport}}'
        },
        condition: {
          field: 'context.issues.length',
          operator: '>',
          value: 0
        }
      }
    ]
  }
});

// Returns: ✅ Orchestration "Code Review Pipeline" created successfully.
//          ID: clx456def
//          Steps: 3
```

**Example: Parallel Research Workflow**
```typescript
await meta({
  operation: 'create_orchestration',
  data: {
    name: 'Multi-Source Research',
    description: 'Research a topic from multiple sources in parallel, then synthesize',
    tags: ['research', 'parallel'],
    steps: [
      // Parallel research phase
      {
        name: 'Search Academic Papers',
        order: 0,
        roleName: 'Academic Researcher',
        stepType: 'parallel',
        parallelGroup: 'research',
        inputMapping: { query: '{{context.input.topic}}' },
        outputMapping: { academicFindings: '{{output.results}}' }
      },
      {
        name: 'Search Web',
        order: 0,
        roleName: 'Web Researcher',
        stepType: 'parallel',
        parallelGroup: 'research',
        inputMapping: { query: '{{context.input.topic}}' },
        outputMapping: { webFindings: '{{output.results}}' }
      },
      {
        name: 'Search Codebase',
        order: 0,
        roleName: 'Code Researcher',
        stepType: 'parallel',
        parallelGroup: 'research',
        inputMapping: { query: '{{context.input.topic}}' },
        outputMapping: { codeFindings: '{{output.results}}' }
      },
      // Synthesis phase (runs after parallel group completes)
      {
        name: 'Synthesize Findings',
        order: 1,
        roleName: 'Research Synthesizer',
        stepType: 'sequential',
        inputMapping: {
          academic: '{{context.academicFindings}}',
          web: '{{context.webFindings}}',
          code: '{{context.codeFindings}}'
        }
      }
    ]
  }
});
```

### 6. list_orchestrations
List all available orchestrations with optional filtering.

**Input Schema:**
```typescript
{
  tags?: string[];        // Optional: Filter by tags
  activeOnly?: boolean;   // Optional: Only show active orchestrations
}
```

**Example:**
```typescript
const orchestrations = await meta({
  operation: 'list_orchestrations',
  data: {
    tags: ['code-review'],
    activeOnly: true
  }
});

// Returns:
// [
//   {
//     "id": "clx456",
//     "name": "Code Review Pipeline",
//     "description": "Multi-stage code review...",
//     "steps": 3,
//     "tags": ["code-review", "quality-assurance"],
//     "isActive": true,
//     "lastExecution": "2025-12-15T23:40:00Z"
//   }
// ]
```

### 7. get_orchestration
Get detailed information about a specific orchestration.

**Input Schema:**
```typescript
{
  nameOrId: string;  // Orchestration name or ID
}
```

**Example:**
```typescript
const details = await meta({
  operation: 'get_orchestration',
  data: {
    nameOrId: 'Code Review Pipeline'
  }
});

// Returns full orchestration object with all steps, mappings, etc.
```

### 8. execute_orchestration
Execute an orchestration with given input data.

**Input Schema:**
```typescript
{
  orchestrationId: string;  // Required: Orchestration ID
  input: object;            // Required: Input data for the workflow
}
```

**Example:**
```typescript
const execution = await meta({
  operation: 'execute_orchestration',
  data: {
    orchestrationId: 'clx456def',
    input: {
      codeToReview: `
        function calculateTotal(items) {
          let total = 0;
          for (let i = 0; i < items.length; i++) {
            total += items[i].price;
          }
          return total;
        }
      `,
      language: 'javascript',
      context: 'E-commerce checkout system'
    }
  }
});

// Returns: ✅ Orchestration execution started.
//          Execution ID: clx789ghi
//          Status: running
//          
//          Use get_execution_status with this ID to check progress.
```

### 9. get_execution_status
Check the status and results of an orchestration execution.

**Input Schema:**
```typescript
{
  executionId: string;  // Required: Execution ID from execute_orchestration
}
```

**Example:**
```typescript
const status = await meta({
  operation: 'get_execution_status',
  data: {
    executionId: 'clx789ghi'
  }
});

// Returns:
// {
//   "status": "completed",
//   "startedAt": "2025-12-15T23:40:00Z",
//   "completedAt": "2025-12-15T23:42:30Z",
//   "output": {
//     "finalReview": "Code looks good with minor suggestions..."
//   },
//   "error": null,
//   "stepLogs": [
//     {
//       "stepId": "...",
//       "stepName": "Static Analysis",
//       "status": "completed",
//       "duration": 2340,
//       "output": { "foundIssues": [...] }
//     },
//     ...
//   ]
// }
```

### 10. update_orchestration
Update an orchestration's metadata (name, description, tags, active status).

**Input Schema:**
```typescript
{
  orchestrationId: string;
  updates: {
    name?: string;
    description?: string;
    tags?: string[];
    isActive?: boolean;
  };
}
```

**Example:**
```typescript
await meta({
  operation: 'update_orchestration',
  data: {
    orchestrationId: 'clx456def',
    updates: {
      description: 'Enhanced code review with security focus',
      tags: ['code-review', 'security', 'quality'],
      isActive: true
    }
  }
});
```

### 11. delete_orchestration
Remove an orchestration from the system.

**Input Schema:**
```typescript
{
  orchestrationId: string;
}
```

**Example:**
```typescript
await meta({
  operation: 'delete_orchestration',
  data: {
    orchestrationId: 'clx456def'
  }
});
```

---

## Advanced Patterns

### Pattern 1: Planner-Executor-Reviewer
```typescript
await meta({
  operation: 'create_orchestration',
  data: {
    name: 'Feature Development',
    steps: [
      { name: 'Plan', order: 0, roleName: 'Architect' },
      { name: 'Execute', order: 1, roleName: 'Developer' },
      { name: 'Review', order: 2, roleName: 'QA Engineer' }
    ]
  }
});
```

### Pattern 2: Map-Reduce
```typescript
// Multiple parallel workers, then aggregate
steps: [
  { name: 'Process Chunk 1', order: 0, parallelGroup: 'workers' },
  { name: 'Process Chunk 2', order: 0, parallelGroup: 'workers' },
  { name: 'Process Chunk 3', order: 0, parallelGroup: 'workers' },
  { name: 'Aggregate Results', order: 1, roleName: 'Aggregator' }
]
```

### Pattern 3: Conditional Refinement
```typescript
steps: [
  { name: 'Generate', order: 0, roleName: 'Creator' },
  { 
    name: 'Refine', 
    order: 1, 
    roleName: 'Refiner',
    condition: {
      field: 'output.quality',
      operator: '<',
      value: 0.8
    },
    maxRetries: 3
  }
]
```

---

## Best Practices

### 1. Role Creation
✅ **DO**: Create specific, well-defined roles
```typescript
name: 'API Documentation Writer'
basePrompt: 'You specialize in writing clear, comprehensive API documentation...'
```

❌ **DON'T**: Create vague, overly broad roles
```typescript
name: 'Helper'
basePrompt: 'You help with stuff'
```

### 2. Orchestration Design
✅ **DO**: Design clear pipelines with proper data flow
```typescript
inputMapping: { code: '{{context.input.sourceCode}}' }
outputMapping: { analysis: '{{output.result}}' }
```

❌ **DON'T**: Create steps without clear input/output mappings

### 3. Error Handling
✅ **DO**: Use retries and timeouts
```typescript
maxRetries: 3,
retryDelay: 1000,
timeout: 30000
```

### 4. Parallel Execution
✅ **DO**: Group independent tasks
```typescript
parallelGroup: 'research'  // All research tasks run simultaneously
```

---

## Security Considerations

1. **Limit Meta Access**: Only grant `meta` tool to trusted roles
2. **Validate Inputs**: Always validate role names and prompts
3. **Audit Trail**: All meta operations are logged
4. **Rate Limiting**: Consider limiting role/orchestration creation
5. **Sandboxing**: New roles inherit safe defaults

---

## Common Use Cases

### Self-Improvement
```typescript
// Agent discovers it needs a new capability
const myRoles = await meta({ operation: 'list_roles' });
const needsDatabase = !myRoles.some(r => r.tools.includes('postgres'));

if (needsDatabase) {
  await meta({
    operation: 'create_role',
    data: {
      name: 'Database Specialist',
      basePrompt: 'You are a database expert...',
      tools: ['postgres']
    }
  });
}
```

### Dynamic Workflow Creation
```typescript
// Create a workflow based on task analysis
const taskType = analyzeTask(userRequest);

if (taskType === 'full-stack-feature') {
  await meta({
    operation: 'create_orchestration',
    data: {
      name: `Feature: ${featureName}`,
      steps: [
        { name: 'Design Schema', roleName: 'DB Architect', order: 0 },
        { name: 'Build API', roleName: 'Backend Dev', order: 1 },
        { name: 'Build UI', roleName: 'Frontend Dev', order: 2 },
        { name: 'Test', roleName: 'QA', order: 3 }
      ]
    }
  });
}
```

---

## Notes

- Meta operations are **synchronous** and return immediately
- Created roles are **immediately available** for use
- Orchestrations can be **executed multiple times** with different inputs
- Role updates affect **future invocations only**, not in-progress ones
- Execution runs in the **background** (async)
- Use `get_execution_status` to **poll for completion**

---

## Return Format

All meta operations return text responses:

**Success:**
```
✅ Role "Name" created successfully.
ID: clx123abc
```

**Error:**
```
❌ Orchestration "Name" not found.
```

**Data:**
```json
[
  { "id": "...", "name": "...", ... }
]
```


## Purpose
Use this tool when you need to:
- Create new roles dynamically based on task requirements
- Update existing role configurations
- Select and configure orchestrations for complex workflows
- Manage role categories and organization
- Configure system-level settings
- Introspect the current system state

## Available Operations

### 1. Create Role
Create a new role with specified capabilities and configuration.

```typescript
await meta({
  operation: 'create_role',
  data: {
    name: 'Data Analyst',
    description: 'Analyzes data and generates insights',
    basePrompt: 'You are an expert data analyst...',
    category: 'Analytics',
    tools: ['postgres', 'filesystem'],
    needsCoding: true,
    needsTools: true,
    minContext: 8000,
    maxContext: 128000
  }
});
```

### 2. Update Role
Modify an existing role's configuration.

```typescript
await meta({
  operation: 'update_role',
  data: {
    roleId: 'clx123abc',
    updates: {
      basePrompt: 'Updated system prompt...',
      tools: ['postgres', 'git', 'filesystem'],
      needsVision: true
    }
  }
});
```

### 3. List Roles
Get all available roles in the system.

```typescript
const roles = await meta({
  operation: 'list_roles',
  filters: {
    category: 'Development',
    needsCoding: true
  }
});

// Returns array of role objects
console.log(roles);
```

### 4. Create Orchestration
Define a new orchestration workflow.

```typescript
await meta({
  operation: 'create_orchestration',
  data: {
    name: 'Code Review Pipeline',
    description: 'Multi-stage code review process',
    steps: [
      {
        name: 'Static Analysis',
        roleId: 'code_analyzer_role_id',
        order: 0,
        stepType: 'sequential'
      },
      {
        name: 'Security Scan',
        roleId: 'security_expert_role_id',
        order: 1,
        stepType: 'sequential'
      },
      {
        name: 'Final Review',
        roleId: 'senior_dev_role_id',
        order: 2,
        stepType: 'sequential'
      }
    ]
  }
});
```

### 5. Execute Orchestration
Run a defined orchestration with input data.

```typescript
const result = await meta({
  operation: 'execute_orchestration',
  data: {
    orchestrationId: 'clx456def',
    input: {
      codeToReview: 'function example() { ... }',
      context: 'Pull request #123'
    }
  }
});
```

### 6. List Orchestrations
Get all available orchestrations.

```typescript
const orchestrations = await meta({
  operation: 'list_orchestrations',
  filters: {
    isActive: true,
    tags: ['code-review']
  }
});
```

### 7. Create Role Category
Organize roles into categories.

```typescript
await meta({
  operation: 'create_category',
  data: {
    name: 'Machine Learning',
    parentId: 'data_science_category_id', // Optional
    order: 5
  }
});
```

### 8. Get System Config
Retrieve current system configuration.

```typescript
const config = await meta({
  operation: 'get_config',
  scope: 'orchestrator' // or 'providers', 'models', etc.
});
```

### 9. Update System Config
Modify system configuration.

```typescript
await meta({
  operation: 'update_config',
  scope: 'orchestrator',
  data: {
    activeTableName: 'model_registry',
    strategies: ['zero_burn', 'cell_division']
  }
});
```

### 10. Introspect Capabilities
Discover what the current agent can do.

```typescript
const capabilities = await meta({
  operation: 'introspect',
  target: 'self' // or 'system', 'role:role_id'
});

// Returns:
// {
//   tools: ['meta', 'git', 'filesystem'],
//   capabilities: ['coding', 'tools'],
//   contextWindow: [8000, 128000],
//   assignedRole: 'Architect'
// }
```

## Input Schema
```typescript
{
  operation: string;      // The meta operation to perform
  data?: any;            // Operation-specific data
  filters?: any;         // Optional filters for list operations
  scope?: string;        // Scope for config operations
  target?: string;       // Target for introspection
}
```

## Return Format
Returns operation-specific data. Common patterns:

**Create operations**: Return the created object with ID
```json
{
  "id": "clx789ghi",
  "name": "New Role",
  "createdAt": "2025-12-15T23:40:00Z"
}
```

**List operations**: Return array of objects
```json
[
  { "id": "...", "name": "Role 1", ... },
  { "id": "...", "name": "Role 2", ... }
]
```

**Update operations**: Return updated object
```json
{
  "id": "clx123abc",
  "name": "Updated Role",
  "updatedAt": "2025-12-15T23:40:00Z"
}
```

## Best Practices

### 1. Role Creation Strategy
When creating roles dynamically, follow these patterns:

```typescript
// ✅ GOOD: Specific, well-defined role
await meta({
  operation: 'create_role',
  data: {
    name: 'API Documentation Writer',
    basePrompt: 'You are an expert technical writer specializing in API documentation...',
    tools: ['filesystem', 'search_codebase'],
    needsCoding: true,
    category: 'Documentation'
  }
});

// ❌ BAD: Vague, overly broad role
await meta({
  operation: 'create_role',
  data: {
    name: 'Helper',
    basePrompt: 'You help with stuff',
    tools: ['meta', 'git', 'postgres', 'filesystem', 'browser']
  }
});
```

### 2. Orchestration Design
Design orchestrations with clear stages and dependencies:

```typescript
// ✅ GOOD: Clear pipeline with validation
await meta({
  operation: 'create_orchestration',
  data: {
    name: 'Feature Development Pipeline',
    steps: [
      { name: 'Requirements Analysis', roleId: 'analyst_id', order: 0 },
      { name: 'Design', roleId: 'architect_id', order: 1 },
      { name: 'Implementation', roleId: 'developer_id', order: 2 },
      { name: 'Testing', roleId: 'qa_id', order: 3 },
      { name: 'Documentation', roleId: 'writer_id', order: 4 }
    ]
  }
});
```

### 3. Safe Meta Operations
Always validate before making system changes:

```typescript
// Check if role exists before creating
const existingRoles = await meta({ operation: 'list_roles' });
const roleExists = existingRoles.some(r => r.name === 'New Role');

if (!roleExists) {
  await meta({
    operation: 'create_role',
    data: { name: 'New Role', ... }
  });
}
```

### 4. Category Organization
Use hierarchical categories for better organization:

```typescript
// Create parent category
const parent = await meta({
  operation: 'create_category',
  data: { name: 'Engineering' }
});

// Create subcategories
await meta({
  operation: 'create_category',
  data: { name: 'Frontend', parentId: parent.id }
});

await meta({
  operation: 'create_category',
  data: { name: 'Backend', parentId: parent.id }
});
```

## Common Use Cases

### Dynamic Role Creation Based on Task
```typescript
// Analyze the task and create a specialized role
const taskAnalysis = "Need to build a REST API with authentication";

await meta({
  operation: 'create_role',
  data: {
    name: 'API Builder',
    basePrompt: `You are an expert backend developer specializing in REST API development with authentication. 
    
Your responsibilities:
- Design RESTful endpoints
- Implement JWT authentication
- Write secure, production-ready code
- Follow best practices for API design`,
    tools: ['filesystem', 'postgres', 'git'],
    needsCoding: true,
    needsTools: true,
    category: 'Backend Development',
    minContext: 16000,
    maxContext: 128000
  }
});
```

### Multi-Agent Workflow
```typescript
// Create an orchestration for complex tasks
const orchestration = await meta({
  operation: 'create_orchestration',
  data: {
    name: 'Full Stack Feature',
    description: 'Complete feature implementation from design to deployment',
    steps: [
      {
        name: 'Design Database Schema',
        roleId: 'database_architect_id',
        order: 0,
        outputMapping: { schema: '{{output.schema}}' }
      },
      {
        name: 'Build Backend API',
        roleId: 'backend_dev_id',
        order: 1,
        inputMapping: { schema: '{{context.schema}}' },
        outputMapping: { apiSpec: '{{output.openapi}}' }
      },
      {
        name: 'Build Frontend',
        roleId: 'frontend_dev_id',
        order: 2,
        inputMapping: { apiSpec: '{{context.apiSpec}}' }
      }
    ]
  }
});

// Execute it
await meta({
  operation: 'execute_orchestration',
  data: {
    orchestrationId: orchestration.id,
    input: {
      feature: 'User Profile Management',
      requirements: '...'
    }
  }
});
```

### Self-Improvement
```typescript
// Agent introspects and requests new capabilities
const myCapabilities = await meta({
  operation: 'introspect',
  target: 'self'
});

if (!myCapabilities.tools.includes('postgres')) {
  // Request update to current role
  await meta({
    operation: 'update_role',
    data: {
      roleId: myCapabilities.roleId,
      updates: {
        tools: [...myCapabilities.tools, 'postgres'],
        needsTools: true
      }
    }
  });
}
```

## Security Considerations

1. **Limit meta tool access**: Only give this tool to roles that need system-level control
2. **Validate inputs**: Always validate role names, prompts, and configurations
3. **Audit trail**: All meta operations should be logged
4. **Rate limiting**: Consider limiting how many roles/orchestrations can be created
5. **Sandboxing**: New roles should inherit safe defaults and restrictions

## Notes

- Meta operations are synchronous and return immediately
- Created roles are immediately available for use
- Orchestrations can be executed multiple times with different inputs
- Role updates affect all future invocations, not in-progress ones
- Category changes reorganize the UI but don't affect role functionality
- System config changes may require restart for some settings

## Error Handling

```typescript
try {
  await meta({
    operation: 'create_role',
    data: { name: 'Duplicate Name', ... }
  });
} catch (error) {
  if (error.code === 'DUPLICATE_NAME') {
    // Handle duplicate role name
    console.log('Role with this name already exists');
  } else if (error.code === 'INVALID_CONFIG') {
    // Handle invalid configuration
    console.log('Invalid role configuration:', error.message);
  }
}
```
