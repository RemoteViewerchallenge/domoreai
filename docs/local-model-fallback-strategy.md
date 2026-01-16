# Local Model Fallback Strategy

## Problem Statement
Ollama (local) models were being treated the same as API models in selection, causing:
1. Unknown local models (`granite4:micro`, `watt-tool-8B:latest`) failing to be categorized
2. Local models competing with API models for selection
3. No fallback strategy when API models are unavailable

## Solution: Three-Tier Model Selection

### Tier 1: Surveyor (Data Collection)
**File**: `apps/api/src/services/Surveyor.ts`

#### Changes:
1. **Added Generic Ollama Fallback Pattern**
   ```typescript
   {
     pattern: /.*/,  // Catch-all for unknown Ollama models
     specs: {
       contextWindow: 8192,
       capabilities: ["text"],
       primaryTask: "chat",
       costPer1k: 0,
       confidence: 'low',
       source: 'ollama_fallback'
     }
   }
   ```

2. **Added `isLocal` Flag to ModelCapabilities**
   - Schema: Added `isLocal Boolean? @default(false)` to `ModelCapabilities`
   - Surveyor: Automatically sets `isLocal: true` for all Ollama models
   - Migration: `20260116034150_add_is_local_to_model_capabilities`

### Tier 2: LLMSelector (Selection Logic)
**File**: `apps/api/src/orchestrator/LLMSelector.ts`

#### Selection Priority (Waterfall):
```
1. API Models (OpenAI, Anthropic, Mistral, etc.)
   ↓ (if none available)
2. Google Models (de-prioritized due to rate limits)
   ↓ (if none available)
3. Local Models (Ollama) - FALLBACK ONLY
   ↓ (if none available)
4. Unknown Models (from UnknownModel table)
   ↓ (if none available)
5. Error: No models available
```

#### Implementation:
```typescript
// Separate models into tiers
const apiCandidates = [];      // Tier 1
const googleCandidates = [];   // Tier 2
const localCandidates = [];    // Tier 3

for (const m of candidates) {
  const isLocal = m.capabilities?.isLocal === true;
  if (isLocal) {
    localCandidates.push(m);
    continue;
  }
  
  if (m.providerId.includes('google')) {
    googleCandidates.push(m);
  } else {
    apiCandidates.push(m);
  }
}

// Select in priority order
if (apiCandidates.length > 0) {
  candidates = apiCandidates;
} else if (googleCandidates.length > 0) {
  candidates = googleCandidates;
} else if (localCandidates.length > 0) {
  candidates = localCandidates;  // FALLBACK
}
```

### Tier 3: Role Assignment (Explicit Override)
**When a role has `hardcodedModelId` set to an Ollama model:**
- The LLMSelector is bypassed entirely
- The specific local model is used regardless of API model availability
- This allows users to explicitly choose local models when desired

## Test Results

### Unknown Model Detection
All previously unknown Ollama models now get categorized:

| Model | Primary Task | Capabilities | Context | Source |
|-------|-------------|--------------|---------|--------|
| granite4:micro | ✅ chat | text | 8192 | ollama_fallback |
| hengwen/watt-tool-8B:latest | ✅ chat | text | 8192 | ollama_fallback |
| mxbai-embed-large:latest | ✅ embedding | embedding | 512 | mxbai pattern |

### Selection Behavior

**Scenario 1: API models available**
```
Result: Uses API model (OpenAI, Anthropic, etc.)
Local models: Ignored
```

**Scenario 2: Only Google + Local available**
```
Result: Uses Google model
Local models: Ignored (still fallback)
```

**Scenario 3: Only Local models available**
```
Result: Uses Local model (Ollama)
Console: "⚠️ No API models available. Falling back to N local model(s)"
```

**Scenario 4: Role explicitly assigned to Ollama model**
```
Result: Uses the assigned Ollama model
Selection logic: Bypassed
```

## Benefits

1. **Reliability**: API models are preferred for production workloads
2. **Resilience**: Local models provide offline/fallback capability
3. **Flexibility**: Users can explicitly choose local models via role assignment
4. **Cost Control**: Local models are free (costPer1k: 0)
5. **No More Unknown Models**: All Ollama models get basic categorization

## Migration Path

To apply these changes to existing models:

```bash
# 1. Run the database migration
cd apps/api
npx prisma migrate dev

# 2. Re-survey all models to add isLocal flag
npx tsx src/scripts/force-sync.ts

# 3. Verify local models are marked correctly
npx tsx --eval "
import { prisma } from './apps/api/src/db.ts';
const locals = await prisma.model.findMany({
  where: { capabilities: { isLocal: true } },
  include: { capabilities: true }
});
console.log('Local models:', locals.map(m => m.name));
"
```

## Future Enhancements

1. **Embedding Selector**: Apply same logic to `EmbedSelector` for embedding models
2. **Performance Metrics**: Track local vs API model performance
3. **Smart Fallback**: Remember which API models failed and prefer others
4. **User Preference**: Allow users to set "prefer local" flag per workspace
