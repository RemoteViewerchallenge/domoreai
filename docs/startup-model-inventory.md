# Startup Model Inventory Summary

## New Format

The startup logs now display a comprehensive spreadsheet-style model inventory showing:

### Example Output

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🚀 C.O.R.E. Model Inventory                                                │
├─────────────────────────────────────────────────────────────────────────────┤
│  Provider        │ Chat │ Embed │ Vision │ Reason │ ImgGen │ TTS │ Total   │
├──────────────────┼──────┼───────┼────────┼────────┼────────┼─────┼─────────┤
│   openai         │   12 │     4 │      3 │      2 │      0 │   0 │      21 │
│   anthropic      │    8 │     0 │      3 │      0 │      0 │   0 │      11 │
│   google         │   15 │     2 │      5 │      3 │      0 │   0 │      25 │
│   mistral        │    9 │     0 │      1 │      0 │      0 │   0 │      10 │
│   groq           │    6 │     0 │      0 │      0 │      0 │   1 │       7 │
│   openrouter     │   18 │     2 │      4 │      3 │      2 │   0 │      29 │
│ 🏠ollama         │    5 │     2 │      1 │      0 │      0 │   0 │       8 │
├──────────────────┼──────┼───────┼────────┼────────┼────────┼─────┼─────────┤
│ TOTAL            │   73 │    10 │     17 │      8 │      2 │   1 │     111 │
└──────────────────┴──────┴───────┴────────┴────────┴────────┴─────┴─────────┘
```

## Features

### Columns
- **Chat**: General chat/completion models (primaryTask = 'chat')
- **Embed**: Embedding models (primaryTask = 'embedding')
- **Vision**: Chat models with vision capability (hasVision = true)
- **Reason**: Chat models with reasoning capability (hasReasoning = true)
- **ImgGen**: Image generation models (primaryTask = 'image_gen')
- **TTS**: Text-to-speech models (primaryTask = 'tts')
- **Total**: Total models per provider

### Rows
- **Provider rows**: One row per provider (openai, anthropic, google, etc.)
- **Local indicator**: 🏠 emoji for local providers (Ollama)
- **TOTAL row**: Grand totals across all providers

### Sorting
1. **API providers first** (non-local)
2. **Local providers last** (Ollama with 🏠)
3. **Within each group**: Sorted by total count (descending)

## Implementation Details

**File**: `/home/guy/mono/apps/api/src/index.ts`

The summary is generated at server startup after the database connection is established. It:
1. Fetches all models with their capabilities
2. Groups by provider
3. Categorizes by primaryTask and special capabilities
4. Displays in a formatted ASCII table

## Benefits

1. **At-a-glance inventory**: See exactly what models are available
2. **Provider comparison**: Quickly compare provider offerings
3. **Capability visibility**: See which providers offer vision, reasoning, etc.
4. **Local vs API**: Clear distinction with 🏠 emoji
5. **Grand totals**: Know your total model count across all categories
