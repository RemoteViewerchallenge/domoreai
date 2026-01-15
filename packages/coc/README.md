# COC (Chain Of Command) - minimal scaffold

This package provides a minimal Chain-Of-Command orchestrator for local experimentation.

Modes
- Default: `COC_MODE=mock` — safe, uses mock components (no API keys).
- Real:    `COC_MODE=real` — attempts to load production modules under `packages/coc/src/prod`.
  - If prod modules are missing the orchestrator will error with a clear message (no silent fallback).

Tracing and bandit state
- Traces: `out/traces/events.jsonl` (append-only JSONL)
- Bandit state: `out/bandit_state.json`

Run locally
- From repo root (pnpm workspaces):
  - `pnpm --filter @domoreai/coc start`
- Or from package:
  - `cd packages/coc`
  - `pnpm start`

Mock knobs (use `.env` or environment):
- COC_MODE=mock|real
- MOCK_SEED (default 42)
- MOCK_INJECT_FAILURE_RATE (0..1)
- MOCK_LATENCY_MS (ms)

Notes
- All mocks are under `packages/coc/src` and are explicitly labeled; remove/replace prod modules only when ready.
- Outputs for orchestration are JSON/JSONL to allow reuse with existing JSON loader.