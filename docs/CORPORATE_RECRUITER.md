# Corporate Recruiter - Automatic Role Staffing

## Overview

The **Corporate Recruiter** is an intelligent system that automatically "staffs" your organization by scanning your project's codebase and creating specialized AI roles based on the detected technology stack.

Instead of generic roles, you get context-aware specialists like:
- **Frontend Lead** who knows you use React, TailwindCSS, and FlyonUI
- **Backend Architect** who understands your Express, Prisma, and PostgreSQL setup

## How It Works

### 1. Dependency Scanning
The Corporate Recruiter recursively scans your project directory for `package.json` files, skipping `node_modules` and hidden directories.

### 2. Department Identification
Based on the dependencies found, it identifies departments:

**Frontend Department** - Detected when finding:
- React, Vue, Angular, Svelte, or Solid.js
- TailwindCSS, FlyonUI, or DaisyUI

**Backend Department** - Detected when finding:
- Express, NestJS, Fastify, Koa, or Hapi
- Prisma ORM
- PostgreSQL, MongoDB, Redis, or SQLite

### 3. Automatic Staffing
For each identified department, the system:
1. Creates or updates a specialized role
2. Generates a tech-stack-specific system prompt
3. Assigns appropriate tools (filesystem, terminal, browser)
4. Stores detected dependencies in role metadata

## Usage

### Via tRPC API

```typescript
import { trpc } from './trpc';

const result = await trpc.role.onboardProject.mutate({
  rootPath: '/path/to/your/project'
});

console.log(result);
// {
//   message: "Project onboarding complete",
//   scanned: 5,
//   departments: 2,
//   rolesCreated: 2,
//   rolesUpdated: 0,
//   errors: []
// }
```

### Via Direct Service Call

```typescript
import { PrismaClient } from '@prisma/client';
import { onboardProject } from './services/RoleIngestionService';

const prisma = new PrismaClient();

const stats = await onboardProject('/path/to/project', prisma);
```

### Via Test Script

```bash
cd apps/api
npx tsx test-corporate-recruiter.ts
```

## Generated Role Structure

### Frontend Lead Example

```typescript
{
  name: "Frontend Lead",
  category: "Frontend Department",
  description: "Frontend development specialist with expertise in React, TailwindCSS, FlyonUI",
  tools: ["filesystem", "terminal", "browser"],
  basePrompt: `## ROLE: Frontend Lead

**DEPARTMENT:** Frontend Department
**DESCRIPTION:** Frontend development specialist with expertise in React, TailwindCSS, FlyonUI

**DETECTED TECH STACK:**
- react
- tailwindcss
- flyonui
- @tanstack/react-query
- react-router-dom
...

**CORE RESPONSIBILITIES:**
- Architect and implement features using the detected technology stack
- Ensure code quality, maintainability, and best practices
- Collaborate with other departments to deliver cohesive solutions
- Leverage the specific frameworks and libraries in this project

**TECHNICAL EXPERTISE:**
You are an expert in the technologies listed above. When working on this project:
1. Use the exact dependencies and versions installed in this codebase
2. Follow the architectural patterns already established in the project
3. Ensure compatibility with the existing tech stack
4. Provide solutions that integrate seamlessly with current implementations

**INSTRUCTIONS:**
- Always check the actual package.json and codebase before making assumptions
- Prioritize solutions that use the installed dependencies
- Maintain consistency with existing code style and patterns
- Consider the full stack context when making architectural decisions`,
  metadata: {
    needsReasoning: true,
    needsCoding: true,
    minContext: 8192,
    maxContext: 128000,
    detectedDependencies: ["react", "tailwindcss", "flyonui", ...]
  }
}
```

## Implementation Details

### File: `apps/api/src/services/RoleIngestionService.ts`

**Key Functions:**

1. **`findPackageJsonFiles(rootPath: string)`**
   - Recursively scans directory tree
   - Skips `node_modules` and hidden directories
   - Returns array of package.json file paths

2. **`identifyDepartment(dependencies: Record<string, string>)`**
   - Analyzes dependency list
   - Returns `DepartmentInfo` or `null`
   - Detects Frontend and Backend departments

3. **`generateDepartmentPrompt(dept: DepartmentInfo)`**
   - Creates tech-stack-specific system prompt
   - Lists detected dependencies (up to 15)
   - Includes role responsibilities and expertise

4. **`onboardProject(rootPath: string, prisma: PrismaClient)`**
   - Main orchestration function
   - Scans, identifies, and creates roles
   - Returns statistics object

### File: `apps/api/src/routers/role.router.ts`

**Endpoint:**

```typescript
onboardProject: publicProcedure
  .input(z.object({ rootPath: z.string() }))
  .mutation(async ({ input }) => {
    const stats = await onboardProject(input.rootPath, prisma);
    return {
      message: "Project onboarding complete",
      ...stats,
    };
  })
```

## Benefits

1. **Context-Aware Roles**: Roles understand your exact tech stack
2. **No Manual Configuration**: Automatic detection and setup
3. **Always Up-to-Date**: Re-run to update roles when dependencies change
4. **Prevents Hallucinations**: Roles know what's actually installed
5. **Faster Onboarding**: New team members (AI or human) get instant context

## Future Enhancements

- [ ] Support for more frameworks (Python, Java, Go, etc.)
- [ ] Detect testing frameworks and create QA roles
- [ ] Identify DevOps tools and create Infrastructure roles
- [ ] Parse README.md for additional context
- [ ] Detect monorepo structure and create Coordinator roles
- [ ] Integration with package manager lock files for version-specific prompts

## Constraints

- **No Mocks**: Uses actual `fs` calls to read files
- **Database Writes**: Creates real Prisma records
- **Idempotent**: Safe to run multiple times (updates existing roles)
- **Error Handling**: Continues on individual file errors, reports at end

## Example Output

```
🏢 [Corporate Recruiter] Starting project onboarding...
📂 Root Path: /home/user/mono

📦 Found 5 package.json files
  ✓ Identified Frontend Department in apps/ui/package.json
  ✓ Identified Backend Department in apps/api/package.json

🏗️  Identified 2 unique departments

  ✨ Created role: Frontend Lead
  ✨ Created role: Backend Architect

✅ [Corporate Recruiter] Onboarding complete!
   📊 Stats:
      - Package.json files scanned: 5
      - Departments identified: 2
      - Roles created: 2
      - Roles updated: 0
```

## Related Files

- `apps/api/src/services/RoleIngestionService.ts` - Core implementation
- `apps/api/src/routers/role.router.ts` - tRPC endpoint
- `apps/api/test-corporate-recruiter.ts` - Test script
- `apps/api/prisma/schema.prisma` - Role and RoleCategory models
