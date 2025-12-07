# COC Observability Guide

This document describes how to observe and integrate with the COC (Chain-Of-Command) orchestrator.

## Overview

The COC orchestrator provides two main observability mechanisms:

1. **Trace Events** - Append-only JSONL log of all orchestration events
2. **Event Bus** - In-memory pub/sub for real-time event subscription

## Trace Events

### Trace File Location

Default: `out/traces/events.jsonl`

Configure via: `TRACE_DIR` environment variable

### Trace Format

Each line in the trace file is a JSON object representing one event:

```json
{
  "type": "task.completed",
  "timestamp": "2024-12-07T22:00:00.000Z",
  "taskId": "task-1",
  "additionalFields": "..."
}
```

### Event Types

#### Directive Events

**directive.started**
```json
{
  "type": "directive.started",
  "timestamp": "2024-12-07T22:00:00.000Z",
  "directiveId": "directive-1",
  "mode": "mock",
  "taskCount": 3
}
```

**directive.completed**
```json
{
  "type": "directive.completed",
  "timestamp": "2024-12-07T22:05:00.000Z",
  "directiveId": "directive-1"
}
```

#### Task Events

**task.queued**
```json
{
  "type": "task.queued",
  "timestamp": "2024-12-07T22:00:01.000Z",
  "taskId": "task-1",
  "role": "worker"
}
```

**task.started**
```json
{
  "type": "task.started",
  "timestamp": "2024-12-07T22:00:02.000Z",
  "taskId": "task-1"
}
```

**task.completed**
```json
{
  "type": "task.completed",
  "timestamp": "2024-12-07T22:00:05.000Z",
  "taskId": "task-1"
}
```

**task.failed**
```json
{
  "type": "task.failed",
  "timestamp": "2024-12-07T22:00:05.000Z",
  "taskId": "task-2",
  "error": "Evaluation failed: score too low",
  "retries": 1
}
```

**task.retried**
```json
{
  "type": "task.retried",
  "timestamp": "2024-12-07T22:00:06.000Z",
  "taskId": "task-2",
  "attempt": 2
}
```

#### Evaluation Events

**evaluation.complete**
```json
{
  "type": "evaluation.complete",
  "timestamp": "2024-12-07T22:00:04.000Z",
  "taskId": "task-1",
  "score": 0.85,
  "passed": true
}
```

#### Artifact Events

**artifact.indexed**
```json
{
  "type": "artifact.indexed",
  "timestamp": "2024-12-07T22:00:04.500Z",
  "taskId": "task-1",
  "artifactId": "artifact-task-1"
}
```

## Event Bus

The event bus provides real-time pub/sub for orchestration events.

### Subscribing to Events

```typescript
import { eventBus } from '@domoreai/coc';

// Subscribe to a specific event type
const unsubscribe = eventBus.subscribe('task.completed', async (event) => {
  console.log('Task completed:', event.data.taskId);
  console.log('Timestamp:', event.timestamp);
  
  // Perform async operations
  await logToDatabase(event);
});

// Later, unsubscribe
unsubscribe();
```

### Available Event Types

All event types from the trace format are published to the event bus:

- `directive.started`
- `directive.completed`
- `task.queued`
- `task.started`
- `task.completed`
- `task.failed`
- `task.retried`
- `evaluation.complete`
- `artifact.indexed`
- `trace.event` (meta-event when trace is written)

### Event Structure

```typescript
interface Event {
  type: EventType;
  timestamp: string;  // ISO 8601
  data: any;          // Event-specific data
}
```

### Integration Examples

#### Judge Integration

The Judge can subscribe to evaluation events to make escalation decisions:

```typescript
import { eventBus } from '@domoreai/coc';

eventBus.subscribe('evaluation.complete', async (event) => {
  const { taskId, score, passed } = event.data.evaluation;
  
  if (!passed && score < 0.3) {
    console.log(`Judge: Task ${taskId} needs escalation (score: ${score})`);
    // Trigger escalation logic
    await escalateTask(taskId);
  }
});
```

#### Librarian Integration

The Librarian can index artifacts as they're created:

```typescript
import { eventBus } from '@domoreai/coc';

eventBus.subscribe('artifact.indexed', async (event) => {
  const { taskId, artifactId } = event.data;
  
  console.log(`Librarian: Indexing artifact ${artifactId} for task ${taskId}`);
  
  // Perform additional indexing
  await librarian.enhanceIndex(artifactId);
});
```

#### Planner Integration

The Planner can monitor task failures to adjust future plans:

```typescript
import { eventBus } from '@domoreai/coc';

let failureCount = 0;

eventBus.subscribe('task.failed', async (event) => {
  failureCount++;
  
  if (failureCount > 5) {
    console.log('Planner: High failure rate detected, adjusting strategy');
    await planner.adjustStrategy('conservative');
  }
});

eventBus.subscribe('directive.completed', async (event) => {
  // Reset failure count
  failureCount = 0;
});
```

## Quick Queries

### Using jq to Query Traces

```bash
# Count events by type
cat out/traces/events.jsonl | jq -r '.type' | sort | uniq -c

# Get all failed tasks
cat out/traces/events.jsonl | jq 'select(.type == "task.failed")'

# Calculate average evaluation scores
cat out/traces/events.jsonl | jq 'select(.type == "evaluation.complete") | .score' | jq -s 'add/length'

# Get task timeline
cat out/traces/events.jsonl | jq 'select(.taskId == "task-1") | {type, timestamp}'

# Find tasks that required retries
cat out/traces/events.jsonl | jq 'select(.type == "task.retried") | .taskId' | sort -u
```

### Using the Replay Script

```bash
# View all events in a formatted timeline
pnpm --filter @domoreai/coc replay

# Filter by grepping
pnpm --filter @domoreai/coc replay | grep "task.failed"
```

## Mock Configuration

When running in mock mode, several knobs control behavior for testing:

| Variable | Default | Purpose |
|----------|---------|---------|
| `COC_MODE` | `mock` | Toggle between mock and real mode |
| `MOCK_SEED` | `42` | Seed for deterministic mock responses |
| `MOCK_INJECT_FAILURE_RATE` | `0.0` | Inject failures at this rate (0.0-1.0) |
| `MOCK_LATENCY_MS` | `0` | Artificial latency in milliseconds |

### Testing Failure Scenarios

```bash
# Test with 30% failure rate
MOCK_INJECT_FAILURE_RATE=0.3 pnpm --filter @domoreai/coc start

# View the failures
cat out/traces/events.jsonl | jq 'select(.type == "task.failed")'
```

### Testing Latency

```bash
# Add 200ms latency to all operations
MOCK_LATENCY_MS=200 pnpm --filter @domoreai/coc start
```

### Testing Determinism

```bash
# Run with same seed multiple times - should get identical results
MOCK_SEED=42 pnpm --filter @domoreai/coc start
MOCK_SEED=42 pnpm --filter @domoreai/coc start

# Compare traces (should be identical except timestamps)
```

## Monitoring Best Practices

1. **Subscribe Early**: Set up event bus subscriptions before running directives
2. **Handle Errors**: Event handlers should catch and log errors to avoid breaking the orchestrator
3. **Async Operations**: Event handlers can be async, but don't block unnecessarily
4. **Cleanup**: Unsubscribe when done to prevent memory leaks
5. **Trace Rotation**: Implement log rotation for long-running systems
6. **Index Traces**: Consider importing traces into a database for complex queries

## Production Considerations

When moving to real mode:

1. **Volume**: Traces can grow large - implement rotation and archival
2. **PII**: Sanitize traces if they contain sensitive data
3. **Performance**: Event bus handlers should be fast - offload heavy work
4. **Persistence**: Consider persisting event bus events to a queue (Redis, RabbitMQ)
5. **Monitoring**: Set up alerts on key metrics (failure rate, latency, queue depth)

## Troubleshooting

### Traces Not Written

- Check `TRACE_DIR` exists and is writable
- Verify orchestrator has completed at least one event
- Check file permissions

### Event Handlers Not Called

- Verify subscription was set up before event was published
- Check for errors in handler (logged to console)
- Ensure you're subscribing to the correct event type

### Determinism Issues

- Use `MOCK_SEED` to control randomness
- Check for non-deterministic code (timestamps, random UUIDs)
- Verify `MOCK_INJECT_FAILURE_RATE` is set to 0.0 for deterministic runs

## Further Reading

- `packages/coc/README.md` - COC package documentation
- `packages/coc/src/event-bus.ts` - Event bus implementation
- `packages/coc/scripts/replay.ts` - Trace replay utility
