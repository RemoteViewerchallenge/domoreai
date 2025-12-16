# Complete Fix for Model Ingestion & Spawn Issues

## Problems Identified

1. **Dynamic table creation crashes** - Creating/dropping `raw_google_models` tables causes Postgres errors (42P01, 23505)
2. **Data loss** - Only 9 models showing when there should be hundreds
3. **Hardcoded model select** - Not showing actual available models
4. **Role creator table empty** - Should show model counts but shows nothing
5. **Models not spawning** - Selection logic was reading from JSON files instead of database

## Solution: Two-Phase Ingestion + Ghost Records

### Phase 1: The "Bag" (RawDataLake)
Save ALL raw JSON first, preventing data loss from crashes:

```typescript
// Save to RawDataLake (crash-safe)
await prisma.rawDataLake.create({
  data: {
    provider: 'google',
    fileName: 'google_models_2025-12-06.json',
    rawData: fileContent, // Whole file dumped here
    processed: false
  }
});
```

### Phase 2: Process into Model Table
Then normalize into structured Model table:

```typescript
// Process each raw record
for (const record of rawRecords) {
  const modelList = Array.isArray(rawData) ? rawData : rawData.data || [];
  
  for (const model of modelList) {
    await prisma.model.upsert({
      where: { providerId_modelId: { providerId, modelId } },
      update: {
        lastSeenAt: now,
        isActive: true,
        // Update other fields...
      },
      create: {
        source: 'INDEX', // From provider's official list
        isActive: true,
        firstSeenAt: now,
        lastSeenAt: now,
        // ... other fields
      }
    });
  }
  
  // Mark as processed
  await prisma.rawDataLake.update({
    where: { id: record.id },
    data: { processed: true }
  });
}
```

## Just-In-Time (JIT) Discovery

For models not in the database (the "missing 9"):

```typescript
// In your agent execution logic
async function executeJob(provider: string, modelName: string, prompt: string) {
  try {
    // Try to use the model (even if unknown)
    const response = await providerClient.chat.completions.create({
      model: modelName,
      messages: [{ role: 'user', content: prompt }]
    });

    // SUCCESS! Model exists. Register it immediately.
    await prisma.model.upsert({
      where: { providerId_modelId: { providerId: provider, modelId: modelName } },
      update: { 
        lastSeenAt: new Date(), 
        isActive: true 
      },
      create: {
        providerId: provider,
        modelId: modelName,
        name: modelName,
        source: 'INFERENCE', // <--- Discovered via usage!
        isActive: true,
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
        specs: { discoveredAt: new Date() }
      }
    });

    return response;
  } catch (error) {
    // Model really doesn't exist
    throw new Error(`Model ${modelName} rejected by provider`);
  }
}
```

## Files Modified

### 1. Schema (`apps/api/prisma/schema.prisma`)

**Enhanced RawDataLake:**
```prisma
model RawDataLake {
  id         String   @id @default(cuid())
  provider   String
  fileName   String?  // Track source file
  rawData    Json
  ingestedAt DateTime @default(now())
  processed  Boolean  @default(false) // Track processing status
  
  @@index([provider, processed])
  @@index([ingestedAt])
}
```

**Model table already has Ghost Records fields:**
```prisma
model Model {
  // ... existing fields ...
  
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

### 2. Ingestion Service (`apps/api/src/services/UnifiedIngestionService.ts`)

**Two-Phase Approach:**
1. Save all JSON files to RawDataLake first
2. Process each record into Model table
3. Mark as processed

**Benefits:**
- No data loss from crashes
- Can retry failed processing
- Keeps history of provider responses

### 3. Model Selection (`apps/api/src/services/modelManager.service.ts`)

**Fixed to query database:**
```typescript
export async function selectModelFromRegistry(roleId: string, ...) {
  const candidates = await prisma.model.findMany({
    where: {
      isActive: true, // Ghost Records
      provider: { isEnabled: true },
      // Exclude failed models/providers
      NOT: [
        ...(failedModels.length > 0 ? [{ modelId: { in: failedModels } }] : []),
        ...(failedProviders.length > 0 ? [{ providerId: { in: failedProviders } }] : [])
      ]
    },
    orderBy: [
      { isFree: 'desc' }, // Zero-Burn: free models first
      { lastSeenAt: 'desc' }, // Recently seen first
    ]
  });
  
  // Random selection for load balancing
  return candidates[Math.floor(Math.random() * candidates.length)];
}
```

### 4. UI Data Endpoint (`apps/api/src/routers/orchestrator.router.ts`)

**Fixed to use Prisma:**
```typescript
getActiveRegistryData: protectedProcedure.query(async ({ ctx }) => {
  const models = await ctx.prisma.model.findMany({
    where: { isActive: true },
    include: { provider: true },
    orderBy: [
      { isFree: 'desc' },
      { lastSeenAt: 'desc' }
    ],
    take: 2000
  });

  return { tableName: 'model_registry', rows: models };
});
```

## Migration Steps

### 1. Push Schema Changes

```bash
cd apps/api
npx prisma db push
npx prisma generate
```

### 2. Run the Seeder

```bash
cd apps/api
pnpm run seed:models
```

Expected output:
```
🚀 Starting Unified Ingestion from /path/to/latest_models...
📋 Phase 1: Saving raw data to RawDataLake (The Bag)

  💾 Saved google_models_2025-12-06.json to RawDataLake (ID: abc123)
  💾 Saved openrouter_models_2025-12-06.json to RawDataLake (ID: def456)
  ... (more files)

📋 Phase 2: Processing 10 raw records into Model table

📦 Processing google from google_models_2025-12-06.json (45 models)...
    ✅ Ingested 45 models, skipped 0 from google_models_2025-12-06.json
📦 Processing openrouter from openrouter_models_2025-12-06.json (120 models)...
    ✅ Ingested 120 models, skipped 0 from openrouter_models_2025-12-06.json
... (more providers)

✅ Ingestion Complete!
   Total Ingested: 450
   Total Skipped: 0
   Agents ready to spawn.
```

### 3. Verify in Database

```bash
npx prisma studio
```

Check:
- `RawDataLake` table has 10 records (one per JSON file)
- `model_registry` table has hundreds of models with `isActive = true`
- Models have `source = INDEX`

### 4. Restart API Server

```bash
# Kill current server (Ctrl+C)
cd apps/api
pnpm run dev
```

### 5. Check UI

1. Open Role Creator Panel
2. Models should now appear in the table
3. Check browser console for errors
4. Verify model counts are displayed

## Verification Queries

### Count models by provider:
```sql
SELECT 
  p.label as provider,
  COUNT(*) as total,
  SUM(CASE WHEN m."is_active" THEN 1 ELSE 0 END) as active,
  SUM(CASE WHEN m."is_free" THEN 1 ELSE 0 END) as free
FROM model_registry m
JOIN "ProviderConfig" p ON m.provider_id = p.id
GROUP BY p.label
ORDER BY total DESC;
```

### Check Ghost Records distribution:
```sql
SELECT 
  source,
  COUNT(*) as count,
  SUM(CASE WHEN "is_active" THEN 1 ELSE 0 END) as active
FROM model_registry
GROUP BY source;
```

### Find recently seen models:
```sql
SELECT 
  p.label as provider,
  m.model_name,
  m.source,
  m."is_free",
  m.last_seen_at
FROM model_registry m
JOIN "ProviderConfig" p ON m.provider_id = p.id
WHERE m."is_active" = true
ORDER BY m.last_seen_at DESC
LIMIT 20;
```

## Troubleshooting

### Still seeing "0 rows"?

1. Check RawDataLake:
   ```sql
   SELECT provider, fileName, processed, ingestedAt 
   FROM "RawDataLake" 
   ORDER BY ingestedAt DESC;
   ```

2. If `processed = false`, run seeder again
3. If `processed = true` but no models, check for errors in API logs

### Models not showing in UI?

1. Check API endpoint:
   ```bash
   curl http://localhost:4000/api/trpc/orchestrator.getActiveRegistryData
   ```

2. Check browser console for tRPC errors
3. Verify models have `isActive = true`

### Agent spawn still failing?

1. Check server logs for "No active models found"
2. Verify provider configs have `isEnabled = true`
3. Check role metadata for capabilities

## Benefits Summary

✅ **No more crashes** - Two-phase approach prevents data loss
✅ **No more data loss** - RawDataLake keeps history
✅ **Discover missing models** - JIT pattern finds models not in lists
✅ **Type-safe queries** - Prisma instead of raw SQL
✅ **Zero-Burn priority** - Free models selected first
✅ **Ghost Records** - Track model lifecycle
✅ **Resilient** - Failed models/providers excluded automatically

## Next Implementation: JIT Discovery

To enable "try models you don't know exist", add this to your agent execution:

```typescript
// In apps/api/src/services/AgentRuntime.ts or similar

import { ModelDiscoveryService } from './ModelDiscoveryService.js';

async function executeWithDiscovery(providerId: string, modelId: string, messages: any[]) {
  try {
    // Attempt execution
    const result = await llmProvider.chat.completions.create({
      model: modelId,
      messages
    });

    // SUCCESS! Track this model
    await ModelDiscoveryService.trackSuccessfulInference(
      providerId,
      modelId,
      modelId, // Use modelId as name
      {
        discoveredVia: 'agent_execution',
        timestamp: new Date().toISOString()
      }
    );

    return result;
  } catch (error) {
    // Model doesn't exist or failed
    throw error;
  }
}
```

This allows users to type any model ID in the UI, and if it works, it gets added to the database automatically!
