#!/bin/bash
# COC Comprehensive Monitoring Script
# Shows model selection, role selection, and tool usage in real-time

TRACE_FILE="/home/guy/mono/packages/coc/out/traces/events.jsonl"

echo "════════════════════════════════════════════════════════════════"
echo "  🧠 C.O.R.E. Cognitive Orchestration Monitor"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Follow the trace file and format events
tail -f "$TRACE_FILE" | while IFS= read -r line; do
    event=$(echo "$line" | jq -r '.event')
    
    case "$event" in
        "task.picked")
            taskId=$(echo "$line" | jq -r '.taskId')
            role=$(echo "$line" | jq -r '.role')
            echo ""
            echo "┌─────────────────────────────────────────────────────────────"
            echo "│ 📋 Task: $taskId"
            echo "│ 👤 Role: $role"
            ;;
        "bandit.model.selected")
            model=$(echo "$line" | jq -r '.simulatedModel')
            provider=$(echo "$line" | jq -r '.arm.meta.provider // "unknown"')
            echo "│ 🤖 Model: $model (provider: $provider)"
            ;;
        "bandit.role.selected")
            nextRole=$(echo "$line" | jq -r '.simulatedRole')
            armId=$(echo "$line" | jq -r '.arm.id')
            echo "│ 🔀 Next Role: $nextRole (arm: $armId)"
            ;;
        "tool.execution.start")
            echo "│ 🔧 Starting tool execution..."
            ;;
        "tool.result")
            toolName=$(echo "$line" | jq -r '.toolName')
            result=$(echo "$line" | jq -c '.result // "success"')
            echo "│   ✅ Tool: $toolName → $result"
            ;;
        "tool.error")
            toolName=$(echo "$line" | jq -r '.toolName')
            error=$(echo "$line" | jq -r '.error')
            echo "│   ❌ Tool Error: $toolName → $error"
            ;;
        "tool.execution.end")
            toolCount=$(echo "$line" | jq -r '.toolCount')
            echo "│ 🔧 Tool execution complete ($toolCount tools)"
            ;;
        "evaluation")
            score=$(echo "$line" | jq -r '.eval.score')
            echo "│ 📊 Evaluation Score: $score"
            ;;
        "task.done")
            echo "└─────────────────────────────────────────────────────────────"
            ;;
        "bandit.model.update")
            reward=$(echo "$line" | jq -r '.reward')
            armId=$(echo "$line" | jq -r '.armId')
            echo "│ 🎯 Model Bandit Updated: $armId → reward=$reward"
            ;;
        "bandit.role.update"|"bandit.role.delayed_update")
            reward=$(echo "$line" | jq -r '.reward')
            armId=$(echo "$line" | jq -r '.armId')
            updateType=$(echo "$event" | grep -q "delayed" && echo "delayed" || echo "immediate")
            echo "│ 🎯 Role Bandit Updated ($updateType): $armId → reward=$reward"
            ;;
    esac
done
