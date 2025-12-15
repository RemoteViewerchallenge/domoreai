Here is how the system handles the "Incomplete Data" lifecycle using this schema:

Phase 1: The Blind Spawn (Ingestion)

User adds a new provider key.

System fetches the model list. It gets names but NO context limits.

DB Action: Creates Model records. specs is {}.

Action: System flags these models as needs_calibration.

Phase 2: The Calibration (Agent Discovery)

Orchestrator sees a model with empty specs.

Action: Spawns a cheap "Researcher" agent.

Agent Task: "Google the context window and rate limits for model 'DeepSeek-V3'. Update the aiData field."

Agent Action: Returns JSON. System merges aiData into specs.

Phase 3: The Context Split (Runtime)

Frontend Lead is assigned apps/ui (via WorkOrderCard).

Lead Agent runs ls -R and counts tokens.

DB Action: Updates WorkOrderCard.contextStats -> {"estimatedTokens": 50000}.

Check: Orchestrator compares 50k vs Model Limit (e.g., 8k free tier).

Trigger: OVERLOAD DETECTED.

Action: The Lead Agent (or Orchestrator) performs "Cell Division":

Creates Child Job A: Assigned apps/ui/components

Creates Child Job B: Assigned apps/ui/pages

Injects new "Worker" roles for these specific paths