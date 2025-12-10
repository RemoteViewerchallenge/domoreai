/**
 * Coorp Seed Script
 * 
 * Seeds the database with initial sample Coorp nodes and edges.
 * Only creates nodes if none exist in the database.
 * 
 * Coorp (Collaborative Orchestration & Organizational Representation)
 * represents organizational structures and workflows as a graph.
 * 
 * Usage:
 *   tsx src/scripts/seed-coorp.ts
 */

import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const envPath = path.resolve(__dirname, '../../../.env.local');
dotenv.config({ path: envPath });

const prisma = new PrismaClient();

interface SampleNode {
  id: string;
  name: string;
  type: string;
  description?: string;
  properties?: any;
  parentId?: string;
}

interface SampleEdge {
  sourceId: string;
  targetId: string;
  type: string;
  label?: string;
  properties?: any;
  isDirected?: boolean;
}

async function seedCoorpNodes(): Promise<void> {
  console.log('🌱 Seeding Coorp nodes and edges...\n');

  // Check if any Coorp nodes already exist
  const existingCount = await prisma.coorpNode.count();
  
  if (existingCount > 0) {
    console.log(`✅ Found ${existingCount} existing Coorp nodes. Skipping seed.`);
    return;
  }

  // Define sample organizational structure
  const sampleNodes: SampleNode[] = [
    // Top-level organization
    {
      id: 'org-root',
      name: 'C.O.R.E. System',
      type: 'organization',
      description: 'Root organization node for the C.O.R.E. system',
      properties: {
        mission: 'Orchestrate free-tier AI intelligence for maximum productivity',
        established: '2024',
      },
    },

    // Teams
    {
      id: 'team-brain',
      name: 'Brain Team',
      type: 'team',
      description: 'The orchestration and planning team (apps/api)',
      parentId: 'org-root',
      properties: {
        responsibilities: ['State management', 'Role routing', 'Decision making'],
        location: 'apps/api',
      },
    },
    {
      id: 'team-hands',
      name: 'Hands Team',
      type: 'team',
      description: 'The execution team (Lootbox)',
      parentId: 'org-root',
      properties: {
        responsibilities: ['Tool execution', 'Action performance'],
        location: 'lootbox',
      },
    },
    {
      id: 'team-eyes',
      name: 'Eyes Team',
      type: 'team',
      description: 'The visualization team (apps/ui)',
      parentId: 'org-root',
      properties: {
        responsibilities: ['State visualization', 'Code structure display', 'LSP integration'],
        location: 'apps/ui',
      },
    },

    // Example roles/agents
    {
      id: 'agent-planner',
      name: 'Strategic Planner',
      type: 'agent',
      description: 'Plans and coordinates complex tasks',
      parentId: 'team-brain',
      properties: {
        skills: ['planning', 'coordination', 'strategy'],
        capacity: 5,
      },
    },
    {
      id: 'agent-executor',
      name: 'Task Executor',
      type: 'agent',
      description: 'Executes individual tasks and commands',
      parentId: 'team-hands',
      properties: {
        skills: ['execution', 'tool-use', 'scripting'],
        capacity: 10,
      },
    },
    {
      id: 'agent-monitor',
      name: 'System Monitor',
      type: 'agent',
      description: 'Monitors system state and provides feedback',
      parentId: 'team-eyes',
      properties: {
        skills: ['monitoring', 'visualization', 'reporting'],
        capacity: 3,
      },
    },

    // Example resources
    {
      id: 'resource-db',
      name: 'Database',
      type: 'resource',
      description: 'PostgreSQL database resource',
      properties: {
        resourceType: 'database',
        provider: 'postgresql',
        capacity: 'high',
      },
    },
    {
      id: 'resource-models',
      name: 'AI Models',
      type: 'resource',
      description: 'Free-tier AI model pool',
      properties: {
        resourceType: 'compute',
        providers: ['openrouter', 'gemini', 'mistral'],
        strategy: 'free-tier-first',
      },
    },

    // Example workflow stages
    {
      id: 'stage-intake',
      name: 'Task Intake',
      type: 'workflow_stage',
      description: 'Initial task reception and validation',
      properties: {
        order: 1,
        autoAdvance: true,
      },
    },
    {
      id: 'stage-planning',
      name: 'Planning',
      type: 'workflow_stage',
      description: 'Task decomposition and planning',
      properties: {
        order: 2,
        requiresApproval: false,
      },
    },
    {
      id: 'stage-execution',
      name: 'Execution',
      type: 'workflow_stage',
      description: 'Task execution and monitoring',
      properties: {
        order: 3,
        allowParallel: true,
      },
    },
    {
      id: 'stage-review',
      name: 'Review & Completion',
      type: 'workflow_stage',
      description: 'Final review and task completion',
      properties: {
        order: 4,
        requiresReview: true,
      },
    },
  ];

  // Define sample edges (relationships)
  const sampleEdges: SampleEdge[] = [
    // Team collaborations
    {
      sourceId: 'team-brain',
      targetId: 'team-hands',
      type: 'delegates_to',
      label: 'Brain delegates execution to Hands',
      properties: { strength: 'high' },
    },
    {
      sourceId: 'team-brain',
      targetId: 'team-eyes',
      type: 'informs',
      label: 'Brain informs Eyes of state changes',
      properties: { frequency: 'continuous' },
    },
    {
      sourceId: 'team-eyes',
      targetId: 'team-brain',
      type: 'provides_feedback_to',
      label: 'Eyes provides user feedback to Brain',
      properties: { frequency: 'on-demand' },
    },

    // Agent collaborations
    {
      sourceId: 'agent-planner',
      targetId: 'agent-executor',
      type: 'assigns_work_to',
      label: 'Planner assigns tasks to Executor',
      properties: { priority: 'high' },
    },
    {
      sourceId: 'agent-monitor',
      targetId: 'agent-planner',
      type: 'reports_to',
      label: 'Monitor reports system state to Planner',
      properties: { frequency: 'periodic' },
    },

    // Resource dependencies
    {
      sourceId: 'team-brain',
      targetId: 'resource-db',
      type: 'depends_on',
      label: 'Brain depends on Database',
      properties: { critical: true },
    },
    {
      sourceId: 'team-brain',
      targetId: 'resource-models',
      type: 'uses',
      label: 'Brain uses AI Models',
      properties: { usage: 'primary' },
    },

    // Workflow sequence
    {
      sourceId: 'stage-intake',
      targetId: 'stage-planning',
      type: 'flows_to',
      label: 'Intake flows to Planning',
      properties: { automatic: true },
    },
    {
      sourceId: 'stage-planning',
      targetId: 'stage-execution',
      type: 'flows_to',
      label: 'Planning flows to Execution',
      properties: { automatic: true },
    },
    {
      sourceId: 'stage-execution',
      targetId: 'stage-review',
      type: 'flows_to',
      label: 'Execution flows to Review',
      properties: { automatic: false },
    },

    // Workflow assignments
    {
      sourceId: 'stage-planning',
      targetId: 'agent-planner',
      type: 'assigned_to',
      label: 'Planning stage assigned to Planner agent',
    },
    {
      sourceId: 'stage-execution',
      targetId: 'agent-executor',
      type: 'assigned_to',
      label: 'Execution stage assigned to Executor agent',
    },
    {
      sourceId: 'stage-review',
      targetId: 'agent-monitor',
      type: 'assigned_to',
      label: 'Review stage assigned to Monitor agent',
    },
  ];

  // Insert nodes
  console.log(`Creating ${sampleNodes.length} sample nodes...`);
  for (const node of sampleNodes) {
    await prisma.coorpNode.create({
      data: node,
    });
    console.log(`  ✓ Created node: ${node.name} (${node.type})`);
  }

  // Insert edges
  console.log(`\nCreating ${sampleEdges.length} sample edges...`);
  for (const edge of sampleEdges) {
    await prisma.coorpEdge.create({
      data: edge,
    });
    const sourceNode = sampleNodes.find(n => n.id === edge.sourceId);
    const targetNode = sampleNodes.find(n => n.id === edge.targetId);
    console.log(`  ✓ Created edge: ${sourceNode?.name} -> ${targetNode?.name} (${edge.type})`);
  }

  console.log('\n✅ Coorp seed complete!');
  console.log(`   Nodes created: ${sampleNodes.length}`);
  console.log(`   Edges created: ${sampleEdges.length}`);
}

async function main() {
  try {
    await seedCoorpNodes();
  } catch (error) {
    console.error('❌ Error seeding Coorp data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
