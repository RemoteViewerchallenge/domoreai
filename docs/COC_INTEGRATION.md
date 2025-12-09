# CoC (Chain of Command) Integration

## Overview

The CoC package (`packages/coc`) contains advanced multi-agent orchestration logic with:
- **Model Bandit**: Automatic selection of free-tier models based on performance tracking
- **Role Bandit**: Intelligent role assignment based on task requirements
- **Rate Limit Arbitrage**: Exhaustive fallback through free providers
- **Real-time Event Streaming**: Track orchestration progress

This integration makes the CoC engine accessible from the UI.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         FRONTEND (UI)                        │
│  ┌────────────────────────────────────────────────────┐     │
│  │  Creator Studio > "CoC Engine" Tab                 │     │
│  │  - YAML/JSON spec editor                           │     │
│  │  - Execute button                                  │     │
│  │  - Live event stream (polls every 1s)              │     │
│  │  - Bandit state visualization                      │     │
│  └────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
                           │ tRPC
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      BACKEND (API)                           │
│  ┌────────────────────────────────────────────────────┐     │
│  │  apps/api/src/routers/coc.router.ts                │     │
│  │  - executeDirective (mutation)                     │     │
│  │  - getTraces (query, polled)                       │     │
│  │  - getBanditState (query)                          │     │
│  └────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  COC PACKAGE (Logic)                         │
│  packages/coc/src/                                           │
│  - coc.ts (runDirective - main orchestrator)                │
│  - model-bandit_Version2.ts (model selection)               │
│  - role-bandit-v2.ts (role assignment)                      │
│  - task-queue.ts (task management)                          │
│  - event-bus.ts (real-time events)                          │
│                                                              │
│  Output:                                                     │
│  - out/traces/events.jsonl (event log)                      │
│  - out/model_bandit_state.json (model performance)          │
│  - out/role_bandit_state.json (role performance)            │
└─────────────────────────────────────────────────────────────┘
```

---

## Entry Points

### 1. **UI: Creator Studio > CoC Engine Tab**
- **Location**: `apps/ui/src/pages/CreatorStudio.tsx`
- **Component**: `apps/ui/src/components/CoCOrchestrationPanel.tsx`
- **Features**:
  - YAML/JSON spec editor
  - Execute button
  - Live event streaming (polls `getTraces` every 1s during execution)
  - Bandit state visualization (updates every 5s)
  - Error/success feedback

### 2. **API: tRPC Router**
- **Location**: `apps/api/src/routers/coc.router.ts`
- **Endpoints**:
  - `coc.executeDirective` - Execute a CoC orchestration
  - `coc.getTraces` - Fetch recent event traces
  - `coc.getBanditState` - Get model & role bandit statistics

---

## Usage

### From UI
1. Navigate to **Creator Studio** (`/creator`)
2. Click the **"CoC Engine"** tab
3. Write/paste a YAML or JSON spec:
   ```yaml
   spec:
     - description: "Analyze codebase"
       deliverable: "analysis.md"
       acceptanceCriteria: "Clear findings"
     
     - description: "Write tests"
       deliverable: "tests/"
       acceptanceCriteria: "90% coverage"
   ```
4. Click **"Execute"**
5. Watch live events in the sidebar

### From Code (tRPC)
```typescript
const result = await trpc.coc.executeDirective.mutate({
  spec: {
    spec: [
      {
        description: "Task 1",
        deliverable: "output.txt",
        acceptanceCriteria: "Must be valid"
      }
    ]
  },
  meta: {
    userId: 'user-123'
  }
});
```

---

## Configuration

### Environment Variables
Set in `packages/coc/.env`:
- `COC_MODE=mock|real` - Use mock components or real API calls
- `MOCK_SEED=42` - Random seed for mock mode
- `MOCK_INJECT_FAILURE_RATE=0.1` - Simulate failures (0-1)
- `MOCK_LATENCY_MS=100` - Artificial latency

### Model Registry
CoC loads real models from:
- `apps/api/latest_models/models.json`
- Filters for `is_free: true` models
- Uses role requirements to score and select appropriate models

### Role Registry
CoC loads roles from:
- `agents/roles.json`
- Seeds the role bandit with real role definitions

---

## Key Differences: CoC vs. OrchestrationService

| Feature | CoC Engine | OrchestrationService |
|---------|------------|----------------------|
| **Model Selection** | Bandit-based, auto-selects free models | Manual role assignment |
| **Role Assignment** | Intelligent scoring based on requirements | Fixed role per step |
| **Rate Limiting** | Exhaustive fallbacks across providers | Single role failure = task failure |
| **Event Streaming** | Real-time JSONL traces | Database-backed logs |
| **Use Case** | Research, exploration, "free labor" | Production workflows |
| **UI Integration** | CoC Engine tab | Orchestration Creator/Executor |

---

## Troubleshooting

### "CoC package not found"
Ensure `packages/coc` is built:
```bash
cd packages/coc
pnpm build
```

### No events appearing
- Check that `out/traces/events.jsonl` is being written
- Verify polling is enabled (should happen automatically during execution)

### Bandit state empty
- Run at least one orchestration to seed the bandits
- Check `out/model_bandit_state.json` and `out/role_bandit_state.json`

---

## Future Enhancements

1. **WebSocket Integration**: Replace polling with real-time WebSocket events
2. **Persistent Storage**: Save orchestration specs to database
3. **Visual DAG**: Render task dependencies as a flowchart
4. **Performance Dashboard**: Visualize bandit statistics over time
5. **Hybrid Mode**: Allow users to override bandit selections manually
