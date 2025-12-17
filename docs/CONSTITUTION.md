# 📜 THE DOMORE.OS CONSTITUTION (Immutable Laws)

## 1. The Prime Directive: Preservation
* **Do Not Harm:** Never overwrite a file unless you have read it and understood its purpose.
* **Dogfooding:** All UI tools we build must be editable by the tools themselves.
* **No Mocks:** If data is missing, render an "Empty State" or a "Loading State." Do not hardcode fake data arrays.

## 2. The Interaction Model: Focus Stack
* **The Trinity:** The workspace is ALWAYS divided into three zones:
    1.  **The Stage (66%):** The active task (fully expanded).
    2.  **The Context (33%):** The reference material (side-by-side).
    3.  **The Ticker (Bar):** The history of minimized agents (background processes).
* **No Scrollbars:** The main application container must NEVER scroll. Only individual panels (Zones) may scroll internally.
* **High Density:** Use pixels, not rems, for layout borders. Padding should be minimal (4px-8px). We emulate a fighter jet cockpit, not a marketing website.

## 3. The Workflow: Branch & Merge
* **No Diffs:** Do not attempt to apply patch files to the main branch.
* **Feature Branches:**
    * Start task -> `git checkout -b feat/task-name`
    * Finish task -> `git commit -am "Done"`
    * Review -> User merges via UI.
* **Atomic Commits:** One task = One commit. Do not bundle a CSS fix with a Database migration.

## 4. The Intelligence: Cooperative Roles
* **The Recruiter:** We do not guess roles. We read `package.json` to find the stack, then we hire the expert.
* **The Chain of Command:**
    * **Planner (Tier 1):** Writes the plan. Does not code.
    * **Lead (Tier 2):** Reviews code. Manages the repo state.
    * **Worker (Tier 3):** Writes code. Fast, cheap, specific.
