# Remote Agent Instructions — RemoteViewerchallenge/domoreai

Location: root of repo (or docs/agents/). This file contains the authoritative rules and workflow instructions for any automated or human GitHub remote agent working on RemoteViewerchallenge/domoreai.

Read this carefully before making any change or opening a Pull Request. These rules are intentionally strict to protect data, preserve stability, and make the project auditable.

---

Table of contents
- Purpose & scope
- Repository context & important locations
- Global principles (must-follow)
- Branching & naming conventions
- Commit, pre-commit & PR requirements
- CI / pipeline expectations
- Database & Prisma safety rules
- Migrations & schema change process
- Snapshots, backups & persistence policy
- UI & design system rules (FlyonUI, lucide, phosphor, motion)
- AI, Model Broker & Orchestration rules
- Filesystem / VFS / Role context handling
- Secrets & environment variables
- Testing & staging process
- Parallel work / responsibilities
- How to request human approval (for destructive ops)
- PR review checklist (for humans & agents)
- Quick example commands & templates

---

Purpose & scope
- These instructions are authoritative for any automated coding agent (or human) contributing code to this monorepo.
- They are designed to: protect production data, keep UI consistent, make all changes additive and revertible, and ensure CI/linters/tests always pass before merging.

Repository context & important locations
- Main app(s): `apps/ui/`, `apps/api/`
- Current UI theme: `apps/ui/src/design-system/`
- File system store + VFS: `apps/ui/src/stores/FileSystemStore.tsx` and API tools `apps/api/src/tools/filesystem.ts`
- Role & orchestration code: `apps/api/src/routers/role.router.ts` and role data under `apps/api/data/agents/`
- Workspace and legacy pages: `apps/ui/src/pages/WorkSpace.tsx` (legacy), `apps/ui/src/pages/COORP.tsx` (new)
- Prisma schema: `prisma/schema.prisma` (or `apps/api/prisma/schema.prisma`) — check repo structure
- Model broker / bandit logic: search for "bandit", "model", "provider", "Kong Volcano" in `apps/api/src/services` and similar
- Design-system dependencies (already present): `@themeselection/flyonui`, `lucide-react`
- Additional icons & motion to integrate: `@phosphor-icons/homepage`, `@motiondivision/motion`

Global principles (must-follow)
1. Additive-only changes by default. Do not remove or rename existing public routes, DB tables, or columns without explicit human approval and a well-documented migration plan.
2. Non-destructive Prisma changes only: add models or nullable columns. No column/table drops or force migrations.
3. All UI changes must prefer `apps/ui/src/design-system` primitives (FlyonUI wrappers). No one-off color literals — use design tokens.
4. Use feature flags or route-toggle wrappers to introduce new pages that replace legacy pages. Keep legacy pages accessible until owner explicitly removes them.
5. All PRs must pass linting, type checks, build, and tests in CI before merge.
6. Every automated agent commit must include:
   - A clear commit message following conventional style (see below).
   - Evidence (in PR body) of local checks: lint, build, tests run.
   - A list of files changed and a short rationale.

Branching & naming conventions
- Base branches:
  - `main` — production-ready; protected by branch rules; require reviews and CI passes.
  - `staging` or `develop` — integration; can be used for staging deployments.
- Feature branches (required format): feature/<ticket-or-short-description>
  - Example: `feature/coorp-ui-ai-button`
- Bugfix branches: fix/<area>/<short-desc>
  - Example: `fix/prisma-role-vfs`
- Hotfix: hotfix/<short-desc>
- Experiment or spike branches: exp/<short-desc> (must be squashed/closed after review)
- DO NOT push directly to `main`. Open a PR, assign reviewers per CODEOWNERS.

Commit message convention (examples)
- Format: <type>(<scope>): <short summary>
- Allowed types: feat, fix, docs, chore, refactor, perf, test
- Example: feat(coorp): add AiButton design-system component and TRPC stub
- Include issue/ticket number if provided: feat(coorp): add AiButton (#123)

Pre-commit & PR requirements (local and CI)
Before pushing any branch, agents must run (and pass) these locally or in their workspace:
1. npm/yarn install (repo uses pnpm/yarn/npm — use repo's convention)
2. lint: `pnpm lint` or `npm run lint` — fix lints or add rule waiver with human approval
3. typecheck: `pnpm build` or `npm run typecheck` depending on project scripts
4. test: `pnpm test` — unit tests must pass for affected packages
5. build: `pnpm build` for `apps/ui` and `apps/api` if applicable
6. format: `pnpm prettier:fix` or `npm run format` prior to commit
7. Run relevant package-specific checks (e.g., Prisma generate) to ensure generated clients are consistent.

Automated checks the agent must attach in PR body:
- Local lint output summary or link to CI job logs
- Local test coverage / summary for changed modules (if tests added)
- List of new or changed Prisma models (if any) and a migration plan

CI / pipeline expectations
- PRs must pass CI tasks:
  - install
  - lint
  - typecheck
  - build
  - unit tests
  - optional: e2e/test containers for critical flows (if present)
- Do not mark PR as ready to merge with failing CI.
- If PR introduces migration files, CI should run `prisma migrate dev --create-only` in a safe environment (no destructive flag) to produce artifacts. Human must review migration SQL.

Database & Prisma safety rules (critical)
- No destructive Prisma migrations without explicit human owner approval.
- All schema changes are additive-only by default:
  - New models, new nullable columns, JSON fields, indices are allowed.
  - Non-null constraints must either include default values or require human approval.
- Never use `prisma db push --accept-data-loss` in scripts or CI.
- Any script or code that performs DELETE, DROP, TRUNCATE, ALTER that could remove data must include:
  - Large comment header: "HUMAN-ONLY: review & run"
  - A runtime guard: check for env var `APP_ALLOW_DESTRUCTIVE_DB=true` or session var `app.allow_delete=true`
  - Audit log entry creation (see below)
- Soft deletes:
  - Add `deletedAt: DateTime?` to critical models if needed (additive).
  - Prefer logical delete endpoints; physical delete requires explicit admin flow.
- Prisma migration process:
  1. Create schema changes locally (additive).
  2. Run `prisma migrate dev --name <short-desc>` locally in a non-production environment.
  3. Include migration files in PR. Do NOT run migrations in production automatically — migrations require human verification and approval.
  4. If migration affects critical data, include a data-preservation plan and snapshot steps.

Migrations & schema change process (detailed)
- Agents may:
  - Generate migration files and attach them to the PR.
  - Include SQL preview and migration notes in the PR for human reviewers.
- Agents must NOT:
  - Apply migrations to production.
  - Create migrations that drop columns or tables.
- PR must include:
  - Migration folder path and brief explanation.
  - Backout plan (how to revert).
  - Snapshot plan for data preservation (run snapshot before applying).
- Human approval required before merging migrations into `main`.

Snapshots, backups & persistence policy
- Every critical create/update (Role, CoorpNode, Role definitions, VFS configs) must be snapshot-able as JSON.
- Agents must implement snapshot logic as additive utilities that:
  - Save JSON snapshots to a `snapshots/` folder or dedicated repo branch.
  - Create Git commits using a dedicated service account, to a `snapshots/*` branch; include commit memo in DB audit logs.
- Database backups:
  - Agents should include or schedule `pg_dump` to object storage regularly (preferably daily).
  - Provide a retention plan in the PR if introducing backup code.
- Audit logs table:
  - Agents adding DB-modifying features must also add (or write to) an `AuditLog` model/table with:
    - who, what, when, why, snapshot_ref (git SHA path)
  - Audit entries on destructive operations must be mandatory.

UI & design system rules (FlyonUI, lucide, phosphor, motion)
- Always prefer `apps/ui/src/design-system` primitives and FlyonUI wrappers for Buttons, Inputs, Popovers, Tooltips, Panels, and Layout.
- Icons:
  - `lucide-react` for line icons (already used).
  - Integrate `@phosphor-icons/homepage` into design-system icon wrapper (duotone/filled) — add a single wrapper component to map to both icon sources and export a unified Icon interface.
- Animations:
  - Use `@motiondivision/motion` for animations but gate all animations behind ThemeContext.animationsEnabled. The theme toggle must be persisted (localStorage) and available globally.
  - Provide a no-animation fall-back path and unit tests for UI rendering without animations.
- Styling:
  - Avoid raw hex tokens/dense hardcoded colors in new components; use theme tokens in design-system.
  - For any new color or token, add it to the design-system tokens and the theme file.
- New pages:
  - Use feature flags (or route wrapper) to swap new pages for legacy ones; do not remove legacy pages in the same PR.

AI, Model Broker & Orchestration rules
- Agents must call the existing model broker / bandit service for inference and not hard-code a provider/model.
- No credentials or secrets should be hard-coded into code. Use environment variables and a secret manager.
- Orchestration (Kong Volcano SDK):
  - Expose orchestration info in read-only fashion in frontend (COORP) unless owner explicitly asks to change runtime orchestrations.
  - Agents must not change live orchestration runtime unless explicitly requested and approved by the owner.
- For new AI endpoints (e.g., `ai.runWithContext`):
  - Implement as TRPC endpoints that call ContextService and then the model broker.
  - If stubbed, clearly mark as MOCK in code and PR.

Filesystem / VFS / Role context handling
- Use existing VFS APIs in `apps/api/src/tools/filesystem.ts` and `apps/ui/src/stores/FileSystemStore.tsx`.
- Role entity must store `vfsConfig` as a JSON field (relative paths with workspaceRoot).
- Agents must implement context size estimation in a non-destructive manner: use file metadata (size) or read small excerpts for token estimates. Avoid reading huge files unnecessarily.
- UI checkboxes for selecting files/folders must be client-side and saved to role `vfsConfig`.
- Do not allow agents to change the global workspace root setting without explicit human approval.

Secrets & environment variables
- No secrets in code or committed files.
- Agents must reference env vars (process.env) and document new env var requirements in PRs and in a `.env.example` file.
- For git-committed snapshots or service accounts, the token must be limited-scoped and stored in CI secret store.

Testing & staging process
- Agents must add unit tests for any new logic (ContextService, AiButton, VFS helper) and run them locally.
- For UI components, include a story/example (Storybook if present) or a small demo page under a `/demo` route behind a feature flag.
- Deploy to staging and run basic integration QA before merging into `main`.
- For DB migrations, run migrations in staging first and verify data integrity before proposing to merge.

Parallel work / responsibilities (how agents coordinate)
- Use the earlier provided Workstreams:
  - Infra & DB guardrails (A)
  - UI & Feature flag scaffolding (B)
  - Context & AI orchestration (C)
  - Snapshots & backups (D)
- Agents may work in parallel but must:
  - Rebase onto latest `staging` before opening PR.
  - Ensure migration files are consistent; coordinate on migration names (use ticket id + short desc).
  - Coordinate via PR comments and reference related PRs.
- Merge order for dependencies:
  - DB schema additions and guard docs → UI scaffolding → Context service and AI endpoints → COORP & Role VFS UI → snapshots & backup scripts.

How to request human approval (for destructive ops)
- Any action that can delete or mutate production data requires:
  1. Create an issue describing the change and risks.
  2. Create a PR with migration files and a step-by-step manual runbook.
  3. Add the label `awaiting-owner-approval`.
  4. Notify owner(s) and explicitly request human sign-off.
  5. Only after human owner sets `APP_ALLOW_DESTRUCTIVE_DB=true` in an admin session and signs the PR, the maintainer may apply changes. Keep audit logs of the action and take snapshots before applying.

PR review checklist (for humans & agents)
- CI checks pass: lint, build, tests.
- No destructive Prisma commands included; migration files are additive only.
- DB migration files are present in PR when schema changed.
- If new UI added: uses design-system primitives, icons wrapper, animations gated by ThemeContext.
- Snapshot created for changed entities (role/coorp).
- Audit log entries added for scripts that change DB content.
- Env vars required documented in `.env.example`.
- PR description includes:
  - What changed and why
  - Local reproduction steps
  - Commands run: lint/typecheck/test/build
  - Any migration or manual steps to run in staging/production
- If PR adds a new endpoint: includes security review and limit controls.

Quick example commands & templates
- Install & run checks:
  - pnpm install
  - pnpm lint
  - pnpm build
  - pnpm test
  - pnpm format
- Branch creation:
  - git checkout -b feature/coorp-ai-button
- Commit example:
  - git commit -m "feat(coorp): add AiButton component and ai.runWithContext TRPC stub"
- PR body template (copy into PR):
  - Title: feat(coorp): <short summary>
  - Description:
    - Summary of change:
    - Files changed:
    - Local checks run:
      - lint: PASS
      - build: PASS
      - tests: PASS
    - Migration files included (Y/N):
    - Snapshot created (path or git SHA):
    - Manual steps for staging:
    - Human approvals required: (list)

Final notes
- Agents must operate conservatively. If uncertain, create an issue, ask for human clarification, and do not push code that alters DB or critical runtime behavior without explicit owner instructions.
- Keep every change traceable with snapshots and audit logs to ensure reversibility.

If you want, I can also:
- Generate a `PR_TEMPLATE.md` for the repo.
- Generate a Git pre-commit hook script (husky or simple installable script) to run lint/tests locally.
- Provide a minimal `CODEOWNERS` suggestion for key folders.

---

End of instructions.
