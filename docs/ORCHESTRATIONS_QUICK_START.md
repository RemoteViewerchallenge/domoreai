# Orchestrations: Quick Start Guide

## What Are Orchestrations Now?

**Orchestrations are WORKFLOW TEMPLATES** - reusable blueprints that you assign roles to at execution time.

---

## Key Concept

### 🎭 Separation of Concerns:
- **Orchestrations** = Workflow logic (steps, conditions, flow)
- **Roles** = AI identities (capabilities, prompts, personality)

They're **combined at runtime**, not design time!

---

## How Many Orchestrations Can You Have?

**AS MANY AS YOU WANT!** Each orchestration is a reusable template.

Example orchestrations you might create:
1. "Code Review Workflow"
2. "Content Generation Pipeline"
3. "Data Analysis Process"
4. "Customer Support Flow"
5. "Research & Summarization"
6. ...etc!

---

## Creating an Orchestration

### In `OrchestrationCreatorPanel`:

1. Click **"+ NEW"**
2. Give it a name: e.g., "Content Creation"
3. Add steps:
   - Step 1: "Research Topic" (no role assigned!)
   - Step 2: "Write Draft" (no role assigned!)
   - Step 3: "Edit & Polish" (no role assigned!)
4. Configure each step (input/output mapping, conditions, etc.)
5. Click **"SAVE"**

**That's it!** You've created a reusable template.

---

## Executing an Orchestration

### Option 1: OrchestrationExecutor Component (Recommended)

File: `apps/ui/src/components/OrchestrationExecutor.tsx`

**Usage:**
1. Select an orchestration from the dropdown
2. Assign roles to each step:
   ```
   Research Topic     →  [Select: fast_researcher]
   Write Draft        →  [Select: creative_writer]
   Edit & Polish      →  [Select: editor_bot]
   ```
3. Provide input data (JSON)
4. Click **"Execute Orchestration"**

### Option 2: API/Code

```typescript
await trpc.orchestrationManagement.execute.mutate({
  orchestrationId: "orch_abc123",
  input: { topic: "AI in Healthcare" },
  roleAssignments: {
    "Research Topic": "fast_researcher",
    "Write Draft": "creative_writer",
    "Edit & Polish": "editor_bot"
  }
});
```

---

## Example: Same Orchestration, Different Roles

```
Orchestration: "Blog Post Creation"
├─ Step 1: Research
├─ Step 2: Write
└─ Step 3: Edit

Execution A (Quick Draft):
  Research: fast_researcher
  Write: quick_writer
  Edit: basic_editor
  Result: Done in 30 seconds, good enough

Execution B (Premium Quality):
  Research: deep_researcher
  Write: expert_writer
  Edit: senior_editor
  Result: Takes 5 minutes, publication-ready

Both use the SAME orchestration template!
```

---

## Where's the Execute Button?

The `OrchestrationExecutor` component exists but might not be wired into your UI yet!

### To Add It:

Find your main navigation/routing and add:
```tsx
import OrchestrationExecutor from './components/OrchestrationExecutor';

// In your routes/tabs:
<Tab name="Execute Orchestration">
  <OrchestrationExecutor />
</Tab>
```

Or create a page for it:
```tsx
// apps/ui/src/pages/ExecuteOrchestration.tsx
import OrchestrationExecutor from '../components/OrchestrationExecutor';

export default function ExecuteOrchestrationPage() {
  return <OrchestrationExecutor className="h-full" />;
}
```

---

## Fallback Behavior

If you **DON'T** assign roles:
```typescript
await trpc.orchestrationManagement.execute.mutate({
  orchestrationId: "orch_abc123",
  input: { topic: "AI" },
  // roleAssignments omitted!
});
```

The system automatically:
1. Tries to use `'general_worker'` role
2. Falls back to first available role
3. Logs a warning

**Recommended:** Always assign roles explicitly for predictable results!

---

## Benefits

### Before (Coupled):
- ❌ 3 workflows × 5 role configs = **15 orchestrations**
- ❌ Change workflow logic = edit all 15
- ❌ Hard to manage

### After (Decoupled):
- ✅ 3 workflows × assign roles at runtime = **3 orchestrations**
- ✅ Change workflow logic = edit once
- ✅ Easy to manage
- ✅ Infinite role combinations

---

## Quick Reference

| Action | Where | Result |
|--------|-------|--------|
| **Create** orchestration | OrchestrationCreatorPanel | Saves template |
| **Execute** orchestration | OrchestrationExecutor | Runs with assigned roles |
| **View** executions | Orchestration management | See history/logs |
| **Edit** orchestration | OrchestrationCreatorPanel | Modify template |

---

## Common Questions

**Q: Can I have multiple orchestrations?**  
A: YES! As many as you want. Each is a reusable template.

**Q: Do I assign roles when creating?**  
A: NO! You assign roles when EXECUTING, not creating.

**Q: What if I don't assign roles?**  
A: System uses fallback (`general_worker` or first available), but this is not recommended.

**Q: Can I use the same orchestration with different roles?**  
A: YES! That's the whole point! One template, infinite configurations.

**Q: Where do I execute orchestrations?**  
A: Use the `OrchestrationExecutor` component (you may need to add it to your UI navigation).

---

## Next Steps

1. ✅ You've created an orchestration - Great!
2. 🔄 Find/add `OrchestrationExecutor` to your UI
3. 🎯 Execute it with different role assignments
4. 📊 View execution logs and results
5. 🔁 Iterate and improve!

---

**Remember:** Orchestrations are TEMPLATES. Roles are ACTORS. Combine them at RUNTIME! 🎭
