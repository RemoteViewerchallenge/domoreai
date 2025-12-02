# Project Management UI: User Guide

This guide provides an overview of the new Project Management interface, designed to help you create, manage, and visualize complex workflows for both human and AI agents.

## 1. Projects Dashboard

The **Projects Dashboard** is the main entry point to the system, accessible from the root URL (`/`). It provides a high-level overview of all existing projects.

-   **Viewing Projects**: Each project is displayed as a card showing its name, description, current status, and the number of jobs it contains.
-   **Navigating**: Click on any project card to navigate to its **Detailed Project Breakdown View**.
-   **Creating a New Project**: Click the **"+ New Project"** button in the top-right corner to go to the **Project Creator**.

## 2. Project Creator

The **Project Creator** page (`/project-creator`) allows you to define a new project and its workflow.

### 2.1. Project Details

-   **Project Name**: A descriptive name for the overall goal (e.g., "Implement User Authentication"). This is a required field.
-   **Description**: A more detailed explanation of the project's objectives.

### 2.2. Jobs & Workflow

This section allows you to define the individual steps (Jobs) of your project.

-   **Adding a Job**: Click the **"+ Add Job"** button to add a new step to the workflow.
-   **Job Details**:
    -   **Job Name**: A clear and concise title for the step (e.g., "Design API Endpoints").
    -   **Description**: A brief explanation of what the job entails.
    -   **Assign a Role**: Use the dropdown to assign a pre-configured `Role` (e.g., "Coder", "Architect", "Reviewer") to the job. The assigned role will be responsible for executing the job's tasks.

### 2.3. Defining Workflow (Sequential vs. Parallel)

The user interface for defining complex dependencies (sequential vs. parallel) is currently in development. At present, all jobs are treated as a single sequence. Future updates will allow for grouping jobs to be executed in parallel.

-   **Saving**: Once you have defined the project details and its jobs, click the **"Save Project"** button.

## 3. Detailed Project Breakdown View

This view (`/project/:id`) provides a detailed visualization of a single project's workflow.

-   **Layout**: The workflow is displayed top-to-bottom.
    -   **Sequential Jobs**: A job that must be completed before the next one begins will appear in its own row.
    -   **Parallel Jobs**: Jobs that can be worked on simultaneously will be displayed side-by-side in the same row.
-   **Job Cards**: Each card in the workflow represents a job and displays:
    -   The job's name and description.
    -   The `Role` assigned to the job.
    -   The current status of the job (e.g., "Not Started", "In Progress").
-   **Navigation**: To return to the main dashboard, click the back arrow in the header.
