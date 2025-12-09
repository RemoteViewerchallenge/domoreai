# Model Registry Architecture

## Overview

The `Model` table (mapped to `model_registry` in PostgreSQL) is the **single source of truth** for all available LLM models in C.O.R.E.

## Core Principle

**All model lookups, selections, and orchestration MUST use `model_registry` as the primary data source.**

## Architecture

### 1. Model Registry Table (`model_registry`)

**Location**: `apps/api/prisma/schema.prisma` → `Model` model

**Purpose**: Central registry of all models from all providers

**Key Fields**:
- `providerId` + `modelId`: Composite unique key
- `name`: Display name
- `isFree` / `costPer1k`: Pricing info
- `providerData`: Raw provider response (JSON)
- `aiData`: AI-inferred metadata (JSON)
- `specs`: Computed/merged specs (JSON)

**Maintained By**: 
- `ProviderManager.syncModelsToRegistry()` - Writes to this table on startup and sync
- Syncs from all configured providers (Google, Mistral, OpenRouter, Groq, Ollama)

### 2. Data Flow

```
Providers (API) 
  → RawModelService (fetch & snapshot)
  → ProviderManager.syncModelsToRegistry()
  → model_registry (Prisma: Model table)
  → DynamicModelAdapter.loadModelsFromSimpleDB()
  → Orchestrator & Model Selection
```

### 3. Custom Tables (Optional Alternative)

Users **may** create custom tables via the Data Refinement UI:
- Examples: `my_free_models`, `openrouterfree`, etc.
- These are **alternatives** to `model_registry`, not replacements
- Set via `OrchestratorConfig.activeTableName`

**Default Behavior**: If no custom table is configured, system uses `model_registry`

### 4. OrchestratorConfig

**Field**: `activeTableName`
**Default**: `'model_registry'`
**Purpose**: Allows users to override the model source table

**Changed in this fix**:
- Previous default was `'unified_models'` (which didn't exist)
- Now correctly defaults to `'model_registry'`

## Code Locations

### Writes to Registry
- `apps/api/src/services/ProviderManager.ts:225` - `prisma.model.upsert()`

### Reads from Registry
- `apps/api/src/services/DynamicModelAdapter.ts:95` - `loadModelsFromSimpleDB()`
- `apps/api/src/services/modelManager.service.ts:81` - `selectModelFromRegistry()`
- `apps/api/src/orchestrator/modelSelector.ts:54` - `selectModel()`

### Configuration
- `apps/api/src/routers/orchestrator.router.ts` - Manages `activeTableName`
- `apps/api/src/db/schema.ts:20` - Default value for `activeTableName`

## Fixed Issues (Dec 2025)

### Problem
The system was configured to use `unified_models` as the default table, which:
1. Was never created or populated
2. Caused model lookups to fail
3. Made the carefully-maintained `model_registry` table unused

### Solution
1. Changed all defaults from `'unified_models'` → `'model_registry'`
2. Updated `DynamicModelAdapter` to treat `model_registry` as primary source
3. Made custom tables truly optional (fallback behavior)
4. Fixed orchestrator configuration defaults

### Files Changed
- `apps/api/src/db/schema.ts` - Default activeTableName
- `apps/api/src/routers/orchestrator.router.ts` - Fallback values
- `apps/api/src/orchestrator/modelSelector.ts` - Fallback values
- `apps/api/src/services/DynamicModelAdapter.ts` - Primary source logic
- `apps/api/inspect_data.ts` - Inspection script default

## Best Practices

### For Developers
1. **Always read from the configured registry**: Use `DynamicModelAdapter.loadModelsFromTable(tableName)`
2. **Don't hardcode table names**: Get `activeTableName` from `OrchestratorConfig`
3. **Use typed access when possible**: `prisma.model.findMany()` for `model_registry`
4. **Respect the fallback**: If custom table fails, fall back to `loadModelsFromSimpleDB()`

### For Users
1. **Default is model_registry**: No configuration needed for basic usage
2. **Custom tables are optional**: Only create if you need refined/filtered model lists
3. **Use Data Refinement UI**: To create and manage custom model tables
4. **Set activeTableName**: Via orchestrator UI to switch between tables

## Future Improvements

- [ ] Add migration to rename existing `unified_models` references in user data
- [ ] Add validation to ensure `activeTableName` refers to an existing table
- [ ] Consider deprecating custom tables in favor of views or filters
- [ ] Add telemetry to track which tables are actually being used
