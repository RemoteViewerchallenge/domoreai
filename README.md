# Domoreai - LLM Provider Management System

Domoreai is a flexible, extensible system for managing and interacting with various Large Language Model (LLM) providers. It provides a unified API and a simple web interface to configure providers and query their models.

## Key Features

- **Multi-Provider Support**: Easily configure and switch between different LLM providers like OpenAI, Mistral, Google AI Studio, and any OpenAI-compatible service (e.g., OpenRouter, Together AI).
- **Secure Credential Storage**: API keys are encrypted at rest using AES-256-CBC to ensure your credentials are safe.
- **Dynamic Model Discovery**: The system automatically fetches and stores available models for each configured provider.
- **Structured & Relational Database**: Model information is stored in a structured, relational format, with dedicated tables for each provider type, allowing for robust querying and data analysis.
- **Extensible Adapter Architecture**: Adding a new LLM provider is as simple as creating a new adapter class and registering it.
- **Virtual File System (VFS)**: A sandboxed file system for agents, with a session-based token system for secure access.
- **Real-time Updates**: WebSocket integration for real-time communication between the frontend and backend.
- **Rate Limiting**: A UI for managing rate limits for each provider's models.

## Architecture

The project is a monorepo managed with `pnpm` and consists of two main applications:

- **`apps/api`**: A Node.js/Express server that handles all backend logic, including:
  - Provider configuration and CRUD operations.
  - Secure encryption and decryption of API keys.
  - Communication with LLM provider APIs via adapters.
  - Database initialization and management.
  - WebSocket server for real-time communication.
  - VFS session management.

- **`apps/ui`**: A React-based web interface for:
  - Adding, viewing, and deleting provider configurations.
  - Triggering model list updates for each provider.
  - Displaying provider health and model counts.
  - Managing rate limits for each model.
  - Interacting with the VFS.

### Database Design

The system uses PostgreSQL for data persistence. The schema is designed to be both structured and flexible:

1.  **`providers` Table**: Stores the core configuration for each provider instance, including its name, type, and encrypted credentials.
2.  **Provider-Specific Model Tables**: For each provider *type* (e.g., `openai`, `google`, `mistral`), a dedicated table is created (e.g., `openai_models`, `google_models`). These tables have columns that match the specific data structure returned by that provider's model API, ensuring data is stored in a structured, queryable format.

This relational approach avoids unstructured JSON blobs and makes the model data a first-class citizen in the database.

## Getting Started

### Prerequisites

- Node.js
- pnpm
- PostgreSQL
- A running PostgreSQL database instance.

### Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/RemoteViewerchallenge/domoreai.git
    cd domoreai
    ```

2.  **Install dependencies:**
    ```bash
    pnpm install
    ```

3.  **Set up environment variables:**
    Create a `.env` file in the root of the project and add the following variables:
    ```
    # A 64-character hex string for a 32-byte key.
    # Generate one with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
    ENCRYPTION_KEY=your_strong_64_character_encryption_key

    # Your PostgreSQL connection string
    PG_CONNECTION=postgresql://user:password@host:port/database
    ```

4.  **Build the project:**
    ```bash
    pnpm run build
    ```

5.  **Run the development server:**
    This will start both the API and UI.
    ```bash
    pnpm run dev
    ```
    - The API will be available at `http://localhost:4000`.
    - The UI will be available at `http://localhost:5173`.

## How to Add a New Provider

To extend the system with a new LLM provider, follow these steps:

1.  **Create an Adapter**: In `apps/api/src/llm-adapters.ts`, create a new class that implements the `LLMAdapter` interface. You must define `configSchema`, `getModels`, and `generateCompletion`.
2.  **Register the Adapter**: In `apps/api/src/index.ts`, import your new adapter and add an instance of it to the `adapters` object.
3.  **Define the Model Table**: In `apps/api/src/db/index.ts`, add a `CREATE TABLE IF NOT EXISTS` statement for your new provider's models inside the `initializeDatabase` function. The columns should match the data you want to store from the `getModels` API response.
4.  **Add a Save Handler**: In `saveModelsForProvider` within the same file, add a `case` to the `switch` statement for your new `providerType`. This logic will handle deleting old models and inserting the new ones into your structured table.
5.  **Update the Fetch Query**: In `getAllProviders`, update the `CASE` statement in the main query to `json_agg` the models from your new table when the provider type matches.

After these changes, rebuild the API (`pnpm run build`) and restart the server. Your new provider type will be available in the UI.
