# AGENTS.md: AI Agent Instructions

This document provides instructions for AI agents working in this repository. Please adhere to these guidelines to ensure consistency, quality, and maintainability of the codebase.

## Project Philosophy

This project is a typesafe monorepo. All code you write or modify must adhere to this principle and the rules outlined below.

### System Philosophy: Exhaustive Fallbacks

The system must attempt to complete a task using all available free resources before giving up. This "try, fallback, exhaust" pattern is more resilient than a simple "try, retry, fail" pattern for a multi-provider system. When implementing logic that interacts with external providers, follow this pattern:

1.  **Select Best Option:** Choose the most appropriate free model from a healthy provider.
2.  **Attempt Execution:** Make the API call.
3.  **On Failure:** If the call fails (e.g., network error, provider error), mark that specific model as temporarily degraded.
4.  **Intra-Provider Fallback:** Attempt the same task with the next-best available model from the **same provider**, if one exists.
5.  **Inter-Provider Fallback:** If all models from the initial provider are exhausted or have failed, attempt the task with the next-best available model from a **different provider**.
6.  **Exhaustion:** Continue this fallback process (steps 4 and 5) until all viable free options across all providers have been attempted.
7.  **Final State:** Only after exhausting all possibilities should the task be marked as 'Failed'.

### Human-Specific Rules

- Do not read, write, or overwrite the `.env` file.
- Assume the human operator knows how to use an `.env` file or will learn.

---

### Modularity

- **One responsibility per file/class**: Each file or class should have a single, well-defined purpose.
- **Max 300 lines per file**: Keep files concise and focused.
- **No side effects on import**: Importing a module should not cause any side effects.
- **Clear exports**: Export only what is necessary for other modules to consume.

### Naming

- **Use descriptive names**: Variable and function names should clearly indicate their purpose. Prefer `getUserById()` over `get()`.
- **Use abbreviations only if standard**: For example, `API`, `HTTP`.

### Documentation

- **JSDoc on all public functions**: All public functions must have JSDoc comments with examples.
- **Inline comments only for non-obvious logic**: Use inline comments sparingly to explain complex or non-obvious code.
- **README per module**: Each module should have a `README.md` file that explains its purpose and usage.

## TypeScript

### Strictness

The `tsconfig.json` is configured with `"strict": true`. You must write code that is compatible with these settings.

- **`noImplicitAny`**: Do not use `any`. Use `unknown` if the type is truly unknown.
- **`strictNullChecks`**: Be explicit when handling `null` and `undefined`.

### Types

- **Define interfaces for all data structures**: This ensures that data is consistently structured throughout the application.
- **Export types for reuse**: This promotes consistency and reduces code duplication.

### Error Handling

- **Use custom errors**: Create custom error classes that extend `Error` to provide more specific error information.
- **Use typed catch blocks**: When catching errors, check the type of the error to ensure it is handled correctly.

### Async Patterns

- **Use timeouts**: When making asynchronous calls, use timeouts to prevent the application from hanging.
- **Handle promises correctly**: Always handle promise rejections.

### Logging

- **Use structured logging**: Log messages should be structured as JSON objects with clear key-value pairs.
- **Use appropriate log levels**: Use `DEBUG` for detailed trace information, `INFO` for normal operations, `WARN` for degraded but functional, and `ERROR` for failed operations.

### Testing

- **Follow the provided structure**: Use `describe`, `it`, and `expect` from `vitest`.
- **Avoid magic numbers**: Use constants instead of hardcoded values in tests.

### Security

- **Do not log secrets**: Never log sensitive information such as API keys.
- **Validate input**: Always validate input from external sources.
- **Apply rate limiting**: Use rate limiting to prevent abuse of external APIs.

### Golden Rule

If another agent (or human) can't understand your code in 5 minutes, simplify it.

### MCP Server Config

The config file for all MCP servers should be in the config file for AI agents.
