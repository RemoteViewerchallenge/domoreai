# Surveyor Embedding Model Improvements

## Issue
The model `mxbai-embed-large:latest` was being misclassified by the ingestion service, indicating that embedding model detection needed improvement.

## Changes Made

### 1. Ollama Provider Patterns
- **Added specific pattern for mxbai models**: `/mxbai.*embed/i` with 512 token context window
- **Enhanced generic embed pattern**: Added `primaryTask: "embedding"` to ensure proper categorization
- **Pattern order**: Specific patterns (mxbai) are checked before generic patterns

### 2. OpenAI Provider Patterns
Added comprehensive embedding model support:
- `text-embedding-3-small` and `text-embedding-3-large` (8191 tokens)
- `text-embedding-ada-002` (8191 tokens)
- Generic `embed` fallback pattern

### 3. Google Provider Patterns
- Added `primaryTask: "embedding"` to existing embedding pattern

### 4. Heuristic Fallback
- Updated the fallback heuristic for models containing "embed" to include `primaryTask: "embedding"`

## Pattern Matching Priority

For Ollama models, the matching order is now:
1. `mxbai.*embed` → Specific mxbai embedding models (512 tokens)
2. `embed` → Generic embedding models (2048 tokens)
3. `vision` → Vision models

This ensures that `mxbai-embed-large:latest` will be correctly identified as an embedding model with the appropriate context window and primaryTask.

## Testing

To verify the fix works:
```bash
# Re-run the surveyor on existing models
npx tsx -e "import { Surveyor } from './apps/api/src/services/Surveyor.js'; const specs = Surveyor.inspect('ollama', 'mxbai-embed-large:latest'); console.log(specs);"
```

Expected output:
```json
{
  "contextWindow": 512,
  "capabilities": ["embedding"],
  "primaryTask": "embedding",
  "confidence": "high",
  "source": "surveyor_pattern",
  "costPer1k": 0
}
```

## Impact

These changes will:
1. Correctly categorize all embedding models with `primaryTask: "embedding"`
2. Prevent embedding models from being shown in chat model selectors
3. Ensure embedding models are available for RAG and vector operations
4. Provide accurate context window information for each embedding model type
