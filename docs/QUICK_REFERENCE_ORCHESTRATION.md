# Quick Reference: Orchestration & Role Decoupling

## TL;DR

**Old way**: Roles baked into orchestrations = 1 orchestration per role configuration  
**New way**: Roles assigned at runtime = 1 orchestration, infinite configurations

---

## Creating an Orchestration (Template)

```typescript
import { trpc } from '../utils/trpc';

// Create a reusable workflow template
const orchestration = await trpc.orchestrationManagement.create.mutate({
  name: 'Data Processing Pipeline',
  description: 'Validate, transform, and store data',
  tags: ['data', 'pipeline'],
  steps: [
    {
      name: 'Validate Input',        // ⚠️ Name is used as key for role assignment!
      description: 'Check data validity',
      order: 0,
      stepType: 'sequential',
      inputMapping: { data: '{{context.input.data}}' },
      maxRetries: 2,
    },
    {
      name: 'Transform Data',
      description: 'Convert to target format',
      order: 1,
      stepType: 'sequential',
      inputMapping: { validated: '{{context["Validate Input"]}}' },
    },
    {
      name: 'Store Result',
      description: 'Save to database',
      order: 2,
      stepType: 'sequential',
      inputMapping: { transformed: '{{context["Transform Data"]}}' },
    },
  ],
});
```

**Key Points:**
- ✅ NO role selection during creation
- ✅ Focus on workflow logic only
- ✅ Use clear, descriptive step names (they're used as keys!)

---

## Executing an Orchestration (Runtime)

### Option 1: Explicit Role Assignment

```typescript
// Execute with specific roles for each step
const execution = await trpc.orchestrationManagement.execute.mutate({
  orchestrationId: 'orch_abc123',
  input: { data: { /* your data */ } },
  roleAssignments: {
    'Validate Input': 'role_strict_validator',
    'Transform Data': 'role_advanced_transformer',
    'Store Result': 'role_db_specialist',
  },
  userId: 'user_456',
});
```

### Option 2: Partial Role Assignment

```typescript
// Only assign roles for critical steps, let others use fallback
const execution = await trpc.orchestrationManagement.execute.mutate({
  orchestrationId: 'orch_abc123',
  input: { data: { /* your data */ } },
  roleAssignments: {
    'Transform Data': 'role_advanced_transformer', // Only this one!
  },
});
// 'Validate Input' and 'Store Result' will use fallback roles
```

### Option 3: Automatic Fallback

```typescript
// No role assignments - let system choose
const execution = await trpc.orchestrationManagement.execute.mutate({
  orchestrationId: 'orch_abc123',
  input: { data: { /* your data */ } },
  // roleAssignments omitted!
});
// All steps use fallback role selection
```

---

## Role Selection Fallback Strategy

When a step doesn't have an assigned role, the system:

1. **First**: Looks for a role named `'general_worker'`
2. **Then**: Uses the first available role in the database
3. **Error**: Throws if no roles exist at all

**Recommendation**: Create a `general_worker` role for reliable fallback:

```typescript
await trpc.role.create.mutate({
  name: 'general_worker',
  category: 'utility',
  basePrompt: 'You are a versatile AI assistant capable of handling various tasks competently.',
  needsReasoning: false,
});
```

---

## Common Use Cases

### Use Case 1: Testing Different Models

```typescript
const orchestrationId = 'orch_research_pipeline';
const input = { topic: 'Quantum Computing' };

// Test A: Fast & cheap
const executionA = await execute({
  orchestrationId,
  input,
  roleAssignments: {
    'Research': 'role_fast_researcher',
    'Summarize': 'role_quick_summarizer',
  },
});

// Test B: Deep & thorough
const executionB = await execute({
  orchestrationId,
  input,
  roleAssignments: {
    'Research': 'role_deep_researcher',
    'Summarize': 'role_expert_summarizer',
  },
});

// Compare results to optimize cost vs. quality
```

### Use Case 2: Dynamic Quality Levels

```typescript
function executeWithQuality(orchestrationId: string, input: any, quality: 'quick' | 'standard' | 'premium') {
  const roleMap = {
    quick: {
      'Analyze': 'role_basic_analyzer',
      'Review': 'role_quick_reviewer',
      'Format': 'role_simple_formatter',
    },
    standard: {
      'Analyze': 'role_standard_analyzer',
      'Review': 'role_thorough_reviewer',
      'Format': 'role_professional_formatter',
    },
    premium: {
      'Analyze': 'role_expert_analyzer',
      'Review': 'role_senior_reviewer',
      'Format': 'role_premium_formatter',
    },
  };

  return trpc.orchestrationManagement.execute.mutate({
    orchestrationId,
    input,
    roleAssignments: roleMap[quality],
  });
}

// Use it:
await executeWithQuality('orch_content_review', content, 'premium');
```

### Use Case 3: Specialized Processing

```typescript
// Same orchestration, different data types
const pipelineId = 'orch_data_pipeline';

// Process JSON data
await execute({
  orchestrationId: pipelineId,
  input: jsonData,
  roleAssignments: {
    'Validate': 'role_json_validator',
    'Transform': 'role_json_transformer',
  },
});

// Process CSV data
await execute({
  orchestrationId: pipelineId,
  input: csvData,
  roleAssignments: {
    'Validate': 'role_csv_validator',
    'Transform': 'role_csv_transformer',
  },
});
```

---

## Best Practices

### ✅ DO

- **Use clear step names**: They're used as keys for role assignment
  ```typescript
  ✅ "Analyze Code", "Generate Report"
  ❌ "Step1", "Step2"
  ```

- **Design generic orchestrations**: Make them role-agnostic
  ```typescript
  ✅ "Content Review Workflow"
  ❌ "Senior Dev Content Review Workflow"
  ```

- **Create a general_worker role**: For reliable fallback

- **Test different role combinations**: Find optimal config

### ❌ DON'T

- **Don't hardcode roles in orchestration names**: They're templates now
  ```typescript
  ❌ "Review with GPT-4"
  ✅ "Review Workflow"
  ```

- **Don't create duplicate orchestrations**: Use role assignments instead
  ```typescript
  ❌ "Quick Review", "Deep Review" (2 orchestrations)
  ✅ "Review" + different roleAssignments
  ```

- **Don't assume roles are always assigned**: Handle fallback gracefully

---

## API Snippets

### TypeScript Types

```typescript
// Step definition (design time)
interface CreateStepInput {
  name: string;                    // Used as key for role assignment
  description?: string;
  order: number;
  stepType?: 'sequential' | 'parallel' | 'conditional' | 'loop';
  inputMapping?: Record<string, any>;
  outputMapping?: Record<string, any>;
  maxRetries?: number;
  timeout?: number;
  parallelGroup?: string;
  // NOTE: NO roleId or roleName!
}

// Execution input (runtime)
interface ExecuteOrchestrationInput {
  orchestrationId: string;
  input: any;
  roleAssignments?: Record<string, string>; // stepName -> roleId
  userId?: string;
}
```

### React Component Example

```tsx
import { trpc } from '../utils/trpc';

function OrchestrationRunner() {
  const [orchestrationId, setOrchestrationId] = useState('');
  const [roleAssignments, setRoleAssignments] = useState<Record<string, string>>({});
  
  const executeMutation = trpc.orchestrationManagement.execute.useMutation();
  
  const handleExecute = async () => {
    await executeMutation.mutateAsync({
      orchestrationId,
      input: { /* your input */ },
      roleAssignments, // Dynamic assignment!
    });
  };

  return (
    <div>
      <select onChange={(e) => setOrchestrationId(e.target.value)}>
        {/* orchestrations */}
      </select>
      
      {/* Role assignment UI for each step */}
      
      <button onClick={handleExecute}>Execute</button>
    </div>
  );
}
```

---

## Troubleshooting

### Error: "No available role found for step X"

**Cause**: No roles exist in the database, or assigned role ID is invalid

**Solution**:
1. Create a `general_worker` role for fallback
2. Verify role IDs in `roleAssignments` are correct
3. Check that roles exist in the database

### Warning: "No role assigned for step X. Using fallback role Y"

**Cause**: Step doesn't have a role in `roleAssignments`

**Solution**: This is intentional fallback behavior. Either:
- Ignore it (fallback is working as expected)
- Assign a specific role to that step if needed

### Execution stuck in "running" status

**Cause**: One of the assigned roles doesn't have the required capabilities

**Solution**:
1. Check execution logs: `trpc.orchestrationManagement.getExecutionStatus`
2. Verify role capabilities match step requirements
3. Try different role assignments

---

## Migration from Old System

If you have existing orchestrations with hardcoded roles:

1. **Don't delete them yet**: They'll still work with fallback
2. **Create new templates**: Design role-agnostic orchestrations
3. **Test new approach**: Execute new templates with various role assignments
4. **Migrate gradually**: Move users to new system step by step

---

## Quick Links

- **Full Documentation**: [`docs/ORCHESTRATION_ROLE_DECOUPLING.md`](./ORCHESTRATION_ROLE_DECOUPLING.md)
- **Implementation Details**: [`docs/IMPLEMENTATION_ROLE_DECOUPLING.md`](./IMPLEMENTATION_ROLE_DECOUPLING.md)
- **Architecture Diagrams**: [`docs/ORCHESTRATION_ARCHITECTURE_DIAGRAMS.md`](./ORCHESTRATION_ARCHITECTURE_DIAGRAMS.md)
- **Demo Script**: [`apps/api/scripts/demo_role_decoupling.ts`](../apps/api/scripts/demo_role_decoupling.ts)

---

## Summary

| What | Where | How |
|------|-------|-----|
| **Create orchestration** | `OrchestrationCreatorPanel.tsx` | Define steps, no roles |
| **Execute orchestration** | `OrchestrationExecutor.tsx` | Assign roles, provide input |
| **Role fallback** | Automatic | `general_worker` → first available |
| **One template** | Multiple executions | Different `roleAssignments` |

**Remember**: Orchestrations are templates. Roles are runtime actors. 🎭
