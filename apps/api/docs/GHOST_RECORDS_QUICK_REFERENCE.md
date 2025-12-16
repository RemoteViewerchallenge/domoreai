# Ghost Records - Quick Reference

## 🚀 Common Commands

### Ingest Models from JSON Files
```bash
cd apps/api
pnpm run seed:models
```

### Ingest from Custom Directory
```bash
pnpm run seed:models -- --dir /path/to/models
```

### Check Discovery Statistics
```typescript
import { ModelDiscoveryService } from './services/ModelDiscoveryService';

const stats = await ModelDiscoveryService.getDiscoveryStats();
console.log(stats);
// { total: 450, bySource: { INDEX: 400, INFERENCE: 45, MANUAL: 5 }, active: 445, inactive: 5 }
```

### Track Runtime Discovery
```typescript
// After successful model inference
await ModelDiscoveryService.trackSuccessfulInference(
  providerId,
  'gpt-4.5-preview',
  'GPT-4.5 Preview'
);
```

### Mark Stale Models
```typescript
// Mark models not seen in 24 hours as inactive
const count = await ModelDiscoveryService.markStaleModelsInactive(undefined, 24);
```

### List Inactive Models
```typescript
const inactive = await ModelDiscoveryService.listInactiveModels(50);
inactive.forEach(model => {
  console.log(`${model.provider.label}/${model.name} - last seen: ${model.lastSeenAt}`);
});
```

### Reactivate a Model
```typescript
await ModelDiscoveryService.reactivateModel(providerId, modelId);
```

### Delete Old Inactive Models
```typescript
// Delete inactive models not seen in 30 days (never MANUAL models)
const deleted = await ModelDiscoveryService.deleteOldInactiveModels(30);
```

## 🔍 Common Queries

### Get All Active Models
```typescript
const active = await prisma.model.findMany({
  where: { isActive: true }
});
```

### Get Free Active Models
```typescript
const freeModels = await prisma.model.findMany({
  where: {
    isActive: true,
    isFree: true
  }
});
```

### Get Models by Source
```typescript
// Runtime discoveries
const discovered = await prisma.model.findMany({
  where: { source: 'INFERENCE' }
});

// User-added
const manual = await prisma.model.findMany({
  where: { source: 'MANUAL' }
});

// From provider lists
const indexed = await prisma.model.findMany({
  where: { source: 'INDEX' }
});
```

### Get Stale Models (not seen in 7 days)
```typescript
const sevenDaysAgo = new Date();
sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

const stale = await prisma.model.findMany({
  where: {
    lastSeenAt: { lt: sevenDaysAgo },
    isActive: true
  }
});
```

## 🎯 Integration Patterns

### Orchestrator Model Selection
```typescript
// Only use confirmed-working models
const availableModels = await prisma.model.findMany({
  where: {
    isActive: true,
    isFree: true,
    capabilities: { has: 'text' }
  },
  include: { provider: true }
});
```

### UI Display with Warnings
```typescript
const models = await prisma.model.findMany({
  include: { provider: true }
});

models.forEach(model => {
  const status = model.isActive ? '✅' : '⚠️';
  const source = model.source === 'INFERENCE' ? '🔍' : 
                 model.source === 'MANUAL' ? '✏️' : '📋';
  
  console.log(`${status} ${source} ${model.provider.label}/${model.name}`);
  
  if (!model.isActive) {
    const daysSince = Math.floor(
      (Date.now() - model.lastSeenAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    console.log(`   Last seen ${daysSince} days ago`);
  }
});
```

### Health Check After Ingestion
```typescript
const result = await fetchModelsFromProvider(provider);

if (result.length === 0) {
  console.warn(`⚠️  ${provider.label} returned 0 models`);
  console.warn(`   This might be an API timeout - existing models preserved`);
  return; // Don't proceed with ingestion
}

// Safe to ingest
await UnifiedIngestionService.ingestAllModels();
```

## 📊 Monitoring

### Daily Stats Report
```typescript
async function dailyReport() {
  const stats = await ModelDiscoveryService.getDiscoveryStats();
  const inactive = await ModelDiscoveryService.listInactiveModels(10);
  
  console.log('📊 Daily Model Report');
  console.log(`   Total: ${stats.total}`);
  console.log(`   Active: ${stats.active}`);
  console.log(`   Inactive: ${stats.inactive}`);
  console.log('\n   By Source:');
  Object.entries(stats.bySource).forEach(([source, count]) => {
    console.log(`     ${source}: ${count}`);
  });
  
  if (inactive.length > 0) {
    console.log('\n⚠️  Recently Inactive Models:');
    inactive.forEach(m => {
      console.log(`   ${m.provider.label}/${m.name}`);
    });
  }
}
```

### Automated Cleanup (Cron Job)
```typescript
// Run daily at 2 AM
async function dailyCleanup() {
  // Mark stale models (not seen in 24h)
  const stale = await ModelDiscoveryService.markStaleModelsInactive(undefined, 24);
  console.log(`Marked ${stale} models as inactive`);
  
  // Delete very old inactive models (30+ days)
  const deleted = await ModelDiscoveryService.deleteOldInactiveModels(30);
  console.log(`Deleted ${deleted} old inactive models`);
}
```

## 🛡️ Safety Guarantees

### What Gets Protected
- ✅ MANUAL models are **never** auto-deleted
- ✅ Models are **soft-deleted** (marked inactive) before hard deletion
- ✅ Provider API glitches don't wipe your catalog
- ✅ Original provider data is **always** preserved

### What Gets Cleaned Up
- ⚠️  INDEX/INFERENCE models not seen in 24h → marked inactive
- 🗑️  Inactive models not seen in 30+ days → deleted (except MANUAL)

## 🔧 Troubleshooting

### Models Not Showing Up
1. Check if they're marked inactive: `where: { isActive: false }`
2. Re-run seeder to update timestamps
3. Verify JSON files are in correct directory

### Seeder Fails
1. Check database connection
2. Verify Prisma client is regenerated: `npx prisma generate`
3. Check JSON file format

### Type Errors
1. Regenerate Prisma client: `npx prisma generate`
2. Restart TypeScript server in your IDE
3. Check for schema changes that need migration

## 📚 Further Reading

- `docs/GHOST_RECORDS_PATTERN.md` - Full architecture guide
- `docs/IMPLEMENTATION_SUMMARY.md` - Implementation details
- `src/services/ModelDiscoveryService.ts` - Service code with comments
- `src/services/UnifiedIngestionService.ts` - Ingestion logic
