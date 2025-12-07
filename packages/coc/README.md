# @domoreai/coc

Chain-Of-Command (COC) orchestrator scaffold for dynamic role handoffs and model orchestration.

## Overview

This package provides a minimal orchestrator that supports:
- Dynamic role handoffs between different agent roles
- Multi-armed bandit learner for model selection
- Trace logging for debugging and analysis
- Configuration toggle to swap between mock and real integrations

## Usage

### Running Locally (Mock Mode - Default)

By default, the COC orchestrator runs with mocked components, requiring no external API keys:

```bash
# From the monorepo root
pnpm --filter @domoreai/coc start

# Or from the package directory
cd packages/coc
pnpm start
```

### Switching to Real Mode

To attempt to use real integrations, set the `COC_MODE` environment variable:

```bash
COC_MODE=real pnpm --filter @domoreai/coc start
```

**Note**: Real mode requires production integration modules at `packages/coc/src/prod/`. These are not included in this scaffold. If real mode is enabled but prod modules are missing, you'll see an informative error message with instructions.

## Output

### Trace Logs

All orchestration events are logged to `out/traces/events.jsonl` in JSONL format. Each line contains a structured event with timestamp, type, and relevant data.

### Bandit State

The multi-armed bandit learner persists its state to `out/bandit_state.json`, tracking model performance metrics and selection probabilities.

## Architecture

- **config.ts**: Manages environment-based configuration (mock vs real mode)
- **coc.ts**: Main orchestrator that coordinates role handoffs
- **bandit.ts**: Multi-armed bandit implementation for model selection
- **model-registry.ts**: Mock model registry (prod version in `src/prod/`)
- **retriever.ts**: Mock retriever for context retrieval
- **task-queue.ts**: In-memory task queue implementation
- **evaluator.ts**: Mock evaluator for scoring model outputs

## Development

This is a low-risk scaffolding package for local experimentation. It does not wire real credentials or external services by default.

To add production integrations:
1. Implement modules in `packages/coc/src/prod/`
2. Each prod module should match the interface of its mock counterpart
3. Set `COC_MODE=real` to activate production integrations
