import { prisma } from '../db.js';

/**
 * Seed Orchestration Templates
 * 
 * This script creates the three core orchestration patterns:
 * 1. Router-Solver: Simple two-step pattern for task routing and execution
 * 2. Crew: Parallel execution pattern for collaborative work
 * 3. Hierarchy: Corporate structure with Executive → Manager → Worker tiers
 */

async function seedOrchestrations() {
  console.log('[Seed] Starting orchestration template seeding...');

  // 1. Router-Solver Pattern
  console.log('[Seed] Creating Router-Solver orchestration...');
  const routerSolver = await prisma.orchestration.upsert({
    where: { name: 'Router-Solver' },
    update: {},
    create: {
      name: 'Router-Solver',
      description: 'Simple two-step pattern: Route the task, then solve it',
      tags: ['template', 'basic', 'sequential'],
      isActive: true,
      steps: {
        create: [
          {
            name: 'Route Task',
            description: 'Analyze the task and determine the best approach',
            order: 0,
            stepType: 'sequential',
            tier: 'Manager', // Use mid-tier model for routing
            minConfidence: 0.85,
            inputMapping: {
              userQuery: '{{context.input}}'
            },
            outputMapping: {
              strategy: '{{output.strategy}}',
              specialization: '{{output.specialization}}'
            },
            maxRetries: 2,
            timeout: 60000 // 1 minute
          },
          {
            name: 'Execute Task',
            description: 'Execute the task using the determined strategy',
            order: 1,
            stepType: 'sequential',
            tier: 'Worker', // Use cheap model for execution
            minConfidence: 0.8,
            inputMapping: {
              task: '{{context.input}}',
              strategy: '{{context.strategy}}',
              specialization: '{{context.specialization}}'
            },
            outputMapping: {
              result: '{{output}}'
            },
            maxRetries: 3,
            timeout: 300000 // 5 minutes
          }
        ]
      }
    }
  });
  console.log(`[Seed] ✓ Router-Solver created: ${routerSolver.id}`);

  // 2. Crew Pattern (Parallel Execution)
  console.log('[Seed] Creating Crew orchestration...');
  const crew = await prisma.orchestration.upsert({
    where: { name: 'Crew' },
    update: {},
    create: {
      name: 'Crew',
      description: 'Parallel execution pattern for collaborative work',
      tags: ['template', 'parallel', 'collaborative'],
      isActive: true,
      steps: {
        create: [
          {
            name: 'Plan Work',
            description: 'Break down the work into parallel tasks',
            order: 0,
            stepType: 'sequential',
            tier: 'Manager',
            minConfidence: 0.9,
            inputMapping: {
              project: '{{context.input}}'
            },
            outputMapping: {
              tasks: '{{output.tasks}}'
            },
            maxRetries: 2,
            timeout: 120000 // 2 minutes
          },
          {
            name: 'Execute Task 1',
            description: 'Execute first parallel task',
            order: 1,
            stepType: 'parallel',
            parallelGroup: 'execution',
            tier: 'Worker',
            minConfidence: 0.75,
            inputMapping: {
              task: '{{context.tasks[0]}}'
            },
            outputMapping: {
              result1: '{{output}}'
            },
            maxRetries: 2,
            timeout: 180000 // 3 minutes
          },
          {
            name: 'Execute Task 2',
            description: 'Execute second parallel task',
            order: 2,
            stepType: 'parallel',
            parallelGroup: 'execution',
            tier: 'Worker',
            minConfidence: 0.75,
            inputMapping: {
              task: '{{context.tasks[1]}}'
            },
            outputMapping: {
              result2: '{{output}}'
            },
            maxRetries: 2,
            timeout: 180000 // 3 minutes
          },
          {
            name: 'Merge Results',
            description: 'Combine parallel execution results',
            order: 3,
            stepType: 'sequential',
            tier: 'Manager',
            minConfidence: 0.85,
            inputMapping: {
              result1: '{{context.result1}}',
              result2: '{{context.result2}}'
            },
            outputMapping: {
              finalResult: '{{output}}'
            },
            maxRetries: 1,
            timeout: 60000 // 1 minute
          }
        ]
      }
    }
  });
  console.log(`[Seed] ✓ Crew created: ${crew.id}`);

  // 3. Hierarchy Pattern (Corporate Structure)
  console.log('[Seed] Creating Hierarchy orchestration...');
  const hierarchy = await prisma.orchestration.upsert({
    where: { name: 'Hierarchy' },
    update: {},
    create: {
      name: 'Hierarchy',
      description: 'Corporate structure: Executive plans, Manager coordinates, Workers execute',
      tags: ['template', 'hierarchy', 'corporate'],
      isActive: true,
      steps: {
        create: [
          {
            name: 'Executive Planning',
            description: 'High-level strategic planning (expensive model)',
            order: 0,
            stepType: 'sequential',
            tier: 'Executive', // Use most expensive, powerful model
            minConfidence: 0.95, // Require very high confidence
            inputMapping: {
              objective: '{{context.input}}'
            },
            outputMapping: {
              strategy: '{{output.strategy}}',
              milestones: '{{output.milestones}}'
            },
            maxRetries: 1,
            timeout: 180000 // 3 minutes
          },
          {
            name: 'Manager Coordination',
            description: 'Break down strategy into actionable tasks (mid-tier model)',
            order: 1,
            stepType: 'sequential',
            tier: 'Manager',
            minConfidence: 0.9,
            inputMapping: {
              strategy: '{{context.strategy}}',
              milestones: '{{context.milestones}}'
            },
            outputMapping: {
              tasks: '{{output.tasks}}',
              assignments: '{{output.assignments}}'
            },
            maxRetries: 2,
            timeout: 120000 // 2 minutes
          },
          {
            name: 'Worker Execution',
            description: 'Execute assigned tasks (cheap, fast model)',
            order: 2,
            stepType: 'sequential',
            tier: 'Worker',
            minConfidence: 0.8,
            inputMapping: {
              tasks: '{{context.tasks}}',
              assignments: '{{context.assignments}}'
            },
            outputMapping: {
              results: '{{output}}'
            },
            maxRetries: 3,
            timeout: 300000 // 5 minutes
          },
          {
            name: 'Manager Review',
            description: 'Review and validate worker outputs',
            order: 3,
            stepType: 'sequential',
            tier: 'Manager',
            minConfidence: 0.9,
            inputMapping: {
              results: '{{context.results}}',
              originalStrategy: '{{context.strategy}}'
            },
            outputMapping: {
              finalOutput: '{{output}}'
            },
            maxRetries: 1,
            timeout: 90000 // 1.5 minutes
          }
        ]
      }
    }
  });
  console.log(`[Seed] ✓ Hierarchy created: ${hierarchy.id}`);

  // 4. Recursive Example (Russian Doll)
  console.log('[Seed] Creating Recursive orchestration example...');
  
  // First, create a simple sub-orchestration
  const subTask = await prisma.orchestration.upsert({
    where: { name: 'Simple-Task' },
    update: {},
    create: {
      name: 'Simple-Task',
      description: 'A simple task that can be used as a sub-orchestration',
      tags: ['template', 'sub-orchestration'],
      isActive: true,
      steps: {
        create: [
          {
            name: 'Execute',
            description: 'Execute the simple task',
            order: 0,
            stepType: 'sequential',
            tier: 'Worker',
            minConfidence: 0.75,
            inputMapping: {
              task: '{{context.input}}'
            },
            outputMapping: {
              result: '{{output}}'
            },
            maxRetries: 2,
            timeout: 120000
          }
        ]
      }
    }
  });

  // Now create the parent orchestration that uses it
  const recursive = await prisma.orchestration.upsert({
    where: { name: 'Recursive-Workflow' },
    update: {},
    create: {
      name: 'Recursive-Workflow',
      description: 'Demonstrates Russian Doll nesting with sub-orchestrations',
      tags: ['template', 'recursive', 'advanced'],
      isActive: true,
      steps: {
        create: [
          {
            name: 'Plan Department Work',
            description: 'Executive plans the department work',
            order: 0,
            stepType: 'sequential',
            tier: 'Executive',
            minConfidence: 0.95,
            inputMapping: {
              objective: '{{context.input}}'
            },
            outputMapping: {
              departments: '{{output.departments}}'
            },
            maxRetries: 1,
            timeout: 180000
          },
          {
            name: 'Execute Department 1',
            description: 'Hire an entire department (sub-orchestration)',
            order: 1,
            stepType: 'sub_orchestration',
            subOrchestrationId: subTask.id, // Reference the sub-orchestration
            inputMapping: {
              input: '{{context.departments[0]}}'
            },
            outputMapping: {
              dept1Result: '{{output}}'
            },
            maxRetries: 1,
            timeout: 600000 // 10 minutes for sub-orchestration
          },
          {
            name: 'Merge Department Results',
            description: 'Combine results from all departments',
            order: 2,
            stepType: 'sequential',
            tier: 'Manager',
            minConfidence: 0.9,
            inputMapping: {
              dept1: '{{context.dept1Result}}'
            },
            outputMapping: {
              finalResult: '{{output}}'
            },
            maxRetries: 1,
            timeout: 90000
          }
        ]
      }
    }
  });
  console.log(`[Seed] ✓ Recursive-Workflow created: ${recursive.id}`);

  console.log('[Seed] ✓ All orchestration templates seeded successfully!');
  console.log(`
  Created templates:
  - Router-Solver: ${routerSolver.id}
  - Crew: ${crew.id}
  - Hierarchy: ${hierarchy.id}
  - Recursive-Workflow: ${recursive.id}
  `);
}

// Run the seed
seedOrchestrations()
  .catch((error) => {
    console.error('[Seed] Error seeding orchestrations:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
