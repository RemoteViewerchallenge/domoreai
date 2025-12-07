# COC (Chain-Of-Command) Orchestrator

A minimal, safe-to-run local orchestrator for coordinating AI model tasks. Supports mock mode (default, no credentials required) and real mode (requires production modules).

## 🚀 Quick Start

### Run the Smoke Test (Mock Mode)

```bash
# From repository root
pnpm --filter @domoreai/coc start
```

This runs the orchestrator in **mock mode** using deterministic mock implementations. No API keys or external services required!

### View Trace Events

```bash
pnpm --filter @domoreai/coc replay
```

## 📁 Project Structure

```
packages/coc/
├── src/
│   ├── config.ts           # Configuration and env variable handling
│   ├── event-bus.ts        # In-memory pub/sub for events
│   ├── bandit.ts           # Epsilon-greedy bandit learner
│   ├── task-queue.ts       # In-memory task queue
│   ├── model-registry.ts   # MOCK model registry
│   ├── retriever.ts        # MOCK retriever/indexer
│   ├── evaluator.ts        # MOCK evaluator
│   ├── coc.ts              # Main orchestrator + CLI
│   └── index.ts            # Public exports
├── scripts/
│   └── replay.ts           # Trace replay utility
└── README.md               # This file
```

## 🎭 Mock vs Real Mode

### Mock Mode (Default)

**Safe for local development!** No credentials needed.

```bash
# Explicitly set mock mode (already the default)
COC_MODE=mock pnpm --filter @domoreai/coc start
```

**Mock Behavior:**
- Uses deterministic implementations in `packages/coc/src/*.ts`
- All files are clearly marked with `MOCK IMPLEMENTATION` comments
- Controlled by environment variables (see Configuration below)

### Real Mode

**Requires production modules!** Loads implementations from `packages/coc/src/prod/`.

```bash
COC_MODE=real pnpm --filter @domoreai/coc start
```

**To enable real mode:**

1. Create `packages/coc/src/prod/` directory
2. Add production implementations:
   - `packages/coc/src/prod/model-registry.ts`
   - `packages/coc/src/prod/retriever.ts`
   - `packages/coc/src/prod/evaluator.ts`

**If production modules are missing**, the orchestrator will exit with a clear error message and instructions.

## ⚙️ Configuration

All configuration is via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `COC_MODE` | `mock` | Mode: `mock` or `real` |
| `MOCK_SEED` | `42` | Seed for deterministic mock behavior |
| `MOCK_INJECT_FAILURE_RATE` | `0.0` | Failure injection rate (0.0-1.0) |
| `MOCK_LATENCY_MS` | `0` | Artificial latency in milliseconds |
| `TRACE_DIR` | `out/traces` | Directory for trace output |
| `BANDIT_PATH` | `out/bandit_state.json` | Path to bandit state file |

### Example: Testing with Failures

```bash
# Inject 30% failure rate with 100ms latency
MOCK_INJECT_FAILURE_RATE=0.3 MOCK_LATENCY_MS=100 pnpm --filter @domoreai/coc start
```

### Example: Different Seed

```bash
# Use different seed for varied mock responses
MOCK_SEED=12345 pnpm --filter @domoreai/coc start
```

## 📊 Trace Format

Traces are written to `out/traces/events.jsonl` in append-only JSONL format.

Each event is a JSON object with:
- `type`: Event type (e.g., `task.queued`, `task.completed`)
- `timestamp`: ISO 8601 timestamp
- Additional fields specific to event type

### Event Types

- `directive.started` - Directive execution began
- `directive.completed` - Directive execution finished
- `task.queued` - Task added to queue
- `task.started` - Worker picked up task
- `task.completed` - Task succeeded
- `task.failed` - Task failed
- `task.retried` - Task is being retried
- `evaluation.complete` - Evaluation finished
- `artifact.indexed` - Artifact indexed in retriever

## 🎯 Integration Points

### Event Bus Subscription

Judge, Librarian, or Planner can subscribe to events:

```typescript
import { eventBus } from '@domoreai/coc';

// Subscribe to task completions
const unsubscribe = eventBus.subscribe('task.completed', (event) => {
  console.log('Task completed:', event.data.taskId);
});

// Later, unsubscribe
unsubscribe();
```

See `docs/OBSERVABILITY.md` for details.

### Running Directives Programmatically

```typescript
import { runDirective } from '@domoreai/coc';

const spec = {
  id: 'my-directive',
  description: 'Custom directive',
  tasks: [
    {
      id: 'task-1',
      role: 'worker',
      prompt: 'Do something',
    }
  ],
  policies: {
    maxRetries: 3,
    retryDelayMs: 1000,
  },
};

await runDirective(spec);
```

## 🔧 Development

### Build

```bash
pnpm --filter @domoreai/coc build
```

### Run in Dev Mode

```bash
pnpm --filter @domoreai/coc dev
```

## 🧪 Testing

The smoke-run uses `agents/scenarios/sample_happy.json` if present, otherwise falls back to an inline demo scenario.

To test with custom scenarios, create JSON files in `agents/scenarios/` and modify `coc.ts` to load them.

## 📝 Notes

- **Mocks are clearly labeled**: Look for `MOCK IMPLEMENTATION` in file headers
- **Bandit state persists**: Learns across runs via `out/bandit_state.json`
- **Traces append only**: Safe for long-running orchestrations
- **No silent fallbacks**: Real mode fails loudly if prod modules are missing

## 🔒 Security

- No credentials or secrets are included in this package
- Mock mode is safe to commit and share
- Production modules (in `src/prod/`) should handle credentials securely
- Never commit API keys to version control

## 📚 Further Reading

- `docs/OBSERVABILITY.md` - Event bus integration and trace queries
- `agents/templates/README.md` - Template system documentation
- `agents/scenarios/sample_happy.json` - Example scenario
