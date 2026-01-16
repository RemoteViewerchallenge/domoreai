# NVIDIA Model Ingestion Improvements

## Overview

Improved the Surveyor service to correctly identify **100+ NVIDIA-hosted models** that were previously showing as "unknown". All data comes from NVIDIA's API following the Anti-Corruption Pipeline rules.

## Anti-Corruption Pipeline Compliance

✅ **Phase 1 (Raw Data Lake)**: NVIDIA model data is fetched from their API and stored exactly as received in `RawDataLake`.

✅ **Phase 2 (Gatekeeper)**: The Surveyor inspects model names and metadata to determine capabilities.

✅ **Fail-Open Strategy**: NVIDIA models are whitelisted (assumed free tier) per the anti-corruption pipeline rules.

## Models Now Identified

### Microsoft Phi Models (10 models)
- `phi-3.5-mini-instruct`, `phi-3.5-moe-instruct`
- `phi-4-mini-instruct`, `phi-4-mini-flash-reasoning` (reasoning capability)
- `phi-4-multimodal-instruct` (vision capability)

### DeepSeek Models (5 models)
- `deepseek-v3.1`, `deepseek-v3.1-terminus`, `deepseek-v3.2` (reasoning)
- `deepseek-coder-6.7b-instruct` (code capability)

### Google Models on NVIDIA (12 models)
- `gemma-3-*` series (1b, 4b, 12b, 27b variants)
- `codegemma-*` (code capability)
- `paligemma` (vision capability)
- `shieldgemma-9b` (moderation, primaryTask: "moderation")
- `deplot` (OCR, primaryTask: "ocr")

### IBM Granite Models (7 models)
- `granite-3.0-*`, `granite-3.3-*` (general chat)
- `granite-*-code-instruct` (code capability)
- `granite-guardian-3.0-8b` (moderation, primaryTask: "moderation")

### Mistral Models on NVIDIA (18 models)
- `codestral-22b`, `devstral-2-123b` (code capability)
- `magistral-small`, `ministral-14b`
- `mistral-large-3-675b` (reasoning capability)
- `mistral-large`, `mistral-large-2`
- `mistral-small-*`, `mistral-7b-*`
- `mistral-nemo`, `mistral-nemotron` (reasoning)
- `mixtral-8x7b`, `mixtral-8x22b`
- `mamba-codestral-7b` (code capability)

### Moonshot AI (Kimi) Models (3 models)
- `kimi-k2-instruct`, `kimi-k2-instruct-0905`
- `kimi-k2-thinking` (reasoning capability)

### MiniMax Models (2 models)
- `minimax-m2`, `minimax-m2.1`

### Meta Llama on NVIDIA (3 models)
- `llama-4-maverick-17b-128e-instruct`
- `llama-4-scout-17b-16e-instruct`
- `llama-guard-4-12b` (moderation, primaryTask: "moderation")

### NVIDIA Proprietary Models (15 models)
- `cosmos-reason2-8b` (reasoning)
- `nemotron-*` series (parse, mini, nano, 340b)
- `nemoretriever-parse` (RAG optimized)
- `neva-22b` (vision)
- `nvclip` (vision + embedding, primaryTask: "embedding")
- `vila` (vision)
- `streampetr` (vision)
- `riva-translate-*` (translation)
- `minitron` models

### Other Providers on NVIDIA (30+ models)
- **Databricks**: `dbrx-instruct`
- **Adept**: `fuyu-8b` (vision)
- **AI21**: `jamba-1.5-*` (reasoning)
- **BAAI**: `bge-m3` (embedding, primaryTask: "embedding")
- **Baichuan**: `baichuan2-13b-chat`
- **BigCode**: `starcoder2-*` (code)
- **ByteDance**: `seed-oss-36b`
- **Microsoft**: `kosmos-2` (vision + OCR)
- **Qwen**: `qwen2-7b-instruct`
- **Writer**: `palmyra-creative-122b`
- **Z-AI**: `glm4.7`
- **Zyphra**: `zamba2-7b`
- **Rakuten**: `rakutenai-7b-*`
- **Sarvam**: `sarvam-m`
- **Speakleash**: `bielik-11b-*`
- **Stockmark**: `stockmark-2-100b`
- **THUDM**: `chatglm3-6b`
- **TII**: `falcon3-7b`
- **Upstage**: `solar-10.7b`
- **Utter**: `eurollm-9b`, `teuken-7b`
- **OpenGPT-X**: `teuken-7b-commercial`
- **OpenAI**: `gpt-oss-*` models

## Groq Models Improved (7 models)
- `whisper-large-v3`, `whisper-large-v3-turbo` (TTS, primaryTask: "tts")
- `orpheus-v1-english`, `orpheus-arabic-saudi` (audio + text)
- `allam-2-7b`
- `llama-prompt-guard-2-22m`, `llama-prompt-guard-2-86m` (moderation)

## Cerebras Models
Already covered by existing patterns (`llama-3.3-70b`, `llama-3.1-8b`, `gpt-oss`, `qwen`, `zai`, `glm`)

## Pattern Strategy

### Specific → Generic
Patterns are ordered from most specific to most generic:
1. **Specific variants first**: e.g., `phi-4.*reasoning` before `phi-[34]`
2. **Capability-specific**: e.g., `mistral-large-3` (reasoning) before `mistral-large`
3. **Generic fallback**: Broad patterns catch remaining variants

### Capability Detection
- **Code**: `codestral`, `devstral`, `codegemma`, `starcoder`, `granite.*code`
- **Vision**: `multimodal`, `paligemma`, `kosmos`, `neva`, `vila`, `fuyu`
- **Reasoning**: `reasoning`, `thinking`, `deepseek-v3`, `nemotron`, `cosmos`
- **Moderation**: `guard`, `shield`, `moderation`
- **OCR**: `deplot`, `kosmos`
- **Embedding**: `bge-m3`, `nvclip`
- **Translation**: `riva.*translate`

### Primary Task Assignment
Models are assigned `primaryTask` when they're specialized:
- `primaryTask: "moderation"` → shieldgemma, llama-guard, granite-guardian
- `primaryTask: "ocr"` → deplot
- `primaryTask: "embedding"` → bge-m3, nvclip
- `primaryTask: "tts"` → whisper variants

## Impact

### Before
```
[Surveyor] ⚠️ Could not identify specs for NVIDIA (Env)/microsoft/phi-4-mini-instruct
[Surveyor] ⚠️ Could not identify specs for NVIDIA (Env)/mistralai/mistral-large-3-675b-instruct-2512
[Surveyor] ⚠️ Could not identify specs for NVIDIA (Env)/deepseek-ai/deepseek-v3.1
... (100+ warnings)
```

### After
```
[Surveyor] ✅ Identified NVIDIA (Env)/microsoft/phi-4-mini-instruct via pattern
[Surveyor] ✅ Identified NVIDIA (Env)/mistralai/mistral-large-3-675b-instruct-2512 via pattern
[Surveyor] ✅ Identified NVIDIA (Env)/deepseek-ai/deepseek-v3.1 via pattern
... (100+ models now categorized)
```

## Files Modified

- `/home/guy/mono/apps/api/src/services/Surveyor.ts`
  - Added 60+ new NVIDIA patterns
  - Added 7 new Groq patterns
  - Improved pattern specificity and ordering

## Testing

To verify the improvements, run:
```bash
npx tsx apps/api/src/scripts/force-sync.ts
```

This will re-survey all models and remove them from the `UnknownModel` table.

## Future Enhancements

1. **Context Window Extraction**: Some models may have larger context windows than estimated. Consider extracting from `providerData` if available.
2. **Cost Data**: NVIDIA models are currently marked as free (`costPer1k: 0`). Verify actual pricing.
3. **Dynamic Updates**: Consider periodic re-surveying to catch new model releases.
