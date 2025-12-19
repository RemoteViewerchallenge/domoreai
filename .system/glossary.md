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

## Specialized Studios
* **Data Center** (Route: `/datacenter`): "Data God Mode." Direct SQL/JSON interaction. Features **TableNodes** for visual query building (drawing lines between columns to map data).
* **Interface Studio** (Route: `/ui-studio`): The UI Builder (Craft.js). Allows building interfaces using generic and custom components with AI assistance.

## Universal Components
* **Global Context Bar:** The persistent top bar containing the **Universal AI Button**.
* **Universal AI Button:** The "Spark" present at every level (Global, Card, Node). It carries the context of its specific container and supports Voice Input/Output.

Component / Page,File Name (New),Route,Definition & Purpose
LaunchPad,LaunchPad.tsx,/,The system bootloader. The map of the OS. (Like VSCode with no folder open).
Agent Workbench,AgentWorkbench.tsx,/workbench,"The ""Doing"" Grid. Where humans and agents work in Swappable Cards."
Command Center,CommandCenter.tsx,/command,"The ""General's Tent."" High-level dispatch to departments and strategy visualization."
Code Visualizer,CodeVisualizer.tsx,/visualizer,"The ""Code Eater."" Live graph of the backend, showing file dependencies and role ownership."
Organizational Structure,OrganizationalStructure.tsx,/org-structure,"The ""Defining"" Canvas. Where Roles, Teams, and Chains of Command are built."
Data Center,DataCenter.tsx,/datacenter,"""Data God Mode."" Manages SQL/JSON. Wraps the Database Browser."
Interface Studio,InterfaceStudio.tsx,/ui-studio,The Visual UI Factory (Craft.js) for building frontend layouts.
Constitution,Constitution.tsx,/settings,"Global rules, themes, and system settings."
Database Browser,DatabaseBrowser.tsx,N/A (Component),"The visual component for viewing tables, importing JSON, and generating SQL (formerly DataNode)."