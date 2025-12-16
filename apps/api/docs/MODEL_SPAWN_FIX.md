# Model Spawn Fix - Summary

## Problem Identified

Models were not showing up in the role creation table because:

1. **`getActiveRegistryData` was using raw SQL** - The tRPC endpoint was querying a table called `unified_models` using raw SQL (`$queryRawUnsafe`), but the actual models are stored in the `model_registry` table (Prisma schema mapping).

2. **`selectModelFromRegistry` was loading from JSON** - The model selection service was reading from a static JSON file (`latest_models/models.json`) instead of querying the database.

3. **Ghost Records fields not available** - The Prisma client hadn't been regenerated after adding the Ghost Records pattern fields (`isActive`, `source`, `firstSeenAt`, `lastSeenAt`).

## Fixes Applied

### 1. Fixed `getActiveRegistryData` (orchestrator.router.ts)

**Before:**
```typescript
const rows = await ctx.prisma.$queryRawUnsafe<any[]>(
  `SELECT * FROM "${tableName}" LIMIT 2000`
);
```

**After:**
```typescript
const models = await ctx.prisma.model.findMany({
  where: {
    isActive: true, // Ghost Records: only active models
  },
  include: {
    provider: {
      select: {
        id: true,
        label: true,
        type: true,
        isEnabled: true,
      }
    }
  },
  orderBy: [
    { isFree: 'desc' }, // Free models first
    { lastSeenAt: 'desc' }, // Recently seen first
  ],
  take: 2000
});
```

**Benefits:**
- Uses proper Prisma queries (type-safe)
- Filters for `isActive = true` (Ghost Records pattern)
- Includes provider information
- Prioritizes free models and recently-seen models
- Returns structured data the UI expects

### 2. Fixed `selectModelFromRegistry` (modelManager.service.ts)

**Before:**
```typescript
function loadModelsFromJson() {
  const url = new URL('../../latest_models/models.json', import.meta.url);
  const raw = fs.readFileSync(url, 'utf-8');
  return JSON.parse(raw);
}

export async function selectModelFromRegistry(...) {
  const allModels = loadModelsFromJson();
  // ... filter and select
}
```

**After:**
```typescript
export async function selectModelFromRegistry(roleId: string, failedModels: string[] = [], failedProviders: string[] = []) {
  // Fetch the role to get its criteria
  const role = await prisma.role.findUnique({
    where: { id: roleId }
  });

  // Parse metadata for capabilities
  const metadata = (role.metadata as any) || {};
  const capabilities = metadata.capabilities || [];

  // Build query filters
  const whereClause: any = {
    isActive: true, // Ghost Records: only active models
    provider: {
      isEnabled: true // Only enabled providers
    },
    NOT: [
      ...(failedModels.length > 0 ? [{ modelId: { in: failedModels } }] : []),
      ...(failedProviders.length > 0 ? [{ providerId: { in: failedProviders } }] : [])
    ]
  };

  // Add capability filters if specified
  if (capabilities.length > 0) {
    whereClause.capabilities = {
      hasSome: capabilities
    };
  }

  // Fetch candidate models
  const candidates = await prisma.model.findMany({
    where: whereClause,
    include: {
      provider: true
    },
    orderBy: [
      { isFree: 'desc' }, // Prefer free models (Zero-Burn)
      { lastSeenAt: 'desc' }, // Recently seen models first
    ],
    take: 100
  });

  // Pick random for load balancing
  const selected = candidates[Math.floor(Math.random() * candidates.length)];
  
  console.log(`✅ Selected model: ${selected.provider.label}/${selected.name} (source: ${selected.source}, free: ${selected.isFree})`);

  return {
    modelId: selected.modelId,
    internalId: selected.id,
    providerId: selected.providerId,
    name: selected.name,
    isFree: selected.isFree,
    source: selected.source,
    provider: selected.provider,
    specs: selected.specs,
  };
}
```

**Benefits:**
- Queries live database instead of static JSON
- Applies Ghost Records filtering (`isActive = true`)
- Respects role capabilities from metadata
- Excludes failed models/providers (exhaustive fallback)
- Prioritizes free models (Zero-Burn strategy)
- Provides detailed logging for debugging

### 3. Regenerated Prisma Client

Ran `npx prisma generate` to ensure the TypeScript types include the new Ghost Records fields.

## Data Flow (Fixed)

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Seed Models (pnpm run seed:models)                      │
│    - Reads JSON files from latest_models/                  │
│    - Upserts into model_registry table                     │
│    - Sets source=INDEX, isActive=true, lastSeenAt=now()    │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. UI Fetches Models (RoleCreatorPanel.tsx)                │
│    - Calls trpc.orchestrator.getActiveRegistryData()       │
│    - Gets models from model_registry WHERE isActive=true   │
│    - Displays in role creation table                       │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Agent Spawns (modelManager.service.ts)                  │
│    - Calls selectModelFromRegistry(roleId)                 │
│    - Queries model_registry with role criteria             │
│    - Filters: isActive=true, provider.isEnabled=true       │
│    - Prioritizes: isFree=true, lastSeenAt DESC             │
│    - Returns selected model for agent execution            │
└─────────────────────────────────────────────────────────────┘
```

## Verification Steps

### 1. Check if models are in the database

```bash
cd apps/api
npx prisma studio
# Navigate to model_registry table
# Verify models exist with isActive=true
```

### 2. Run the seeder

```bash
cd apps/api
pnpm run seed:models
```

Expected output:
```
🌱 [GhostRecordsSeeder] Starting model ingestion...
📂 Reading from: /path/to/latest_models

📦 Ingesting google from google_models_...json...
    ✅ Ingested 45 models, skipped 0

📦 Ingesting openrouter from openrouter_models_...json...
    ✅ Ingested 120 models, skipped 0

... (more providers) ...

✅ Ingestion Complete. Agents ready to spawn.

📊 Model Discovery Statistics:
   Total Models: 450
   Active: 450
   Inactive: 0

   By Source:
     INDEX: 450
```

### 3. Check UI

1. Open the app
2. Navigate to Role Creator Panel
3. Models should now appear in the table
4. Check browser console for any errors

### 4. Test agent spawn

1. Create or select a role
2. Try to spawn an agent with that role
3. Check server logs for:
   ```
   ✅ Selected model: google/gemini-1.5-flash (source: INDEX, free: true)
   ```

## Files Modified

1. **`apps/api/src/routers/orchestrator.router.ts`**
   - Replaced raw SQL with Prisma query
   - Added Ghost Records filtering
   - Structured response for UI

2. **`apps/api/src/services/modelManager.service.ts`**
   - Removed JSON file loading
   - Added database query with role criteria
   - Implemented Ghost Records pattern
   - Added capability filtering

3. **Prisma Client**
   - Regenerated to include new fields

## Next Steps

1. **Run the seeder** to populate the database:
   ```bash
   cd apps/api && pnpm run seed:models
   ```

2. **Restart the API server** to pick up the changes:
   ```bash
   # Kill the current server (Ctrl+C)
   cd apps/api && pnpm run dev
   ```

3. **Refresh the UI** and verify models appear in the role creation table

4. **Test agent spawn** by creating a role and executing it

## Troubleshooting

### Models still not showing?

1. Check database:
   ```bash
   npx prisma studio
   ```
   Verify `model_registry` table has records with `isActive = true`

2. Check API logs:
   Look for "Failed to fetch models from registry" errors

3. Check UI console:
   Look for tRPC errors or data structure issues

### Agent spawn failing?

1. Check server logs for:
   - "No active models found for role X"
   - Model selection errors

2. Verify provider configs:
   ```sql
   SELECT * FROM "ProviderConfig" WHERE "isEnabled" = true;
   ```

3. Check role metadata:
   Ensure capabilities are properly set in role.metadata

## Benefits of This Fix

1. **Live Data**: Models are now fetched from the database, not static JSON
2. **Ghost Records**: Only active, confirmed-working models are used
3. **Type Safety**: Proper Prisma queries instead of raw SQL
4. **Zero-Burn**: Free models are prioritized automatically
5. **Resilience**: Failed models/providers are excluded
6. **Traceability**: Detailed logging shows which model was selected and why
