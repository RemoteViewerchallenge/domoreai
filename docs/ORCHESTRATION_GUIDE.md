# Orchestration System - Usage Guide

## Overview

The orchestration system allows you to create multi-step workflows that chain multiple roles together. Agents can create and manage roles and orchestrations via TypeScript code when granted the `meta` tool permission.

## Architecture

### Key Components

1. **Roles**: Define agent capabilities and constraints
2. **Orchestrations**: Define workflows between roles
3. **Steps**: Individual actions in an orchestration
4. **Executions**: Runtime instances of orchestrations

### Flow Types

- **Sequential**: Steps execute one after another
- **Parallel**: Multiple steps execute simultaneously
- **Conditional**: Steps execute based on conditions
- **Loop**: Steps can retry on failure

## Granting Meta-Tool Access

To allow an agent to create roles and orchestrations, add `'meta'` to the role's tools array:

```typescript
// When creating a role via UI or API
const role = await trpc.role.create.mutate({
  name: "Orchestration Designer",
  basePrompt: "You are an AI that designs multi-agent workflows",
  tools: ['meta'], // 🔑 This grants access to meta-tools
  needsTools: true
});
```

## Agent Usage Examples

### Example 1: Creating a Role via Code

When an agent has `meta` tool access, they can write TypeScript code like this:

```typescript
// Create a code reviewer role
const result = await create_role({
  name: "Code Reviewer",
  basePrompt: `You are a senior code reviewer. Analyze code for:
- Security vulnerabilities
- Performance issues  
- Code style and best practices
- Test coverage`,
  capabilities: {
    needsCoding: true,
    needsTools: false,
    needsReasoning: true
  },
  contextLimits: {
    minContext: 8000,
    maxContext: 128000
  },
  hyperparameters: {
    temperature: 0.3, // Low temperature for consistent reviews
    maxTokens: 4000
  }
});

console.log(result);
```

### Example 2: Creating an Orchestration

```typescript
// Create a "Planner-Executor-Reviewer" orchestration
const orchestration = await create_orchestration({
  name: "Code Generation Pipeline",
  description: "Plans, generates, and reviews code changes",
  tags: ["coding", "quality"],
  steps: [
    {
      name: "Plan",
      order: 0,
      roleName: "Architect",
      inputMapping: {
        task: "{{context.input.userRequest}}"
      },
      outputMapping: {
        plan: "{{output}}"
      }
    },
    {
      name: "Generate Code",
      order: 1,
      roleName: "Coder",
      inputMapping: {
        instructions: "{{context.plan}}"
      },
      outputMapping: {
        code: "{{output}}"
      }
    },
    {
      name: "Review",
      order: 2,
      roleName: "Code Reviewer",
      inputMapping: {
        code: "{{context.code}}",
        requirements: "{{context.plan}}"
      },
      outputMapping: {
        review: "{{output}}"
      },
      condition: {
        field: "code",
        operator: "exists",
        value: null
      }
    }
  ]
});

console.log(orchestration);
```

### Example 3: Parallel Execution (Map-Reduce Pattern)

```typescript
// Research orchestration with parallel searches
const researchFlow = await create_orchestration({
  name: "Multi-Source Research",
  description: "Searches multiple sources in parallel, then synthesizes",
  tags: ["research"],
  steps: [
    // Parallel search steps (same parallelGroup)
    {
      name: "Search Academic Papers",
      order: 0,
      roleName: "Research Assistant",
      parallelGroup: "search", // 🔄 Runs in parallel
      inputMapping: {
        query: "{{context.input.topic}} site:arxiv.org"
      }
    },
    {
      name: "Search Technical Docs",
      order: 1,
      roleName: "Research Assistant",
      parallelGroup: "search", // 🔄 Runs in parallel
      inputMapping: {
        query: "{{context.input.topic}} site:developer.mozilla.org"
      }
    },
    {
      name: "Search GitHub",
      order: 2,
      roleName: "Research Assistant",
      parallelGroup: "search", // 🔄 Runs in parallel
      inputMapping: {
        query: "{{context.input.topic}} site:github.com"
      }
    },
    // Synthesis step (runs after all parallel steps complete)
    {
      name: "Synthesize Findings",
      order: 3,
      roleName: "Synthesizer",
      inputMapping: {
        sources: {
          academic: "{{context['Search Academic Papers']}}",
          docs: "{{context['Search Technical Docs']}}",
          github: "{{context['Search GitHub']}}"
        }
      },
      outputMapping: {
        report: "{{output}}"
      }
    }
  ]
});
```

### Example 4: Conditional Logic & Retries

```typescript
// Self-correcting code generation
const selfCorrectingFlow = await create_orchestration({
  name: "Self-Correcting Coder",
  description: "Generates code and auto-fixes errors",
  tags: ["coding", "reliability"],
  steps: [
    {
      name: "Generate Code",
      order: 0,
      roleName: "Coder",
      maxRetries: 2,
      retryDelay: 1000,
      timeout: 60000
    },
    {
      name: "Run Tests",
      order: 1,
      roleName: "Tester",
      inputMapping: {
        code: "{{context['Generate Code']}}"
      },
      outputMapping: {
        testResults: "{{output}}"
      }
    },
    {
      name: "Fix Failures",
      order: 2,
      roleName: "Debugger",
      condition: {
        field: "testResults.passed",
        operator: "<",
        value: 1.0 // Only run if not all tests passed
      },
      inputMapping: {
        code: "{{context['Generate Code']}}",
        failures: "{{context.testResults.failures}}"
      }
    }
  ]
});
```

## Executing Orchestrations

### Via Agent Code

```typescript
// Execute an orchestration
const execution = await execute_orchestration({
  orchestrationId: "clf...",
  input: {
    userRequest: "Create a React component for a login form",
    requirements: ["validation", "accessibility", "responsive"]
  }
});

// Check status
const status = await get_execution_status({
  executionId: execution.id
});

console.log(status);
```

### Via TRPC (UI or API)

```typescript
// From the frontend
const execution = await trpc.orchestrationManagement.execute.mutate({
  orchestrationId: "clf...",
  input: {
    topic: "WebAssembly performance"
  }
});

// Poll for status
const status = await trpc.orchestrationManagement.getExecutionStatus.query({
  executionId: execution.id
});
```

## Template Variable Syntax

Use `{{path.to.value}}` to reference context values:

- `{{context.input.userQuery}}` - Access input
- `{{context.stepName}}` - Access previous step output
- `{{output}}` - Current step output
- `{{context.plan.tasks[0]}}` - Access nested values

## Fundamental Patterns

### 1. Planner-Executor-Reviewer

```typescript
{
  steps: [
    { name: "Plan", roleName: "Architect" },
    { name: "Execute", roleName: "Coder" },
    { name: "Review", roleName: "Reviewer" }
  ]
}
```

### 2. Map-Reduce

```typescript
{
  steps: [
    { name: "Search A", parallelGroup: "map" },
    { name: "Search B", parallelGroup: "map" },
    { name: "Search C", parallelGroup: "map" },
    { name: "Synthesize", order: 3 } // Reduce step
  ]
}
```

### 3. Tree of Thoughts

```typescript
{
  steps: [
    { name: "Generate Options", parallelGroup: "generate" },
    { name: "Generate Options 2", parallelGroup: "generate" },
    { name: "Generate Options 3", parallelGroup: "generate" },
    { name: "Evaluate", order: 3 },
    { name: "Select Best", order: 4 }
  ]
}
```

### 4. Ping-Pong (Adversarial)

```typescript
{
  steps: [
    { name: "Creator", order: 0 },
    { name: "Critic", order: 1 },
    {
      name: "Refine",
      order: 2,
      condition: {
        field: "Critic.score",
        operator: "<",
        value: 0.8
      },
      maxRetries: 5
    }
  ]
}
```

## Listing and Managing

```typescript
// List all orchestrations
const allOrchestrations = await list_orchestrations({});

// Filter by tags
const codingFlows = await list_orchestrations({
  tags: ["coding"],
  activeOnly: true
});

// Get details
const details = await get_orchestration({
  nameOrId: "Code Generation Pipeline"
});

// Update
await update_orchestration({
  orchestrationId: "clf...",
  updates: {
    isActive: false, // Disable temporarily
    tags: ["coding", "deprecated"]
  }
});

// Delete
await delete_orchestration({
  orchestrationId: "clf..."
});
```

## Security & Permissions

Only roles with `tools: ['meta']` can:
- Create/update/delete roles
- Create/update/delete orchestrations

This prevents unauthorized agents from modifying the system.

## Best Practices

1. **Name Steps Clearly**: Use descriptive names like "Analyze Requirements" not "Step 1"
2. **Set Timeouts**: Always set reasonable timeouts (default is 5 minutes)
3. ** Use Retries for API Calls**: Network-dependent steps should have `maxRetries: 3`
4. **Tag Orchestrations**: Use tags like `["coding", "production"]` for organization
5. **Test Conditions**: Always test conditional logic before production use
6. **Map Context Carefully**: Be explicit about what data flows between steps

## Troubleshooting

### Execution Failed

```typescript
const status = await system.get_execution_status({ executionId: "..." });
console.log(status.error); // Check the error message
console.log(status.stepLogs); // See which step failed
```

### Step Timeout

Increase the timeout in the step definition:

```typescript
{
  name: "Long Running Task",
  timeout: 600000 // 10 minutes
}
```

### Role Not Found

Ensure the role exists:

```typescript
const roles = await system.list_roles();
console.log(roles);
```

## Future Enhancements

- **Loop Support**: `stepType: 'loop'` for iterative refinement
- **Branching**: Multiple conditional paths
- **Sub-Orchestrations**: Orchestrations that call other orchestrations
- **Human-in-the-Loop**: Pause for manual approval
- **Webhooks**: Trigger external systems on completion
