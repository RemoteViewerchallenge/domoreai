# Latest Models Directory

This directory contains raw JSON model definitions from various LLM providers.

## Supported Providers

The ingestion service recognizes files with the following naming patterns:

- **Google Gemini**: `google_*.json`
- **OpenRouter**: `openrouter_*.json`
- **Groq**: `groq_*.json`
- **Ollama**: `ollama_*.json`
- **Mistral**: `mistral_*.json`

## File Format

Each file should contain either:
- An array of model objects: `[{ ... }, { ... }]`
- A wrapped structure: `{ "data": [{ ... }, { ... }] }`

## Running the Ingestion

To ingest all models from this directory:

```bash
# From the project root
npx ts-node apps/api/src/scripts/ingest_models_robust.ts

# Or specify a custom directory
npx ts-node apps/api/src/scripts/ingest_models_robust.ts /path/to/models
```

## What Gets Ingested

For each provider, the system extracts:

- **Model ID**: Unique identifier from the provider
- **Name**: Display name from the provider
- **Context Window**: Maximum input tokens (using provider-specific field names)
- **Capabilities**: Detected from model metadata (text, vision, multimodal, etc.)
- **Pricing**: Cost per 1k tokens (if available)
- **Raw Data**: Complete original JSON is preserved in `providerData` field

## Rosetta Stone Mappings

The service uses these mappings to normalize different provider schemas:

### Google
- Context: `inputTokenLimit`
- Name: `displayName`
- ID: `name`

### OpenRouter
- Context: `context_length`
- Name: `name`
- ID: `id`
- Pricing: `pricing.prompt`

### Groq
- Context: `context_window`
- Name: `id`
- ID: `id`

### Ollama
- Context: `details.context_length`
- Name: `name`
- ID: `name`

### Mistral
- Context: `max_context_length`
- Name: `id`
- ID: `id`

## Example Files

Place your provider model JSON files here:

```
latest_models/
├── google_models_2024.json
├── openrouter_models.json
├── groq_models.json
├── ollama_local.json
└── mistral_models.json
```

## Safety Features

1. **No Data Loss**: Original provider JSON is always preserved in `providerData`
2. **Safe Defaults**: Missing context windows default to 4096 tokens
3. **Error Recovery**: Individual model failures won't stop the entire ingestion
4. **Provider Auto-Creation**: Missing provider configs are created automatically (disabled by default)

## Cell Division Logic

After ingestion, use the `ContextManager` service to validate context fit:

```typescript
import { contextManager } from '../services/ContextManager';

const result = await contextManager.validateContextFit(
  'google::models/gemini-1.5-flash',
  ['/path/to/file1.ts', '/path/to/file2.ts']
);

if (!result.fit && result.action === 'SPLIT_JOB') {
  console.log('Need to split job:', result.reason);
}
```
