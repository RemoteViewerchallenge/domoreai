# Ghost Records Pattern Implementation

## Overview

The **Ghost Records Pattern** solves the "Missing Models" problem by treating provider API responses as **one source of truth**, not the **only** source of truth. This architecture protects against:

- Provider APIs returning empty lists due to timeouts or rate limits
- Beta/legacy models not appearing in official indexes
- Fine-tuned or user-specific models being hidden from public lists

## Architecture

### Three Discovery Sources

Models can enter the system through three channels:

1. **INDEX** - Found in the provider's official JSON list (from `/v1/models` API)
2. **INFERENCE** - Successfully used in a chat/job, auto-discovered at runtime
3. **MANUAL** - Explicitly added by the user

### Lifecycle Tracking

Each model has lifecycle metadata:

- `firstSeenAt` - When we first discovered this model
- `lastSeenAt` - Last time we confirmed it exists (updated on every ingestion or successful use)
- `isActive` - Boolean flag for UI filtering (inactive models show with warnings)
- `source` - Discovery channel (INDEX/INFERENCE/MANUAL)

### Safe Deletion Strategy

Instead of deleting models when they disappear from provider lists:

1. **Soft Delete**: Mark as `isActive = false` if not seen in 24 hours
2. **Preserve Data**: Keep all model data intact
3. **Hard Delete**: Only after 30+ days of inactivity (and never for MANUAL models)

## Database Schema

```prisma
model Model {
  // ... existing fields ...
  
  // Ghost Records Pattern fields
  isActive     Boolean @default(true)
  source       ModelSource @default(INDEX)
  firstSeenAt  DateTime @default(now())
  lastSeenAt   DateTime @default(now())
  
  @@index([providerId, lastSeenAt])
}

enum ModelSource {
  INDEX      // From provider's official list
  INFERENCE  // Discovered during runtime
  MANUAL     // User-added
}
```

## Usage

### 1. Ingesting Provider Models

Run the seeder to import models from JSON files:

```bash
# From monorepo root
cd apps/api
pnpm run seed:models

# Or with custom directory
pnpm run seed:models -- --dir ./path/to/models
```

This will:
- Read all `*.json` files from `latest_models/` (or custom dir)
- Upsert each model (create if new, update if exists)
- Update `lastSeenAt` for all models found
- Set `source = INDEX` for new models
- Preserve existing `source` for discovered models

### 2. Tracking Runtime Discovery

When a model is successfully used in production:

```typescript
import { ModelDiscoveryService } from './services/ModelDiscoveryService';

// After successful completion
await ModelDiscoveryService.trackSuccessfulInference(
  providerId,
  'gpt-4.5-preview', // Model ID
  'GPT-4.5 Preview',  // Optional human name
  {
    // Optional metadata
    contextWindow: 128000,
    successfulAt: new Date().toISOString()
  }
);
```

This will:
- Create the model if it doesn't exist (with `source = INFERENCE`)
- Update `lastSeenAt` if it already exists
- Mark it as `isActive = true`

### 3. Marking Stale Models

Periodically (e.g., daily cron job):

```typescript
import { ModelDiscoveryService } from './services/ModelDiscoveryService';

// Mark models not seen in 24 hours as inactive
const staleCount = await ModelDiscoveryService.markStaleModelsInactive(
  undefined, // All providers (or pass specific providerId)
  24         // Hours threshold
);

console.log(`Marked ${staleCount} models as inactive`);
```

This will:
- Find models with `lastSeenAt < 24 hours ago`
- Set `isActive = false`
- **Never** touch MANUAL models (user explicitly added them)

### 4. Viewing Discovery Statistics

```typescript
const stats = await ModelDiscoveryService.getDiscoveryStats();

console.log(stats);
// {
//   total: 450,
//   bySource: { INDEX: 400, INFERENCE: 45, MANUAL: 5 },
//   active: 445,
//   inactive: 5
// }
```

### 5. Cleanup (Optional)

After 30+ days, permanently delete inactive models:

```typescript
// Delete inactive models not seen in 30 days
const deletedCount = await ModelDiscoveryService.deleteOldInactiveModels(30);

console.log(`Permanently deleted ${deletedCount} dead models`);
```

**Note**: This never deletes MANUAL models, even if inactive.

## Integration Points

### Orchestrator / Model Selection

When selecting models for jobs, filter by `isActive`:

```typescript
const availableModels = await prisma.model.findMany({
  where: {
    isActive: true,  // Only use confirmed-working models
    isFree: true,    // Zero-Burn mode
    capabilities: {
      has: 'text'
    }
  }
});
```

### UI Display

Show inactive models with warnings:

```typescript
const allModels = await prisma.model.findMany({
  include: {
    provider: true
  }
});

allModels.forEach(model => {
  if (!model.isActive) {
    console.warn(`⚠️  ${model.name} is inactive (last seen: ${model.lastSeenAt})`);
  }
});
```

### Provider Health Checks

If a provider's ingestion returns 0 models, **don't panic**:

```typescript
const modelList = await fetchModelsFromProvider(provider);

if (modelList.length === 0) {
  console.warn(`⚠️  ${provider.label} returned 0 models - likely API timeout`);
  console.warn(`   Existing models preserved. Run health check later.`);
  // Do NOT delete existing models!
  return;
}

// Proceed with normal ingestion
await UnifiedIngestionService.ingestAllModels();
```

## Benefits

### 1. **Resilience**
- Provider API glitches don't wipe your model catalog
- Temporary rate limits don't cause data loss

### 2. **Discovery**
- Catch models that providers don't list publicly
- Track which models are actually being used

### 3. **Audit Trail**
- Know where each model came from
- Track when models were first/last seen

### 4. **Safe Cleanup**
- Soft delete before hard delete
- Never lose user-configured models

## Migration Path

If you have existing models in the database:

1. **Run the migration**:
   ```bash
   cd apps/api
   npx prisma migrate dev --name add_ghost_records_pattern
   ```

2. **Backfill timestamps**:
   All existing models will get:
   - `source = INDEX` (default)
   - `isActive = true` (default)
   - `firstSeenAt = now()` (default)
   - `lastSeenAt = now()` (default)

3. **Re-run ingestion**:
   ```bash
   pnpm run seed:models
   ```
   This updates `lastSeenAt` for all models found in your JSON files.

## Files Modified/Created

### Schema
- `apps/api/prisma/schema.prisma` - Added Ghost Records fields

### Services
- `apps/api/src/services/UnifiedIngestionService.ts` - Updated upsert logic
- `apps/api/src/services/ModelDiscoveryService.ts` - New service for lifecycle management

### Scripts
- `apps/api/src/scripts/seed-ghost-records.ts` - Seeding script

### Package Scripts
- `apps/api/package.json` - Added `seed:models` command

## Next Steps

1. **Run the seeder** to populate your database with the 10 JSON files
2. **Integrate discovery tracking** into your orchestrator/agent runtime
3. **Set up a cron job** to mark stale models (optional)
4. **Update UI** to show inactive models with warnings

## Questions?

- **Q: What if I want to force-refresh a model?**
  - A: Just re-run the seeder. It will update `lastSeenAt` and set `isActive = true`.

- **Q: Can I manually add a model?**
  - A: Yes! Create it with `source = MANUAL`. It will never be auto-deleted.

- **Q: What if a model comes back after being marked inactive?**
  - A: Next ingestion or successful use will set `isActive = true` again.

- **Q: How do I see which models were discovered at runtime?**
  - A: Query for `source = INFERENCE`:
    ```typescript
    const discovered = await prisma.model.findMany({
      where: { source: 'INFERENCE' }
    });
    ```
