# Real-Time Monitoring & Error Tracking System

## Overview
Complete observability system for C.O.R.E. with Redis persistence, WebSocket streaming, and comprehensive error tracking.

## Architecture

### Data Flow
```
API Call → Rate Limit Headers Extracted → Redis Storage → WebSocket Broadcast → Frontend Updates
API Call → Error Occurs → Postgres Log → WebSocket Broadcast → Frontend Display
COC Task → Progress Updates → WebSocket Broadcast → Live Task Monitor
```

## Components

### 1. Backend: Rate Limit Tracking (✅ Complete)
**File**: `packages/coc/src/rate-limit-tracker.ts`

**Features**:
- Redis storage with TTL (falls back to in-memory if Redis unavailable)
- Normalized header extraction for OpenRouter, Gemini, Groq, Mistral, Anthropic
- Intelligent usage scoring for model rotation
- Keys: `ratelimit:model:{provider}:{modelId}`

**Usage**:
```typescript
import { storeRateLimitData, getRateLimitStatus, calculateUsageScore } from './rate-limit-tracker';

// After API call
await storeRateLimitData('openrouter', 'nvidia/nemotron-nano', headers);

// Before model selection
const score = await calculateUsageScore('openrouter', 'nvidia/nemotron-nano');
const status = await getRateLimitStatus('openrouter', 'nvidia/nemotron-nano');
```

### 2. Backend: Postgres Error Tracking (✅ Complete)
**File**: `apps/api/prisma/schema.prisma`

**Tables**:

#### `ProviderErrorHistory`
- Tracks errors by provider/model/role/tools
- Aggregated by hour for analytics
- Fields: `errorCount`, `errorType`, `statusCode`, `details`, `hourBucket`
- Indexes on provider, model, errorType + hourBucket

#### `ModelPerformanceMetrics`
- Daily performance aggregates
- Fields: `avgLatencyMs`, `p95LatencyMs`, `successRate`, `totalCalls`
- Token usage tracking for cost analysis
- Unique constraint on (provider, model, role, dayBucket)

**Migration**: Run `npx prisma db push` when services are running

### 3. Backend: WebSocket Broadcasting (✅ Complete)
**File**: `apps/api/src/services/ws-broadcaster.ts`

**Functions**:
```typescript
broadcastRateLimitUpdate({ provider, model, remaining, limit, ... })
broadcastTaskProgress({ taskId, step, status, duration, ... })
broadcastModelSelected({ taskId, role, modelId, provider, ucbScore, ... })
broadcastError({ provider, model, role, tools, errorType, message, ... })
broadcastOrchestrationStep({ executionId, stepName, stepStatus, progress, ... })
```

**Integration Example** (in COC orchestrator):
```typescript
import { broadcastTaskProgress, broadcastModelSelected } from '../../../apps/api/src/services/ws-broadcaster.js';

// Before task execution
broadcastTaskProgress({
  taskId: 'task_123',
  step: 'Analyze Code',
  status: 'running',
  startTime: Date.now(),
});

// After model selection
const model = await modelBandit.selectArm(role);
broadcastModelSelected({
  taskId: 'task_123',
  role: 'worker',
  modelId: model.id,
  provider: model.provider,
  ucbScore: model.ucbScore,
  rateLimitScore: await calculateUsageScore(model.provider, model.id),
});

// On completion
broadcastTaskProgress({
  taskId: 'task_123',
  step: 'Analyze Code',
  status: 'completed',
  duration: Date.now() - startTime,
});
```

### 4. Frontend: RateLimitDashboard (✅ Complete)
**File**: `apps/ui/src/components/RateLimitDashboard.tsx`

**Features**:
- Real-time gauges per model (remaining/limit)
- Color-coded by provider (blue=OpenRouter, green=Gemini, purple=Groq, orange=Mistral)
- Throttle warnings with reset countdown
- Progress bars with percentage
- No polling - pure WebSocket updates

**Usage**:
```tsx
import { RateLimitDashboard } from './components/RateLimitDashboard';

<RateLimitDashboard className="mb-6" />
```

### 5. Frontend: LiveTaskMonitor (✅ Complete)
**File**: `apps/ui/src/components/LiveTaskMonitor.tsx`

**Features**:
- Active tasks with live duration counters
- Model selection details (model, provider, scores)
- Recent completed/failed tasks (auto-remove after 5s)
- Status icons (play, checkmark, X)
- Real-time updates via WebSocket

**Usage**:
```tsx
import { LiveTaskMonitor } from './components/LiveTaskMonitor';

<LiveTaskMonitor className="mb-6" />
```

### 6. Frontend: ErrorStreamPanel (✅ Complete)
**File**: `apps/ui/src/components/ErrorStreamPanel.tsx`

**Features**:
- Scrolling list of last 100 errors
- Full context: provider, model, role, tools used
- Error type badges (rate_limit, auth_failed, timeout, invalid_response, network_error)
- Filters by provider and error type
- Timestamps with "time ago" display
- Auto-updates via WebSocket

**Usage**:
```tsx
import { ErrorStreamPanel } from './components/ErrorStreamPanel';

<ErrorStreamPanel className="mb-6" maxErrors={100} />
```

## WebSocket Event Types

### From Backend → Frontend

| Event Type | Data | Trigger |
|------------|------|---------|
| `ratelimit.update` | `provider, model, remaining, limit, resetTimestamp, isThrottled` | After every API call |
| `task.progress` | `taskId, step, status, duration, startTime` | Task start/update/complete |
| `model.selected` | `taskId, role, modelId, provider, ucbScore, rateLimitScore` | Bandit selects model |
| `error.occurred` | `provider, model, role, tools, errorType, statusCode, message` | Any error caught |
| `orchestration.step` | `executionId, orchestrationId, stepName, stepStatus, progress` | Orchestration step change |

## Integration Steps

### 1. Enable Redis in COC
```bash
# Ensure Redis is running
docker-compose up -d redis

# COC will auto-connect via @repo/common/redis-client
```

### 2. Wire Broadcasting in API Layer
```typescript
// In apps/api/src/services/AgentRuntime.ts or similar
import { broadcastError, broadcastRateLimitUpdate } from './ws-broadcaster.js';
import { storeRateLimitData } from '../../../packages/coc/src/rate-limit-tracker';

try {
  const response = await makeAPICall(...);
  
  // Store rate limits
  const headers = extractRateLimitHeaders(response.headers);
  await storeRateLimitData(provider, modelId, headers);
  
  // Broadcast to UI
  broadcastRateLimitUpdate({
    provider,
    model: modelId,
    remaining: headers.remaining || 999,
    limit: headers.limit || 1000,
    resetTimestamp: headers.resetTimestamp || 0,
    isThrottled: false,
  });
} catch (error) {
  // Log to Postgres
  await logErrorToDatabase(error);
  
  // Broadcast to UI
  broadcastError({
    provider,
    model: modelId,
    role: currentRole,
    tools: activeTools,
    errorType: determineErrorType(error),
    statusCode: error.statusCode,
    message: error.message,
  });
}
```

### 3. Add Dashboard to UI
```tsx
// In apps/ui/src/pages/Dashboard.tsx or similar
import { RateLimitDashboard } from '../components/RateLimitDashboard';
import { LiveTaskMonitor } from '../components/LiveTaskMonitor';
import { ErrorStreamPanel } from '../components/ErrorStreamPanel';

export function MonitoringDashboard() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RateLimitDashboard />
        <LiveTaskMonitor />
      </div>
      <ErrorStreamPanel />
    </div>
  );
}
```

## Analytics Queries

### Hourly Error Rates
```sql
SELECT 
  provider_id,
  error_type,
  hour_bucket,
  SUM(error_count) as total_errors
FROM provider_error_history
WHERE hour_bucket >= NOW() - INTERVAL '24 hours'
GROUP BY provider_id, error_type, hour_bucket
ORDER BY hour_bucket DESC;
```

### Daily Model Performance
```sql
SELECT 
  provider_id,
  model_id,
  day_bucket,
  avg_latency_ms,
  success_rate,
  total_calls
FROM model_performance_metrics
WHERE day_bucket >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY day_bucket DESC, success_rate DESC;
```

### Error Breakdown by Role
```sql
SELECT 
  role_id,
  error_type,
  COUNT(*) as error_count
FROM provider_error_history
WHERE hour_bucket >= NOW() - INTERVAL '24 hours'
GROUP BY role_id, error_type
ORDER BY error_count DESC;
```

## Benefits

### Real-Time Visibility
- ✅ See rate limits across all providers instantly
- ✅ Watch tasks execute with live duration counters
- ✅ Catch errors as they happen with full context

### Intelligent Resource Usage
- ✅ Redis caching prevents redundant quota checks
- ✅ UCB + rate limit scoring maximizes free tier usage
- ✅ Automatic throttle detection and recovery

### Historical Analytics
- ✅ Postgres stores error patterns for root cause analysis
- ✅ Daily performance metrics show model reliability trends
- ✅ Hour-bucket aggregates for time-series dashboards

### Developer Experience
- ✅ No polling - pure event-driven updates
- ✅ Modular components - use individually or together
- ✅ Type-safe with TypeScript throughout
- ✅ Graceful degradation (Redis optional, WebSocket optional)

## Next Steps
1. Run COC with Redis enabled
2. Wire broadcasting calls in orchestration service
3. Add monitoring dashboard to UI navigation
4. Run database migration for analytics tables
5. Build Grafana dashboards from Postgres metrics
