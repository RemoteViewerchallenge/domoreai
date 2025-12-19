# Cooperative OS Coding Rules & Constitution

## 1. The Rule of Ubiquity (The "Spark")
* **Requirement:** There is no distinction between `SuperAiButton` and `AiActionTrigger`. They are the **Universal Spark**.
* **Placement:** Every interactive component (Input, Textarea, Node, Card, Terminal) MUST have this button.
* **Context Scope:**
    * **Local Context:** The button knows *exactly* where it is (e.g., "I am attached to the `users` table row 5" or "I am in the Terminal running `npm install`").
    * **Global Context:** The button *also* has access to the high-level system state (current project, active user role, system health), but it prioritizes its local container.

## 2. The Rule of Evolution (Auto-Commit)
* **Requirement:** Any modification made by an AI Agent to the Virtual File System (VFS) MUST trigger an immediate Git Commit.
* **Traceability:** Commits are tagged with `[Role Name]: Intent`. The user must be able to scroll through the "Evolution Timeline" of a document or code file within the Swappable Card.

## 3. The Rule of Persistence (Accessible VFS)
* **Requirement:** The File System is **NOT** a modal that blocks the screen.
* **Implementation:** It is a pervasive layer. In the **Swappable Card**, the file path is editable directly in the header (like a navbar breadcrumb). The file tree can be toggled as a side-drawer or dropdown, but it is always *there* logically, setting the working directory for the agent.

## 4. The Rule of "One Page, One Purpose"
* **LaunchPad (`/`):** System Hub & Bootloader.
* **Cooperative Workspace (`/workbench`):** The "Doing" Grid. Where Swappable Cards live.
* **Command Center (`/command`):** High-level Strategy & Department Dispatch.
* **Code Visualizer (`/visualizer`):** Live codebase graph & file dependency map.
* **Organizational Structure (`/org-structure`):** Defining Roles, Chains of Command, and Workflows.
* **Data Center (`/datacenter`):** SQL/JSON management. Wraps the **Database Browser** (formerly DataNode).
* **Interface Studio (`/ui-studio`):** The Visual UI Factory.
* **Constitution (`/settings`):** Global Rules, Themes, and Font/Icon choices.

## 5. The Rule of Scope & Feature Retention
* **Constraint:** AI Agents may *add* functionality but NEVER remove it.
* **RBAC:** Code modifications are restricted by Role. A "Frontend Agent" cannot drop a database table.