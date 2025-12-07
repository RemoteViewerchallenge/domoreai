# Observability for COC (Chain of Command)

This documents traces, metrics, and quick debugging guidance for the COC orchestrator and integration points (Judge, Librarian, Planner).

## Trace file
- `out/traces/events.jsonl` — append-only JSONL; each event is one JSON line with an ISO timestamp.

## Event schema (recommended minimal fields)
- ts: ISO timestamp
- event: event name (task.enqueued, model.call.start, model.call.end, evaluation, task.done, task.requeued, task.escalated, bandit.update)
- taskId, specId, role, model, templateVersion, score, passed, details (avoid secrets)

## Quick local queries
- Tail recent done tasks:
  - `tail -n 200 out/traces/events.jsonl | jq -c 'select(.event=="task.done")'`
- Bandit state:
  - `cat out/bandit_state.json`

## Metrics (suggested)
- Task throughput (per minute)
- Task latency (enqueued → done)
- Success rate per model
- Retry & escalation rates
- Bandit arm plays/winrate

## Integrations
- Judge: subscribe to `evaluation` events; publish `judge.decision` events if overriding.
- Librarian: subscribe to `task.done` to index artifacts.

## Replay
- Use `packages/coc/scripts/replay.ts` to print events for UI development and for offline replay.

## Mock knobs (development)
- COC_MODE=mock|real
- MOCK_SEED=42
- MOCK_INJECT_FAILURE_RATE=0.15
- MOCK_LATENCY_MS=50