**Import Guide**

This document explains the JSON import behavior and the guarded options available in the UI and API.

- **Endpoint**: `dataRefinement.importJsonToTable`
- **Input**: `{ tableName, jsonString, options? }`

Options:
- `allowReserved` (boolean): If `true`, allows importing directly into reserved/core tables such as `Role`. **Requires** `auditReason` to be provided.
- `preserveIds` (boolean): If `true` and your JSON has an `id` field, the created table will use `id TEXT PRIMARY KEY` and incoming ids will be used as the primary key.
- `preserveCreatedAt` (boolean): If `true`, incoming `created_at` values are preserved instead of being renamed to `source_created_at`.
- `upsertOnConflict` (boolean): When `preserveIds` is `true`, setting this to `true` will add an `ON CONFLICT (id) DO UPDATE` clause to inserts (overwrites existing rows with incoming values).
- `auditReason` (string): A short note explaining why a guarded import was allowed. Required when `allowReserved=true`.

Behavior note:
- By default the importer renames incoming `id` to `source_id` and `created_at` to `source_created_at` to avoid accidental primary key or timestamp collisions. Use the `preserve*` flags intentionally if you want direct preservation.
- When importing into reserved tables you must explicitly opt in (`allowReserved=true`) and provide an `auditReason`. An `ImportAudit` row is recorded for traceability.

UI:
- The Data Explorer import modal now exposes these options and validates the required `auditReason` when attempting guarded imports.
