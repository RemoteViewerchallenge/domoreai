# Anti-Corruption Pipeline Implementation

## Overview

The Anti-Corruption Pipeline is a **two-phase data ingestion system** that ensures we never lose the source of truth when importing model data from external providers. It strictly separates **Storage (Phase 1)** from **Processing (Phase 2)**.

## Architecture

### Phase 1: Raw Data Lake (The "Bag")
**Goal**: Save the file content EXACTLY as received. No filtering. No normalization.

- Reads JSON files from `latest_models/` directory
- Stores raw JSON directly into `RawDataLake` table
- Preserves complete provider response structure
- No data transformation or validation
- **Zero risk of data corruption**

### Phase 2: The Gatekeeper (Application Layer)
**Goal**: Filter, normalize, and ingest into the `Model` table for the app to use.

- Fetches raw records from `RawDataLake`
- Applies strict filtering rules (see below)
- Normalizes data into unified schema
- Preserves original data in `providerData` field
- Tracks ingested vs filtered counts

## Filtering Rules

### Whitelist Approach (Fail-Open)
These providers are **automatically accepted** (assumed free tier):
- **Ollama**: Local models (always free)
- **Groq**: Generous free tier with rate limits
- **Mistral**: Free tier available
- **Google**: Free tier available

### Strict Filtering (Fail-Closed)
**OpenRouter**: STRICT pricing check required
- Must have `pricing.prompt === 0` AND `pricing.completion === 0`
- If pricing data is missing → **REJECT** (safe default)
- If pricing > 0 → **REJECT** (prevents unexpected charges)

Example OpenRouter pricing structure:
```json
{
  "id": "meta-llama/llama-3.2-3b-instruct:free",
  "name": "Meta: Llama 3.2 3B Instruct (free)",
  "pricing": {
    "prompt": "0",      // ✅ Free
    "completion": "0"   // ✅ Free
  }
}
```

vs.

```json
{
  "id": "anthropic/claude-3.5-sonnet",
  "name": "Anthropic: Claude 3.5 Sonnet",
  "pricing": {
    "prompt": "0.000003",   // ❌ Paid
    "completion": "0.000015" // ❌ Paid
  }
}
```

## Data Preservation

### Three Layers of Safety

1. **RawDataLake Table**
   - Complete, unmodified provider response
   - Permanent historical record
   - Can be reprocessed with different logic

2. **Model.providerData Field**
   - Original model object from provider
   - Preserved even after normalization
   - Allows retroactive analysis

3. **Model.specs.pricing Field**
   - Extracted pricing object
   - Prevents `[object Object]` issues
   - Enables UI verification

## Implementation Files

### Core Service
- `apps/api/src/services/UnifiedIngestionService.ts`
  - `ingestAllModels()`: Main entry point
  - `ingestSingleModel()`: Per-model processing (returns boolean)
  - `isModelFree()`: Strict free model detection
  - `ensureProviderConfig()`: Provider setup

### Integration
- `apps/api/src/index.ts`
  - Calls `UnifiedIngestionService.ingestAllModels()` on startup
  - Replaces old `autoLoadRawJsonFiles()` approach

### Database Schema
- `apps/api/prisma/schema.prisma`
  - `RawDataLake`: Phase 1 storage
  - `Model`: Phase 2 normalized data
  - `ProviderConfig`: Provider credentials

## Execution Flow

```
1. Server Starts
   ↓
2. UnifiedIngestionService.ingestAllModels()
   ↓
3. PHASE 1: Read JSON files → Save to RawDataLake
   ↓
4. PHASE 2: For each RawDataLake record:
   ↓
5. Extract model list (handle arrays vs objects)
   ↓
6. For each model:
   ↓
7. Check if free (isModelFree)
   ↓
8. If OpenRouter AND paid → REJECT (return false)
   ↓
9. If accepted → Normalize and upsert to Model table
   ↓
10. Mark RawDataLake record as processed
   ↓
11. Log: "Saved to App: X models, Filtered Out: Y models"
```

## Benefits

### 1. **Zero Data Loss**
- Original data always preserved in RawDataLake
- Can reprocess with updated logic
- Historical audit trail

### 2. **Cost Protection**
- Strict OpenRouter filtering prevents accidental paid API usage
- Fail-closed approach (reject if uncertain)
- Clear logging of filtered models

### 3. **Debugging**
- Can inspect raw provider responses
- Compare normalized vs original data
- Identify transformation issues

### 4. **Flexibility**
- Change filtering rules without losing data
- Add new providers easily
- Retroactive reprocessing possible

## Logging Output

```
🚀 Starting Unified Ingestion from /path/to/latest_models...
📋 Phase 1: Saving raw data to RawDataLake (The Bag)

  💾 Saved google_models_2025-12-19.json to RawDataLake (ID: abc123)
  💾 Saved openrouter_models_2025-12-19.json to RawDataLake (ID: def456)

📋 Phase 2: Processing 2 raw records into Model table

📦 Processing google from google_models_2025-12-19.json (15 models)...
    ✅ Ingested 15 models, filtered 0 from google_models_2025-12-19.json

📦 Processing openrouter from openrouter_models_2025-12-19.json (247 models)...
    💰 OpenRouter pricing check for anthropic/claude-3.5-sonnet: prompt=0.000003, completion=0.000015 -> PAID
    🚫 Filtered out paid OpenRouter model: Anthropic: Claude 3.5 Sonnet (anthropic/claude-3.5-sonnet)
    ✅ Ingested 23 models, filtered 224 from openrouter_models_2025-12-19.json

✅ Ingestion Complete!
   - Saved to App: 38 models
   - Filtered Out: 224 models (Paid OpenRouter or Invalid)
```

## Future Enhancements

1. **Reprocessing Command**
   - CLI tool to reprocess RawDataLake records
   - Useful when filtering logic changes

2. **Provider-Specific Filters**
   - Custom filtering rules per provider
   - Configurable via database

3. **Pricing Updates**
   - Periodic refresh of pricing data
   - Alert on pricing changes

4. **Model Lifecycle**
   - Track when models disappear from provider lists
   - Mark as inactive but preserve data

## Troubleshooting

### Issue: Models not appearing in app
**Check**: Look at filtered count in logs
**Solution**: Verify pricing data in RawDataLake table

### Issue: [object Object] in logs
**Check**: Ensure specs.pricing is properly extracted
**Solution**: Verify mapping.pricingPath is correct

### Issue: Too many models filtered
**Check**: Review isModelFree() logic
**Solution**: Adjust whitelist or pricing thresholds
