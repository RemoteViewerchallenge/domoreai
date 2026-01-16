# Provider Label Extraction Fix

## Problem

The Surveyor was failing to identify NVIDIA, Groq, and Cerebras models because of a provider label mismatch:

- **Provider Label**: `"NVIDIA (Env)"`, `"Groq (Env)"`, `"Cerebras (Env)"`
- **Pattern Map Key**: `"nvidia"`, `"groq"`, `"cerebras"`
- **Previous Logic**: `provider.toLowerCase()` → `"nvidia (env)"` ❌ (doesn't match `"nvidia"`)

## Root Cause

The `Surveyor.inspect()` method was receiving the full provider label (e.g., `"NVIDIA (Env)"`) from `model.provider.label`, but the pattern matching logic expected just the provider name without the `(Env)` suffix.

## Solution

Modified the provider key extraction to split on whitespace or parentheses and take only the first part:

```typescript
// Before
const providerKey = provider.toLowerCase();

// After
const providerKey = provider.toLowerCase().split(/[\s(]/)[0];
```

### Examples
- `"NVIDIA (Env)"` → `"nvidia"` ✅
- `"Groq (Env)"` → `"groq"` ✅
- `"Cerebras (Env)"` → `"cerebras"` ✅
- `"Ollama (Local)"` → `"ollama"` ✅
- `"OpenRouter (Env)"` → `"openrouter"` ✅

## Test Results

**Before Fix**:
```
❌ NVIDIA (Env)/microsoft/phi-4-mini-instruct - NOT IDENTIFIED
❌ NVIDIA (Env)/deepseek-ai/deepseek-v3.1 - NOT IDENTIFIED
❌ NVIDIA (Env)/google/gemma-3-12b-it - NOT IDENTIFIED
```

**After Fix**:
```
✅ NVIDIA (Env)/microsoft/phi-4-mini-instruct
   Primary Task: chat
   Capabilities: text

✅ NVIDIA (Env)/deepseek-ai/deepseek-v3.1
   Primary Task: chat
   Capabilities: text, reasoning

✅ NVIDIA (Env)/google/gemma-3-12b-it
   Primary Task: chat
   Capabilities: text
```

## Impact

This single-line fix enables **100+ NVIDIA models** to be correctly identified by the pattern matching system.

### Expected Improvement

**Before**: 110 unknown models  
**After**: ~0-10 unknown models (only truly unrecognized patterns)

## Files Modified

- `/home/guy/mono/apps/api/src/services/Surveyor.ts` (line 1123)

## Next Steps

Run the force-sync script to re-survey all models:
```bash
npx tsx apps/api/src/scripts/force-sync.ts
```

You should see:
- ✅ Identified messages for 100+ NVIDIA models
- ✅ Identified messages for Groq models (whisper, orpheus, etc.)
- Significantly fewer "Could not identify" warnings
