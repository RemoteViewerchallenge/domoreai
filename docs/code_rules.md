# universal-coding-rules-ai-agents

# Project Philosophy

This project is a typesafe monorepo. All code should adhere to this principle and the rules outlined below.

## System Philosophy

### Exhaustive Fallbacks

The system must attempt to complete a task using all available free resources before giving up. This "try, fallback, exhaust" pattern is more resilient than a simple "try, retry, fail" pattern for a multi-provider system.

1.  **Select Best Option:** Choose the most appropriate free model from a healthy provider.
2.  **Attempt Execution:** Make the API call.
3.  **On Failure:** If the call fails (e.g., network error, provider error), mark that specific model as temporarily degraded.
4.  **Intra-Provider Fallback:** Attempt the same task with the next-best available model from the **same provider**, if one exists.
5.  **Inter-Provider Fallback:** If all models from the initial provider are exhausted or have failed, attempt the task with the next-best available model from a **different provider**.
6.  **Exhaustion:** Continue this fallback process (steps 4 and 5) until all viable free options across all providers have been attempted.
7.  **Final State:** Only after exhausting all possibilities should the task be marked as 'Failed'.

### Human-Specific Rules

- Do not read, write, or overwrite the `.env` file.
- Assume the human operator knows how to use an `.env` file or will learn.

# Provider keys are available and operational

---

### modularity

- One responsibility per file/class
- Max 300 lines per file
- No side effects on import
- Clear exports

### naming

- Use descriptive names
- Prefer `getUserById()` over `get()`
- Use abbreviations only if standard (e.g., API, HTTP)

### documentation

- JSDoc on all public functions with examples
- Inline comments only for non-obvious logic
- README per module with purpose and usage

## typescript

### strictness

````ts
// tsconfig.json
{
  "strict": true,
  "noImplicitAny": true,
  "strictNullChecks": true
}
types
Never use any; use unknown if truly unknown

Define interfaces for all data structures

Export types for reuse

error-handling
custom-errors
ts
class ProviderError extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}
typed-catch
ts
try {
  // ...
} catch (error) {
  if (error instanceof ProviderError) {
    // handle
  }
  throw error;
}
async-patterns
timeouts
ts
async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Timeout')), ms)
  );
  return Promise.race([promise, timeout]);
}
handle-promises
ts
// ❌ Wrong
fetchData();

// ✅ Correct
fetchData().catch(error => logger.error('Fetch failed', { error }));
logging
structured-only
ts
// ✅
logger.info('Action completed', {
  action: 'fetch',
  duration: 123,
  status: 'success'
});

// ❌
logger.info('Fetch took 123ms and succeeded');
log-levels
DEBUG: Detailed trace (off in prod)

INFO: Normal ops

WARN: Degraded but functional

ERROR: Operation failed

testing
structure
```typescript
import { describe, it, expect } from 'vitest';

describe('ComponentName', () => {
  it('should handle expected case', () => {
    expect(true).toBe(true);
  });
});
no-magic-numbers
ts
// ❌
expect(result).toBe(3);

// ✅
const EXPECTED_COUNT = 3;
expect(result).toBe(EXPECTED_COUNT);
performance
avoid-n-plus-one
Batch operations instead of per-item calls

cache-expensive
ts
const cache = new Map<string, CachedValue>();

async function getExpensive(key: string) {
  if (cache.has(key)) return cache.get(key);
  const value = await expensiveOperation(key);
  cache.set(key, value);
  return value;
}
lazy-loading
Delay init until needed (e.g., servers, connections)

security
no-secret-logs
ts
// ❌
logger.debug('API call', { apiKey: key });

// ✅
logger.debug('API call', { apiKey: '***' });
validate-input
ts
function processConfig(config: unknown): ValidConfig {
  const result = ConfigSchema.safeParse(config);
  if (!result.success) {
    throw new ValidationError(result.error);
  }
  return result.data;
}
rate-limiting
Apply client-side rate limiting before external API calls

dependencies
pinning
json
{
  "dependencies": {
    "express": "4.18.2"
  }
}
minimal
Prefer stdlib

Add only if saves significant time

configuration
env-vars
ts
const config = {
  apiKey: requireEnv('API_KEY'),
  timeout: parseInt(process.env.TIMEOUT || '5000')
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}
hot-reload
ts
fs.watch('config.json', () => {
  reloadConfig();
});
graceful-degradation
circuit-breaker
ts
class CircuitBreaker {
  private failures = 0;
  private lastFailure = 0;

  async call<T>(fn: () => Promise<T>): Promise<T> {
    if (this.isOpen()) throw new Error('Circuit open');

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private isOpen(): boolean {
    return this.failures >= 5 && Date.now() - this.lastFailure < 60000;
  }
}
backoff-jitter
ts
async function retry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxAttempts - 1) throw error;

      const baseDelay = 1000 * Math.pow(2, i);
      const jitter = Math.random() * 0.5 + 0.5;
      await sleep(baseDelay * jitter);
    }
  }
  throw new Error('Unreachable');
}
state-management
persistence
Use files, SQLite, or DB to persist state

atomic-updates
ts
await fs.writeFile('state.json.tmp', data);
await fs.rename('state.json.tmp', 'state.json');
versioning
ts
interface StateV1 {
  version: 1;
  data: OldFormat;
}

interface StateV2 {
  version: 2;
  data: NewFormat;
}

type State = StateV1 | StateV2;

function migrate(state: State): StateV2 {
  if (state.version === 2) return state;
  // Migration logic
}
best-practices
correlation-ids
ts
const requestId = crypto.randomUUID();
logger.info('Request started', { requestId });
health-endpoint
ts
app.get('/health', (req, res) => {
  const healthy = checkAllDependencies();
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ok' : 'degraded'
  });
});
graceful-shutdown
ts
process.on('SIGTERM', async () => {
  logger.info('Shutdown initiated');
  await server.close();
  await db.close();
  process.exit(0);
});
feature-flags
ts
const features = {
  newProvider: process.env.FEATURE_NEW_PROVIDER === 'true'
};
idempotency-keys
ts
const completed = new Set<string>();

async function processOnce(id: string, fn: () => Promise<void>) {
  if (completed.has(id)) return;
  await fn();
  completed.add(id);
}
golden-rule
If another agent (or human) can't understand your code in 5 minutes, simplify it.
````
