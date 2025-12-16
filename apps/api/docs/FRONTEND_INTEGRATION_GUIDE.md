# Frontend Integration Guide: Execution Engine Features

## Quick Reference for UI Developers

This guide explains how to integrate the new Execution Engine features into the frontend.

## 1. OrchestrationDesigner Component Updates

### Location
`/apps/ui/src/features/creator-studio/OrchestrationDesigner.tsx`

### Required Changes

#### A. Add Step Type Selector
Update the step type dropdown to include "sub_orchestration":

```tsx
const stepTypes = [
  { value: 'sequential', label: 'Sequential' },
  { value: 'parallel', label: 'Parallel' },
  { value: 'conditional', label: 'Conditional' },
  { value: 'loop', label: 'Loop' },
  { value: 'sub_orchestration', label: 'Sub-Orchestration' }, // NEW
];
```

#### B. Add Sub-Orchestration Selector
When `stepType === 'sub_orchestration'`, show a dropdown to select an orchestration:

```tsx
{selectedStep?.stepType === 'sub_orchestration' && (
  <div className="form-group">
    <label>Sub-Orchestration</label>
    <select
      value={selectedStep.subOrchestrationId || ''}
      onChange={(e) => updateStep({ subOrchestrationId: e.target.value })}
    >
      <option value="">Select orchestration...</option>
      {availableOrchestrations.map(orch => (
        <option key={orch.id} value={orch.id}>
          {orch.name}
        </option>
      ))}
    </select>
  </div>
)}
```

Fetch available orchestrations:
```tsx
const { data: orchestrations } = trpc.orchestration.list.useQuery();
```

#### C. Add Confidence Slider
Add a slider for minimum confidence (0.0 - 1.0):

```tsx
<div className="form-group">
  <label>
    Minimum Confidence: {selectedStep?.minConfidence?.toFixed(2) || '0.80'}
  </label>
  <input
    type="range"
    min="0"
    max="1"
    step="0.05"
    value={selectedStep?.minConfidence || 0.8}
    onChange={(e) => updateStep({ minConfidence: parseFloat(e.target.value) })}
    className="confidence-slider"
  />
  <div className="slider-labels">
    <span>Low (0.0)</span>
    <span>Medium (0.5)</span>
    <span>High (1.0)</span>
  </div>
</div>
```

#### D. Add Tier Selector
Add a dropdown for corporate tier selection:

```tsx
<div className="form-group">
  <label>Corporate Tier</label>
  <select
    value={selectedStep?.tier || 'Worker'}
    onChange={(e) => updateStep({ tier: e.target.value })}
  >
    <option value="Worker">Worker ($) - Fast, cheap models</option>
    <option value="Manager">Manager ($$) - Mid-tier models</option>
    <option value="Executive">Executive ($$$) - Premium models</option>
  </select>
  <p className="help-text">
    {selectedStep?.tier === 'Executive' && 'Best for strategic planning and complex reasoning'}
    {selectedStep?.tier === 'Manager' && 'Best for coordination and review tasks'}
    {selectedStep?.tier === 'Worker' && 'Best for execution and simple tasks'}
  </p>
</div>
```

### Complete Step Configuration Panel

```tsx
function StepConfigPanel({ selectedStep, updateStep, orchestrations }) {
  return (
    <div className="step-config-panel">
      <h3>Step Configuration</h3>
      
      {/* Basic Info */}
      <input
        type="text"
        placeholder="Step Name"
        value={selectedStep?.name || ''}
        onChange={(e) => updateStep({ name: e.target.value })}
      />
      
      {/* Step Type */}
      <select
        value={selectedStep?.stepType || 'sequential'}
        onChange={(e) => updateStep({ stepType: e.target.value })}
      >
        <option value="sequential">Sequential</option>
        <option value="parallel">Parallel</option>
        <option value="conditional">Conditional</option>
        <option value="loop">Loop</option>
        <option value="sub_orchestration">Sub-Orchestration</option>
      </select>
      
      {/* Sub-Orchestration Selector (conditional) */}
      {selectedStep?.stepType === 'sub_orchestration' && (
        <select
          value={selectedStep.subOrchestrationId || ''}
          onChange={(e) => updateStep({ subOrchestrationId: e.target.value })}
        >
          <option value="">Select orchestration...</option>
          {orchestrations?.map(orch => (
            <option key={orch.id} value={orch.id}>{orch.name}</option>
          ))}
        </select>
      )}
      
      {/* Confidence Slider */}
      <div className="confidence-control">
        <label>Min Confidence: {(selectedStep?.minConfidence || 0.8).toFixed(2)}</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={selectedStep?.minConfidence || 0.8}
          onChange={(e) => updateStep({ minConfidence: parseFloat(e.target.value) })}
        />
      </div>
      
      {/* Tier Selector */}
      <select
        value={selectedStep?.tier || 'Worker'}
        onChange={(e) => updateStep({ tier: e.target.value })}
      >
        <option value="Worker">Worker ($)</option>
        <option value="Manager">Manager ($$)</option>
        <option value="Executive">Executive ($$$)</option>
      </select>
    </div>
  );
}
```

## 2. Execution Viewer Component Updates

### Location
`/apps/ui/src/pages/VolcanoBoardroom.tsx` or similar execution viewer

### Required Changes

#### A. Nested Execution Tree View
Create a recursive component to display nested executions:

```tsx
function ExecutionStepTree({ step, depth = 0 }) {
  const [isExpanded, setIsExpanded] = useState(true);
  
  return (
    <div className="execution-step" style={{ marginLeft: `${depth * 20}px` }}>
      <div className="step-header" onClick={() => setIsExpanded(!isExpanded)}>
        <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
        <span className="step-name">{step.stepName}</span>
        
        {/* Tier Badge */}
        {step.tier && (
          <span className={`tier-badge tier-${step.tier.toLowerCase()}`}>
            {step.tier}
          </span>
        )}
        
        {/* Confidence Badge */}
        {step.confidence && (
          <span className={`confidence-badge ${getConfidenceClass(step.confidence)}`}>
            {(step.confidence * 100).toFixed(0)}% ✓
          </span>
        )}
        
        {/* Status */}
        <span className={`status-badge status-${step.status}`}>
          {step.status}
        </span>
      </div>
      
      {isExpanded && (
        <div className="step-details">
          <div className="step-output">
            {step.stepOutput}
          </div>
          
          {/* Sub-Execution Link */}
          {step.subExecutionId && (
            <div className="sub-execution-link">
              <a href={`/executions/${step.subExecutionId}`}>
                View Sub-Execution →
              </a>
            </div>
          )}
          
          <div className="step-meta">
            Duration: {(step.duration / 1000).toFixed(2)}s | 
            Attempts: {step.attempts}
          </div>
        </div>
      )}
    </div>
  );
}

function getConfidenceClass(confidence: number) {
  if (confidence >= 0.9) return 'high';
  if (confidence >= 0.7) return 'medium';
  return 'low';
}
```

#### B. Confidence Visualization
Add visual indicators for confidence levels:

```css
.confidence-badge {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.85em;
  font-weight: 600;
}

.confidence-badge.high {
  background: #10b981;
  color: white;
}

.confidence-badge.medium {
  background: #f59e0b;
  color: white;
}

.confidence-badge.low {
  background: #ef4444;
  color: white;
}
```

#### C. Tier Visualization
Add visual indicators for tiers:

```css
.tier-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.75em;
  font-weight: 600;
  text-transform: uppercase;
}

.tier-badge.tier-executive {
  background: #8b5cf6;
  color: white;
}

.tier-badge.tier-manager {
  background: #3b82f6;
  color: white;
}

.tier-badge.tier-worker {
  background: #6b7280;
  color: white;
}
```

## 3. tRPC Router Updates

### Location
`/apps/api/src/routers/orchestration.router.ts`

### Add Query for Orchestration List
```typescript
list: publicProcedure
  .query(async () => {
    return await OrchestrationService.listOrchestrations();
  }),
```

### Add Mutation for Creating Steps with New Fields
```typescript
createStep: publicProcedure
  .input(z.object({
    orchestrationId: z.string(),
    name: z.string(),
    stepType: z.enum(['sequential', 'parallel', 'conditional', 'loop', 'sub_orchestration']),
    subOrchestrationId: z.string().optional(),
    minConfidence: z.number().min(0).max(1).optional(),
    tier: z.enum(['Executive', 'Manager', 'Worker']).optional(),
    // ... other fields
  }))
  .mutation(async ({ input }) => {
    // Create step with new fields
  }),
```

## 4. Example Usage

### Creating a Hierarchical Workflow
```tsx
function CreateHierarchyWorkflow() {
  const createOrchestration = trpc.orchestration.create.useMutation();
  
  const handleCreate = async () => {
    await createOrchestration.mutateAsync({
      name: 'My Hierarchy',
      steps: [
        {
          name: 'Strategic Planning',
          order: 0,
          stepType: 'sequential',
          tier: 'Executive',
          minConfidence: 0.95
        },
        {
          name: 'Task Breakdown',
          order: 1,
          stepType: 'sequential',
          tier: 'Manager',
          minConfidence: 0.9
        },
        {
          name: 'Execute Tasks',
          order: 2,
          stepType: 'sequential',
          tier: 'Worker',
          minConfidence: 0.8
        }
      ]
    });
  };
  
  return <button onClick={handleCreate}>Create Hierarchy</button>;
}
```

### Creating a Recursive Workflow
```tsx
function CreateRecursiveWorkflow() {
  const orchestrations = trpc.orchestration.list.useQuery();
  const createOrchestration = trpc.orchestration.create.useMutation();
  
  const handleCreate = async () => {
    // First, select a sub-orchestration
    const subOrchId = orchestrations.data?.[0]?.id;
    
    await createOrchestration.mutateAsync({
      name: 'Parent Workflow',
      steps: [
        {
          name: 'Plan',
          order: 0,
          stepType: 'sequential',
          tier: 'Manager'
        },
        {
          name: 'Execute Department',
          order: 1,
          stepType: 'sub_orchestration',
          subOrchestrationId: subOrchId, // Reference to another orchestration
          minConfidence: 0.85
        }
      ]
    });
  };
  
  return <button onClick={handleCreate}>Create Recursive Workflow</button>;
}
```

## 5. Testing Checklist

- [ ] Can create steps with `stepType: 'sub_orchestration'`
- [ ] Can select an orchestration from dropdown for sub-steps
- [ ] Confidence slider updates `minConfidence` field (0.0 - 1.0)
- [ ] Tier selector updates `tier` field
- [ ] Execution viewer shows nested sub-executions
- [ ] Confidence badges display correctly
- [ ] Tier badges display correctly
- [ ] Can view sub-execution details by clicking link
- [ ] Recursive workflows execute without infinite loops

## 6. API Endpoints

### List Orchestrations
```typescript
GET /api/trpc/orchestration.list
Response: Orchestration[]
```

### Create Orchestration with New Fields
```typescript
POST /api/trpc/orchestration.create
Body: {
  name: string,
  steps: [{
    name: string,
    stepType: 'sequential' | 'parallel' | 'conditional' | 'loop' | 'sub_orchestration',
    subOrchestrationId?: string,
    minConfidence?: number,
    tier?: 'Executive' | 'Manager' | 'Worker',
    ...
  }]
}
```

### Execute Orchestration
```typescript
POST /api/trpc/orchestration.execute
Body: {
  orchestrationId: string,
  input: any,
  roleAssignments?: Record<string, string>
}
Response: OrchestrationExecution (with nested stepLogs)
```

## 7. Common Patterns

### Pattern 1: High-Stakes Decision Making
```typescript
{
  name: 'Critical Decision',
  tier: 'Executive',
  minConfidence: 0.95, // Require very high confidence
  maxRetries: 1 // Don't retry, get it right the first time
}
```

### Pattern 2: Bulk Processing
```typescript
{
  name: 'Process Items',
  tier: 'Worker',
  minConfidence: 0.7, // Lower confidence OK for bulk work
  maxRetries: 3 // Retry on failures
}
```

### Pattern 3: Department Delegation
```typescript
{
  name: 'Execute Department',
  stepType: 'sub_orchestration',
  subOrchestrationId: 'dept-workflow-id',
  tier: 'Manager', // Manager delegates to department
  minConfidence: 0.85
}
```

## Need Help?

See `/apps/api/docs/TASK_2_EXECUTION_ENGINE_SUMMARY.md` for full implementation details.
