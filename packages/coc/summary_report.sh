#!/bin/bash
# COC Summary Report
# Analyzes historical trace data to show model, role, and tool usage patterns

TRACE_FILE="/home/guy/mono/packages/coc/out/traces/events.jsonl"

echo "════════════════════════════════════════════════════════════════"
echo "  📊 C.O.R.E. Performance Summary Report"
echo "════════════════════════════════════════════════════════════════"
echo ""

echo "▶ Task Completion (last 50 tasks):"
tail -200 "$TRACE_FILE" | jq -r 'select(.event == "task.done") | "  ✅ \(.taskId) - score: \(.score)"' | tail -50
echo ""

echo "▶ Model Selection Diversity (last 100 selections):"
tail -300 "$TRACE_FILE" | jq -r 'select(.event == "bandit.model.selected") | .simulatedModel' | tail -100 | sort | uniq -c | sort -rn | head -20
echo ""

echo "▶ Role Routing Patterns (last 100 selections):"
tail -300 "$TRACE_FILE" | jq -r 'select(.event == "bandit.role.selected") | "\(.arm.nextRole // "none")"' | tail -100 | sort | uniq -c | sort -rn
echo ""

echo "▶ Tool Usage Statistics (last 100 tool calls):"
tail -500 "$TRACE_FILE" | jq -r 'select(.event == "tool.result" or .event == "tool.error") | "\(.toolName) - \(if .error then "ERROR" else "SUCCESS" end)"' | tail -100 | sort | uniq -c | sort -rn
echo ""

echo "▶ Provider Distribution:"
tail -200 "$TRACE_FILE" | jq -r 'select(.event == "bandit.model.selected") | .arm.meta.provider // "unknown"' | sort | uniq -c | sort -rn
echo ""

echo "▶ Model Bandit Performance (top 10 arms by selection count):"
tail -500 "$TRACE_FILE" | jq -r 'select(.event == "bandit.model.update") | .armId' | sort | uniq -c | sort -rn | head -10
echo ""

echo "▶ Role Bandit Performance (top 10 arms by selection count):"
tail -500 "$TRACE_FILE" | jq -r 'select(.event == "bandit.role.update" or .event == "bandit.role.delayed_update") | .armId' | sort | uniq -c | sort -rn | head -10
echo ""

echo "▶ Recent Tool Execution Sessions:"
tail -200 "$TRACE_FILE" | jq -r 'select(.event == "tool.execution.end") | "  Task \(.taskId): \(.toolCount) tools executed"' | tail -20
echo ""

echo "════════════════════════════════════════════════════════════════"
