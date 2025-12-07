# Agent Templates

This directory contains template files for COC orchestrator agent roles.

## Available Templates

### worker.tpl

Generic worker agent template with configurable parameters:
- `{{role}}`: Agent role (e.g., "code_reviewer", "code_generator")
- `{{model}}`: Model identifier to use
- `{{temperature}}`: Temperature setting for generation
- `{{task_type}}`: Type of task being executed
- `{{context}}`: Retrieved context for the task
- `{{input}}`: User input or task description
- `{{task_description}}`: Detailed description of what the agent should do
- `{{output_format}}`: Expected format for the output

## Usage

Templates are used by the COC orchestrator to structure prompts for different agent roles. The orchestrator fills in the template variables based on the task configuration and context.

## Adding New Templates

To add a new template:
1. Create a `.tpl` file in this directory
2. Use `{{variable}}` syntax for template variables
3. Include clear instructions for the agent role
4. Document the template variables in this README
