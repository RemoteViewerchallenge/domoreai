# Orchestration & Role Decoupling - Visual Architecture

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           C.O.R.E. Orchestration System                      │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────┐        ┌──────────────────────────────────┐
│     Design Time (Static)     │        │    Execution Time (Dynamic)       │
└──────────────────────────────┘        └──────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                          ORCHESTRATION TEMPLATES                             │
│                         (Pure Workflow Logic)                                │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────┐         │
│  │ Orchestration: "Content Review"                                │         │
│  │ ──────────────────────────────────────────────────────────────│         │
│  │                                                                │         │
│  │  Step 1: "Analyze Content"                                    │         │
│  │    ├─ Type: Sequential                                        │         │
│  │    ├─ Input: {{context.input.content}}                        │         │
│  │    └─ Output: analysis                                        │         │
│  │                                                                │         │
│  │  Step 2: "Generate Feedback"                                  │         │
│  │    ├─ Type: Sequential                                        │         │
│  │    ├─ Input: {{context.analysis}}                             │         │
│  │    └─ Output: feedback                                        │         │
│  │                                                                │         │
│  │  Step 3: "Format Report"                                      │         │
│  │    ├─ Type: Sequential                                        │         │
│  │    ├─ Input: {{context.feedback}}                             │         │
│  │    └─ Output: report                                          │         │
│  └────────────────────────────────────────────────────────────────┘         │
│                                                                              │
│  ✅ No roles assigned                                                        │
│  ✅ Reusable across contexts                                                 │
│  ✅ Focuses on workflow logic only                                           │
└──────────────────────────────────────────────────────────────────────────────┘

                                      │
                                      │  execute()
                                      ▼

┌──────────────────────────────────────────────────────────────────────────────┐
│                         EXECUTION CONFIGURATIONS                             │
│                      (Dynamic Role + Input Assignment)                       │
└──────────────────────────────────────────────────────────────────────────────┘

  Configuration A: "Premium Review"          Configuration B: "Quick Review"
  ┌──────────────────────────────────┐      ┌──────────────────────────────┐
  │ Input:                           │      │ Input:                       │
  │   { content: "..." }             │      │   { content: "..." }         │
  │                                  │      │                              │
  │ Role Assignments:                │      │ Role Assignments:            │
  │   "Analyze Content"              │      │   "Analyze Content"          │
  │     → senior_analyzer            │      │     → basic_analyzer         │
  │   "Generate Feedback"            │      │   "Generate Feedback"        │
  │     → expert_reviewer            │      │     → quick_reviewer         │
  │   "Format Report"                │      │   "Format Report"            │
  │     → report_specialist          │      │     → simple_formatter       │
  └──────────────────────────────────┘      └──────────────────────────────┘

  Configuration C: "Mixed Quality"            Configuration D: "Auto (Fallback)"
  ┌──────────────────────────────────┐      ┌──────────────────────────────┐
  │ Input:                           │      │ Input:                       │
  │   { content: "..." }             │      │   { content: "..." }         │
  │                                  │      │                              │
  │ Role Assignments:                │      │ Role Assignments:            │
  │   "Analyze Content"              │      │   (none provided)            │
  │     → senior_analyzer            │      │                              │
  │   "Generate Feedback"            │      │ System Fallback:             │
  │     → basic_reviewer             │      │   → general_worker           │
  │   "Format Report"                │      │                              │
  │     → simple_formatter           │      │                              │
  └──────────────────────────────────┘      └──────────────────────────────┘

                                      │
                                      │  runtime
                                      ▼

┌──────────────────────────────────────────────────────────────────────────────┐
│                            ROLE REPOSITORY                                   │
│                      (Available Actors/Identities)                           │
└──────────────────────────────────────────────────────────────────────────────┘

  ┌───────────────────┐  ┌───────────────────┐  ┌───────────────────┐
  │ senior_analyzer   │  │ expert_reviewer   │  │ report_specialist │
  │ ─────────────     │  │ ─────────────     │  │ ─────────────     │
  │ • High reasoning  │  │ • Deep analysis   │  │ • Format expert   │
  │ • Slow & thorough │  │ • Constructive    │  │ • Professional    │
  │ • Expensive       │  │ • Detailed        │  │ • Clean output    │
  └───────────────────┘  └───────────────────┘  └───────────────────┘

  ┌───────────────────┐  ┌───────────────────┐  ┌───────────────────┐
  │ basic_analyzer    │  │ quick_reviewer    │  │ simple_formatter  │
  │ ─────────────     │  │ ─────────────     │  │ ─────────────     │
  │ • Basic checks    │  │ • Quick feedback  │  │ • Basic format    │
  │ • Fast            │  │ • Bullet points   │  │ • Plain text      │
  │ • Cheap           │  │ • Fast            │  │ • Fast            │
  └───────────────────┘  └───────────────────┘  └───────────────────┘

  ┌───────────────────┐
  │ general_worker    │
  │ ─────────────     │
  │ • Fallback role   │
  │ • Versatile       │
  │ • Always available│
  └───────────────────┘

================================================================================
                              EXECUTION FLOW
================================================================================

1. ┌─────────────────────────┐
   │ User selects:           │
   │ • Orchestration ID      │
   │ • Input data            │
   │ • Role assignments      │
   └─────────────────────────┘
                │
                ▼
2. ┌─────────────────────────┐
   │ OrchestrationService    │
   │ .executeOrchestration() │
   └─────────────────────────┘
                │
                ▼
3. ┌─────────────────────────┐
   │ For each step:          │
   │ • Get role from map     │
   │   OR fallback           │
   │ • Create agent          │
   │ • Execute task          │
   └─────────────────────────┘
                │
                ▼
4. ┌─────────────────────────┐
   │ Return execution log    │
   │ with results            │
   └─────────────────────────┘

================================================================================
                            ROLE SELECTION LOGIC
================================================================================

┌──────────────────────────────────────────────────────────────────────┐
│  executeStep(step, context, roleAssignments)                         │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │ Is roleAssignments defined    │
              │ AND has step.name key?        │
              └───────────────────────────────┘
                      │              │
                 YES  │              │ NO
                      ▼              ▼
          ┌──────────────────┐   ┌──────────────────────┐
          │ Use assigned     │   │ Look for role named  │
          │ role from map    │   │ 'general_worker'     │
          └──────────────────┘   └──────────────────────┘
                  │                      │
                  │                      ▼
                  │              ┌──────────────────────┐
                  │              │ Found?               │
                  │              └──────────────────────┘
                  │                  │           │
                  │             YES  │           │ NO
                  │                  ▼           ▼
                  │          ┌──────────┐  ┌────────────────┐
                  │          │ Use it   │  │ Use first role │
                  │          └──────────┘  │ in database    │
                  │                        └────────────────┘
                  │                              │
                  └──────────────┬───────────────┘
                                 │
                                 ▼
                         ┌──────────────┐
                         │ Create Agent │
                         │ with Role    │
                         └──────────────┘

================================================================================
                          BENEFITS VISUALIZATION
================================================================================

Before (Coupled):
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ Review: Senior  │  │ Review: Junior  │  │ Review: Mixed   │
│ ───────────────│  │ ───────────────│  │ ───────────────│
│ Step 1: Analyze │  │ Step 1: Analyze │  │ Step 1: Analyze │
│   → senior      │  │   → junior      │  │   → senior      │
│ Step 2: Report  │  │ Step 2: Report  │  │ Step 2: Report  │
│   → senior      │  │   → junior      │  │   → junior      │
└─────────────────┘  └─────────────────┘  └─────────────────┘
     3 separate orchestrations = 3× maintenance burden

After (Decoupled):
┌──────────────────────────────────────┐
│ Review Template                      │
│ ────────────────────────────────────│
│ Step 1: Analyze (no role)           │
│ Step 2: Report (no role)            │
└──────────────────────────────────────┘
              │
              ├─ Execute with { senior, senior }
              ├─ Execute with { junior, junior }
              └─ Execute with { senior, junior }
     1 orchestration = 1× maintenance, infinite configs!

================================================================================
                            DATA FLOW EXAMPLE
================================================================================

Input:
{ "content": "Article about AI trends in 2024" }

Orchestration: "Content Review"
Role Assignments: {
  "Analyze Content": "senior_analyzer",
  "Generate Feedback": "expert_reviewer",
  "Format Report": "report_specialist"
}

Step 1: "Analyze Content"
  ┌────────────────────────────────────────────────────┐
  │ Role: senior_analyzer                              │
  │ Input: "Article about AI trends in 2024"           │
  │ Output: {                                          │
  │   quality: 8/10,                                   │
  │   strengths: ["good structure", "clear examples"], │
  │   weaknesses: ["missing citations"]                │
  │ }                                                  │
  └────────────────────────────────────────────────────┘
                      │
                      ▼
Step 2: "Generate Feedback"
  ┌────────────────────────────────────────────────────┐
  │ Role: expert_reviewer                              │
  │ Input: { quality: 8/10, strengths: [...], ... }    │
  │ Output: "Overall excellent work. To improve,       │
  │          please add citations for statistics..."   │
  └────────────────────────────────────────────────────┘
                      │
                      ▼
Step 3: "Format Report"
  ┌────────────────────────────────────────────────────┐
  │ Role: report_specialist                            │
  │ Input: "Overall excellent work..."                 │
  │ Output: "# Content Review Report\n\n               │
  │          **Quality Score**: 8/10\n\n..."           │
  └────────────────────────────────────────────────────┘
                      │
                      ▼
Final Output:
{
  report: "# Content Review Report...",
  status: "completed"
}

================================================================================
