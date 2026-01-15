# Cooperative OS Glossary

## System Core
* **LaunchPad** (Route: `/`): The system bootloader and hub. Like VSCode's "No Folder Open" state. It handles Project selection, System Configuration, and access to the "Constitution".
* **Cooperative Workspace** (Route: `/workbench`): The primary Operating System interface. It is an adaptive environment that "eats" code to improve itself. It contains:
    * **Swappable Cards:** Multi-modal containers (Editor, Terminal, Browser) that condense/expand based on focus.
    * **Parallel Layouts:** Context-aware layouts (e.g., "Code Mode", "Deploy Mode").
* **Constitution** (Route: `/settings`): The governing laws, global rules, themes, and hotkeys.

## Orchestration & Command
* **Command Center** (Route: `/command`): The "General's Tent." It visualizes the **Chain of Command** (Corp -> Dept -> Div -> Team -> Role). Used to route prompts and oversee high-level execution.
* **Architect Studio** (Route: `/architect`): The "God Mode" for defining **Roles** and **Workflows**. Supports visual grouping (Circling Roles -> Crew -> Division).
* **Code Visualizer** (Route: `/visualizer`): The "Code Eater." A live graph of the Monorepo, showing file ownership by Role. It allows viewing code (Monaco) and summaries (TipTap).

## Data & Intelligence Infrastructure
* **Triple Layer Data:** The resiliency strategy for model data:
    1.  **Layer 1 (Provider Data):** Raw, messy JSON stored exactly as received from the API.
    2.  **Layer 2 (AI Data):** Inferred knowledge (e.g., "This model likely supports Vision") discovered by the **Model Doctor**.
    3.  **Layer 3 (Capabilities):** The computed "Specs" used by the application to filter models.
* **Model Doctor:** An autonomous background service that monitors the `ModelRegistry`. It detects "sick" models (missing specs), infers missing data via heuristics or web search, and "heals" them so they can be used.
* **Role (The Intent):** A defined persona with a specific job. Roles do not own models; they own **Requirements** (e.g., "Must have 128k context", "Must support Image Generation").
* **Model (The Capability):** An inference engine provided by a vendor (Groq, OpenAI). Models are treated as interchangeable commodities selected **Just-In-Time** based on the Role's requirements and current API health.

## Specialized Studios
* **Data Center** (Route: `/datacenter`): "Data God Mode." Direct SQL/JSON interaction. Features **TableNodes** for visual query building (drawing lines between columns to map data).
* **Interface Studio** (Route: `/ui-studio`): The Visual UI Factory (Craft.js) for building frontend layouts.

## Universal Components
* **Global Context Bar:** The persistent top bar containing the **Universal AI Button**.
* **Universal AI Button:** The "Spark" present at every level (Global, Card, Node). It carries the context of its specific container and supports Voice Input/Output.

## Component Map
| Component | File Name | Route | Definition & Purpose |
| :--- | :--- | :--- | :--- |
| LaunchPad | `LaunchPad.tsx` | `/` | The system bootloader. The map of the OS. |
| Agent Workbench | `AgentWorkbench.tsx` | `/workbench` | The "Doing" Grid. Where humans and agents work in Swappable Cards. |
| Command Center | `CommandCenter.tsx` | `/command` | The "General's Tent." High-level dispatch and strategy visualization. |
| Code Visualizer | `CodeVisualizer.tsx` | `/visualizer` | The "Code Eater." Live graph of backend dependencies. |
| Org Structure | `OrganizationalStructure.tsx` | `/org-structure` | The "Defining" Canvas. Where Roles and Chains of Command are built. |
| Data Center | `DataCenter.tsx` | `/datacenter` | "Data God Mode." Manages SQL/JSON and Database Browser. |
| Interface Studio | `InterfaceStudio.tsx` | `/ui-studio` | The Visual UI Factory for building layouts. |
| Constitution | `Constitution.tsx` | `/settings` | Global rules, themes, and system settings. |
| Database Browser | `DatabaseBrowser.tsx` | N/A | Component for viewing tables, importing JSON, and generating SQL. |