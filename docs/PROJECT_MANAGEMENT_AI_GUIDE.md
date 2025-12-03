# Project Management MCP Server: AI Agent Guide

This document provides the necessary information for an AI agent with the `meta` tool to programmatically create, manage, and delegate projects using the new Project Management MCP (Model-Controlled Process) Server.

## 1. Base Prompt for an AI Project Manager

When creating a `Role` for an AI Project Manager, use a base prompt similar to the following to give it the appropriate context and capabilities.

```
You are an advanced AI Project Manager. Your primary responsibility is to take high-level goals from a user and break them down into a structured, executable project plan.

You will use the `system.project.*` tools to create and define projects, jobs, and their dependencies.

Key Responsibilities:
1.  **Decomposition**: Break down complex requests into a logical sequence of jobs.
2.  **Role Assignment**: Assign the most appropriate, pre-existing `Role` to each job (e.g., "Architect", "Coder", "QA_Tester").
3.  **Dependency Management**: Clearly define the workflow by specifying which jobs can be done in parallel and which must be done sequentially.
4.  **Clarity**: Provide clear and concise names and descriptions for all projects and jobs.

You will write TypeScript code to interact with the project management system. Always ensure your code is well-structured and handles potential errors.
```

## 2. Available `system.project.*` Tools

The following tools are available on the `system.project` object for agents with `meta` tool access.

---

### `system.project.create`

Creates a new project with a set of jobs.

**Signature:**
```typescript
system.project.create(input: {
  name: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  jobs: {
    name: string;
    description?: string;
    priority?: 'low' | 'medium' | 'high' | 'critical';
    roleId?: string; // The ID of the Role to assign
    dependsOn?: number; // The array index of the job this one depends on
    parallelGroup?: string; // A shared identifier for jobs that run in parallel
  }[];
}): Promise<Project>;
```

**Example: Creating a Sequential Project**

This example creates a simple three-step project where each job depends on the one before it.

```typescript
// Goal: Create a new feature and deploy it.
const newFeatureProject = await system.project.create({
  name: 'Implement User Profile Feature',
  description: 'Add a new page where users can view and edit their profiles.',
  priority: 'high',
  jobs: [
    {
      // Job 0
      name: 'Design Database Schema',
      description: 'Define the new tables and columns for user profile data.',
      roleId: 'role_architect_123', // Replace with actual Role ID
    },
    {
      // Job 1
      name: 'Implement Backend API',
      description: 'Create the tRPC endpoints for fetching and updating profile data.',
      roleId: 'role_coder_456',
      dependsOn: 0, // Depends on 'Design Database Schema'
    },
    {
      // Job 2
      name: 'Build Frontend UI',
      description: 'Create the React components for the user profile page.',
      roleId: 'role_frontend_dev_789',
      dependsOn: 1, // Depends on 'Implement Backend API'
    }
  ]
});

console.log('Project created:', newFeatureProject.id);
```

**Example: Creating a Project with Parallel Jobs**

This example shows a research project where multiple research tasks can happen at the same time.

```typescript
// Goal: Research a topic by checking multiple sources, then synthesize.
const researchProject = await system.project.create({
  name: 'Research: The Impact of AI on Software Development',
  description: 'Gather information from multiple sources and create a summary report.',
  jobs: [
    {
      // Job 0: The initial step
      name: 'Define Research Questions',
      description: 'Formulate the key questions to be answered by the research.',
      roleId: 'role_research_lead_111',
    },
    {
      // Job 1: Parallel task
      name: 'Search Academic Papers',
      description: 'Find and summarize relevant papers from academic journals.',
      roleId: 'role_researcher_222',
      dependsOn: 0, // Depends on the definition of questions
      parallelGroup: 'research-phase',
    },
    {
      // Job 2: Parallel task
      name: 'Analyze Industry Blogs',
      description: 'Review articles and posts from top engineering blogs.',
      roleId: 'role_researcher_222',
      dependsOn: 0,
      parallelGroup: 'research-phase',
    },
    {
      // Job 3: Parallel task
      name: 'Review Open Source Projects',
      description: 'Examine how AI is being used in popular open source codebases.',
      roleId: 'role_code_analyst_333',
      dependsOn: 0,
      parallelGroup: 'research-phase',
    },
    {
      // Job 4: The final "reduce" step
      name: 'Synthesize Findings',
      description: 'Combine all research into a single, comprehensive report.',
      roleId: 'role_writer_444',
      // This job will depend on the completion of all jobs in the 'research-phase'.
      // The system will automatically handle this dependency.
      dependsOn: 0,
    }
  ]
});

console.log('Research project created:', researchProject.id);
```

---

### `system.project.list`

Retrieves a list of all projects.

**Signature:**
```typescript
system.project.list(): Promise<Project[]>;
```

**Example:**
```typescript
const allProjects = await system.project.list();
allProjects.forEach(p => console.log(`- ${p.name} (Status: ${p.status})`));
```

---

### `system.project.getById`

Retrieves a single project with its full hierarchy of jobs, tasks, and errands.

**Signature:**
```typescript
system.project.getById(input: { id: string }): Promise<Project | null>;
```

**Example:**
```typescript
const projectId = 'proj_abc123';
const projectDetails = await system.project.getById({ id: projectId });
if (projectDetails) {
  console.log('Project:', projectDetails.name);
  projectDetails.jobs.forEach(job => {
    console.log(`  - Job: ${job.name}, Assigned to: ${job.role?.name}`);
  });
}
```
