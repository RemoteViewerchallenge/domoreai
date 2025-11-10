## **System Architecture: The Multi-Agent Orchestration IDE**

This document outlines the current architecture, core philosophy, and immediate development roadmap for the Multi-Agent Orchestration IDE.


### 1. Project Philosophy & Overview

This project is a typesafe, cutting-edge AI Agent Workforce Dashboard. It is designed as a highly customized IDE to maximize the utility of free and rate-limited Large Language Models (LLMs) within a development workflow.

The core philosophy is to achieve a **90% planning/design and 10% autonomous coding** split. The system facilitates a human-led design process where the user orchestrates multiple models for research and planning. The final, human-refined plan is then handed to autonomous agents for a small, precise execution, often resulting in automated Git commits.


### 2. Current System Architecture

The system is a monorepo built with a clear separation of concerns, balancing a powerful frontend IDE with a robust, database-driven backend.


<table>
  <tr>
   <td><strong>Component</strong>
   </td>
   <td><strong>Status</strong>
   </td>
   <td><strong>Architectural Role</strong>
   </td>
  </tr>
  <tr>
   <td><strong>Monorepo Stack</strong>
   </td>
   <td>TypeScript, React, Next.js, tRPC, pnpm
   </td>
   <td>Provides end-to-end type safety and efficient dependency management (atomic commits).
   </td>
  </tr>
  <tr>
   <td><strong>Agent Core</strong>
   </td>
   <td>Volcano.dev (Code Mode)
   </td>
   <td>Foundation for multi-agent workflows. It uses LLMs to write TypeScript code to perform actions, rather than contrived tool-calling syntax.
   </td>
  </tr>
  <tr>
   <td><strong>VFS & Sandbox</strong>
   </td>
   <td>@jsvfs/core + /filesystem API
   </td>
   <td>Provides the isolated execution fence and file persistence (sandbox boundary). This abstracts local disk, S3, or SSH into a single, secure API.
   </td>
  </tr>
  <tr>
   <td><strong>User Interface</strong>
   </td>
   <td>Monaco Editor Grid
   </td>
   <td>The central hub for context management and multi-model planning. Acts as the Virtual Terminal and Versioned Filesystem viewer.
   </td>
  </tr>
  <tr>
   <td><strong>Model Strategy</strong>
   </td>
   <td>Database-First
   </td>
   <td>A system (to be built) that defines and matches model capabilities (parameters, scoring) to specific agent roles to optimize cost and performance.
   </td>
  </tr>
</table>



### 3. Future Vision: The Core Loop

The target workflow for the IDE is a human-in-the-loop, agent-assisted process:



1. **Input:** Voice (Speech-to-Text) input initiates the design process.
2. **Orchestration & Planning:** The Model Manager deploys multiple models simultaneously for research, summarization, and idea generation.
3. **Human Feedback:** Results are presented in the Monaco Grid. The user selects, edits, and refines the best outputs in an editable "Master Plan" Monaco Editor.
4. **Final Execution:** The refined plan (the 90% perfect design) is packaged with an Agent's specific Role and Workspace and handed to the Lootbox to generate and execute the final, small code blocks (e.g., Git auto-commits).


### 4. Immediate Roadmap: Bootstrap Coding Tasks

The following tasks are medium-sized, self-contained objectives for the AI agents to execute, building the next layer of security, data, and communication.


---


#### Task Set 1: Data Structures and Security Layer (Backend)



1. **Create Agent Types (packages/common)**
    * **Objective:** Define the core TypeScript interfaces to be shared across the monorepo: Role, RoleParams, AgentSession, and VfsSessionToken. This will enforce consistency.
2. **Build VFS Security Layer (apps/api)**
    * **Objective:** Implement the VfsSessionService using @jsvfs/core. This service must be responsible for generating and validating short-lived, scoped VFS tokens that are linked to a user session.
3. **Implement Git Client Wrapper (apps/api)**
    * **Objective:** Create a simple GitService module that wraps the git-client NPM package. This service will expose two tRPC-callable methods: gitCommit(path: string, message: string) and gitLog(path: string).
4. **Setup Database Schemas (apps/api)**
    * **Objective:** Define the initial PostgreSQL schemas for the Role table and the ModelUsage table. The ModelUsage table is critical for tracking provider usage and rate-limiting data for the future Model Manager.


---


#### Task Set 2: Communication and Persistence (Full Stack)



1. **Implement WebSocket Broker (apps/api)**
    * **Objective:** Build the core WebSocket server logic (using ws or a similar library) and integrate it with an Express/tRPC route. The server must accept the vfsSessionToken for initial connection authorization.
2. **Build Frontend WebSocket Client (apps/ui/hooks)**
    * **Objective:** Create a useWebSocket React hook to manage the persistent connection. This hook will handle sending commands and processing the streaming text output (stdout/stderr) from the backend.
3. **Initial Monaco Component (apps/ui/components)**
    * **Objective:** Create a TerminalLogViewer.tsx component. This component should display a read-only Monaco Editor that is fed the real-time stream of text from the useWebSocket hook, simulating terminal output.
4. **VFS Text Presentation (apps/ui/utils)**
    * **Objective:** Create a VfsTextPresenter utility. This function will take the raw JSON file list from the /filesystem API and generate the simple, Monaco-readable text format (e.li., a directory tree).


