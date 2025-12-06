# Orchestration & Role Decoupling Architecture

## Overview

The orchestration system has been refactored to **separate workflow logic from identity**. This enables orchestrations to be **reusable templates** that can accept different role assignments at execution time, rather than having roles baked into the orchestration definition.

## Core Concept

### Before (Coupled)
- Orchestrations had roles **hardcoded** into each step
- To use different roles, you needed to create **multiple orchestrations**
- Example: "Code Review with Junior Dev" vs "Code Review with Senior Dev" = 2 orchestrations

### After (Decoupled)
- Orchestrations define **workflow templates** (steps, logic, flow)
- Roles are **assigned at execution time**
- Example: "Code Review" orchestration + role assignments = infinite configurations

## Architecture

```
┌─────────────────────────────────────────┐
│         Orchestration Template          │
│  (Pure workflow logic, no roles)        │
│                                         │
│  Steps:                                 │
│  1. "Analyze Code"                      │
│  2. "Generate Report"                   │
│  3. "Suggest Improvements"              │
└─────────────────────────────────────────┘
                    │
                    │ Execution Time
                    ▼
┌─────────────────────────────────────────┐
│         Role Assignments                │
│  (Dynamic mapping: step -> role)        │
│                                         │
│  {                                      │
│    "Analyze Code": "senior_reviewer",   │
│    "Generate Report": "report_bot",     │
│    "Suggest Improvements": "mentor"     │
│  }                                      │
└─────────────────────────────────────────┘
```

## Database Schema

### OrchestrationStep Model
```prisma
model OrchestrationStep {
  id              String   @id @default(cuid())
  orchestrationId String
  name            String   // Used as key for role assignment
  description     String?
  order           Int
  
  // ❌ REMOVED: roleId, roleName
  // Roles are now assigned at execution time, not design time
  
  // Workflow logic
  stepType        String   @default("sequential")
  condition       Json?
  inputMapping    Json?
  outputMapping   Json?
  maxRetries      Int      @default(0)
  timeout         Int?
  parallelGroup   String?
  
  // ...
}
```

## API Usage

### Creating an Orchestration (Design Time)

Orchestrations are now **pure workflow templates**:

```typescript
// Create a reusable "Code Review" orchestration
await trpc.orchestrationManagement.create.mutate({
  name: "Code Review Workflow",
  description: "Analyze code and provide feedback",
  steps: [
    {
      name: "Analyze Code",
      order: 0,
      stepType: "sequential",
      inputMapping: { code: "{{context.input.code}}" }
    },
    {
      name: "Generate Report",
      order: 1,
      stepType: "sequential",
      inputMapping: { analysis: "{{context['Analyze Code']}}" }
    }
  ]
});
```

Note: **No role selection during creation!**

### Executing an Orchestration (Runtime)

Roles are assigned **dynamically at execution time**:

```typescript
// Execute with Senior Reviewer
await trpc.orchestrationManagement.execute.mutate({
  orchestrationId: "orch_123",
  input: { code: "function hello() { ... }" },
  roleAssignments: {
    "Analyze Code": "role_senior_reviewer",
    "Generate Report": "role_report_bot"
  }
});

// Same orchestration, different roles!
await trpc.orchestrationManagement.execute.mutate({
  orchestrationId: "orch_123", // Same orchestration!
  input: { code: "function hello() { ... }" },
  roleAssignments: {
    "Analyze Code": "role_junior_reviewer",  // Different role
    "Generate Report": "role_simple_reporter" // Different role
  }
});
```

### Automatic Fallback

If no roles are assigned, the system uses a **fallback strategy**:

```typescript
// No role assignments provided
await trpc.orchestrationManagement.execute.mutate({
  orchestrationId: "orch_123",
  input: { code: "function hello() { ... }" }
  // roleAssignments omitted!
});

// System will:
// 1. Try to find 'general_worker' role
// 2. Fall back to first available role
// 3. Log a warning about the fallback
```

## Service Layer

### OrchestrationService.executeOrchestration

```typescript
static async executeOrchestration(
  orchestrationId: string,
  input: any,
  roleAssignments?: Record<string, string>,  // NEW: Optional role map
  userId?: string
): Promise<OrchestrationExecution>
```

**Parameters:**
- `orchestrationId`: The template to execute
- `input`: Initial data for the workflow
- `roleAssignments`: **Optional** map of `stepName -> roleId`
- `userId`: User triggering the execution

**Role Selection Logic** (in `executeStep`):
1. Check if `roleAssignments[stepName]` exists → use that role
2. Otherwise, try to find `'general_worker'` role
3. Otherwise, use the first available role
4. If no roles exist, throw an error

## UI Components

### OrchestrationCreatorPanel
- **Removed**: Role selection dropdowns
- **Focus**: Define workflow logic only
- Steps are identified by `name` (used as key for role assignment)

### OrchestrationExecutor (New!)
- **Purpose**: Execute orchestrations with dynamic role assignments
- **Features**:
  - Select an orchestration template
  - Assign roles to each step (optional)
  - Provide input data
  - Execute with custom configuration

## Benefits

### 1. **Reusability**
One orchestration → many configurations
```
"Data Pipeline" orchestration:
  + Fast roles = Quick analysis
  + Thorough roles = Deep analysis
  + Mixed roles = Balanced approach
```

### 2. **Flexibility**
Adapt workflows to changing requirements without editing orchestrations
```
Before: Need to edit orchestration for each role change
After: Just change roleAssignments at execution time
```

### 3. **Experimentation**
Test different role combinations easily
```typescript
// A/B test: Which role combo performs better?
const runA = execute(orch, input, { step1: "roleA", step2: "roleB" });
const runB = execute(orch, input, { step1: "roleC", step2: "roleD" });
```

### 4. **Scalability**
Avoid orchestration explosion
```
Before: 3 workflows × 5 role configs = 15 orchestrations
After: 3 workflows × (assign roles at runtime) = 3 orchestrations
```

## Migration Guide

### For Existing Orchestrations

1. **Database**: The schema already has `roleId` and `roleName` commented out
2. **Execution**: Old executions will use the fallback strategy
3. **UI**: Remove role selection from orchestration editor

### For New Orchestrations

1. Design orchestrations as **workflow templates**
2. Name steps clearly (names are used as keys for role assignment)
3. Use `OrchestrationExecutor` UI to assign roles at execution time

## Best Practices

### 1. Step Naming
Use clear, descriptive step names since they're used as keys:
```typescript
✅ Good: "Analyze Code", "Generate Report", "Send Notification"
❌ Bad: "Step 1", "Step 2", "Step 3"
```

### 2. Generic Orchestrations
Design orchestrations to be role-agnostic:
```typescript
✅ Good: "Code Review Workflow"
❌ Bad: "Senior Dev Code Review Workflow"
```

### 3. Role Assignment Strategy
- **Critical steps**: Always assign specific roles
- **Generic steps**: Let fallback handle it
- **Experimentation**: Try different role combinations

### 4. Fallback Configuration
Ensure you have a `'general_worker'` role for fallback scenarios:
```typescript
await trpc.role.create.mutate({
  name: "general_worker",
  basePrompt: "You are a versatile AI assistant...",
  // ...
});
```

## Example Use Cases

### Use Case 1: Content Generation Pipeline
```typescript
// One orchestration, multiple quality levels
const orchestration = {
  name: "Content Generation",
  steps: [
    { name: "Research Topic", order: 0 },
    { name: "Write Draft", order: 1 },
    { name: "Edit Content", order: 2 }
  ]
};

// Quick draft mode
execute(orch.id, { topic: "AI" }, {
  "Research Topic": "fast_researcher",
  "Write Draft": "quick_writer",
  "Edit Content": "basic_editor"
});

// Premium mode
execute(orch.id, { topic: "AI" }, {
  "Research Topic": "deep_researcher",
  "Write Draft": "expert_writer",
  "Edit Content": "senior_editor"
});
```

### Use Case 2: Data Processing
```typescript
// One orchestration, different data types
const orchestration = {
  name: "Data Processing",
  steps: [
    { name: "Validate Input", order: 0 },
    { name: "Transform Data", order: 1 },
    { name: "Store Result", order: 2 }
  ]
};

// Process JSON
execute(orch.id, jsonData, {
  "Validate Input": "json_validator",
  "Transform Data": "json_transformer"
});

// Process CSV
execute(orch.id, csvData, {
  "Validate Input": "csv_validator",
  "Transform Data": "csv_transformer"
});
```

## Summary

| Aspect | Before | After |
|--------|--------|-------|
| **Design** | Workflow + Roles | Workflow only |
| **Execution** | Fixed roles | Dynamic roles |
| **Reusability** | Low (1 config per orch) | High (infinite configs) |
| **Flexibility** | Requires editing orchestration | Change at execution time |
| **Scalability** | O(workflows × roles) | O(workflows) |

The new architecture treats orchestrations as **templates** and roles as **runtime actors**, enabling maximum flexibility and reusability.
