# C.O.R.E. Strategic Alignment & Agent Protocols

**Version:** 2.0 (Dynamic Era)
**Status:** Active
**Target Audience:** System Architects, Lead Developers, and Autonomous Agents.

---

## 1. The Core Philosophy
Our architecture is built on three non-negotiable pillars designed to ensure resilience, cost-efficiency, and scalability in an unpredictable API environment.

### Pillar A: The Zero-Burn Protocol
* **Objective:** Maximizing utility of Free Tier and Local models before spending a single cent.
* **Implementation:** The system must exhaust all "Tier 1" (Free Cloud) and "Tier 2" (Local/Ollama) options. "Tier 3" (Paid) is a fallback of last resort, triggered only by explicit complexity requirements or failure of free tiers.

### Pillar B: Incomplete Data Collection (Schema-on-Read)
* **Objective:** Never reject data because it doesn't fit a shape.
* **Implementation:** We ingest raw data first (JSONB) and refine it later. Agents are responsible for "filling in the blanks" (e.g., discovering rate limits, context windows) asynchronously.

### Pillar C: VFS-Driven Context (Cell Division)
* **Objective:** Prevent context overflow by tying work scope to file structure.
* **Implementation:** A `WorkOrderCard` represents a directory. If the tokens in that directory exceed a model's limit, the Agent must not force execution. Instead, it must trigger **"Cell Division"**—spawning two child roles to handle sub-directories.

---

## 2. System Realignment Orders (Immediate Action)
Several legacy routers are currently violating the "Dynamic" principle by using hardcoded model names. These must be refactored to use the `Model` database table attributes.

### 🚩 Target 1: `ComplexityRouter.ts`
**Current State (Legacy):**
Hardcodes specific models like `'gemini-1.5-pro'` or `'mistral-small-latest'` inside `analyzeTask`.
```typescript
// BAD: Hardcoded dependency
if (taskDescription.includes('code')) recommendedModel = 'gemini-1.5-pro';
```
**New Protocol (Aligned):** Query the Model registry for capabilities and tags.

```typescript
// GOOD: Dynamic Selection
const bestModel = await prisma.model.findFirst({
  where: { 
    capabilities: { has: 'code_generation' },
    isFree: true 
  },
  orderBy: { performanceScore: 'desc' }
});
```

### 🚩 Target 2: `modelSelector.ts`
**Current State (Legacy):** Hardcodes a list of free models: `const freeCloudModels = ['gemini-1.5-flash', ...];`.

**New Protocol (Aligned):** The selector must trust the Database. If a new model is ingested and tagged as `isFree: true`, it should automatically be eligible for selection without code changes.

1.  **Fetch:** Load models where `pricingConfig.costPer1k == 0` OR `isFree == true`.
2.  **Filter:** Remove models currently in RateLimitError state (checked via Redis).
3.  **Sort:** By `specs.speed` or `specs.contextWindow` depending on the task.

---

## 3. Agent Rules of Engagement
All autonomous agents spawned by the Orchestrator must adhere to these operational rules.

### Rule #1: Harvest Everything (The Black Box Rule)
Agents must never discard metadata. Every API interaction must log the raw response headers to `ModelUsage`.

**Why?** We use these headers to reverse-engineer rate limits (`x-ratelimit-remaining`) for providers that don't publish them.

### Rule #2: Audit Your Tools (The Discovery Rule)
Upon spawning, if an Agent is assigned a Model with empty specs:
1.  **Pause** the primary task.
2.  **Execute a self-audit:** "What is my context window? What are my tools?"
3.  **Write these findings** back to the `Model` table in the `aiData` column.
4.  **Resume** the primary task.

### Rule #3: Respect the Weight (The VFS Rule)
Before processing a `WorkOrderCard`, the Agent must run a `tokenizer.count(files)` operation.

IF `totalTokens > model.contextWindow`:
1.  **DO NOT** truncate arbitrarily.
2.  **DO NOT** crash.
3.  **DO** request a "Job Split" from the Orchestrator. "I need help. Please spawn a sub-agent for the `/utils` folder while I handle `/components`."

---

## 4. Workflow Adaptation Guide
How the workforce adapts to this new strategy:

### The "Frontend Lead" Scenario
**Situation:** A Lead Agent is assigned the `apps/ui` folder (200 files, 500k tokens).

*   **Old Way:** Agent tries to read all files, hits token limit, crashes or hallucinates.
*   **New Way:**
    1.  Lead Agent scans `apps/ui`. Sees 500k tokens.
    2.  Lead Agent checks its own context limit (e.g., 128k).
    3.  Lead Agent modifies the Job hierarchy:
        *   Creates Job: "Refactor UI Components" (Assigned to `apps/ui/components`).
        *   Creates Job: "Update Pages" (Assigned to `apps/ui/pages`).
    4.  Lead Agent supervises the outputs of these new Worker Agents, merging their results into the final report.

### The "Unknown Provider" Scenario
**Situation:** User adds a totally new, obscure AI provider key.

*   **Old Way:** System rejects it because it's not in `modelSelector.ts`.
*   **New Way:**
    1.  System accepts the key. Creates a `Model` record with `capabilities: ["text"]`.
    2.  A "Scout Agent" is spawned. It pings the provider.
    3.  It discovers the model supports image inputs.
    4.  It updates the DB: `capabilities.push("vision")`.
    5.  Future "Vision" tasks can now utilize this provider automatically.
