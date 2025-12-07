# Agent Templates

This directory contains agent templates used by the COC orchestrator.

## ⚠️ MOCK TEMPLATES

**All templates in this directory are MOCK implementations** for local development and testing.

Templates are loaded based on the agent role specified in directive specs. The orchestrator uses these templates to construct prompts.

## Template Format

Templates use Mustache-style variable interpolation:

```
You are a {{role}} agent.

Task: {{task_description}}

Context: {{context}}

Please complete the task.
```

## Available Templates

- `worker.tpl` - MOCK template for worker agents

## Versioning

Templates should be versioned with the orchestrator. Changes to templates may affect directive behavior.

When adding new templates:
1. Document the template purpose and variables
2. Test with sample directives
3. Update this README

## Production Templates

For production use:
1. Create `agents/templates/prod/` directory
2. Add production templates with real prompt engineering
3. Update orchestrator to load from prod/ when `COC_MODE=real`

## Template Variables

Common variables available in templates:

| Variable | Description |
|----------|-------------|
| `role` | Agent role (e.g., "worker", "reviewer") |
| `task_description` | Task description from directive |
| `context` | Additional context from previous tasks |
| `directive_id` | ID of the parent directive |
| `task_id` | ID of the current task |

## Notes

- Templates must be valid UTF-8 text files
- Variable names are case-sensitive
- Undefined variables are replaced with empty strings
- Complex logic should be in the orchestrator, not templates
