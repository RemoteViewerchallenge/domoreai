#!/usr/bin/env tsx

/**
 * Test script for the orchestration system
 * This validates that all components are properly connected
 */

import { db } from './src/db.js';
import { OrchestrationService } from './src/services/orchestration.service.js';

async function testOrchestrationSystem() {
  console.log('🧪 Testing Orchestration System...\n');

  try {
    // Test 1: Create a test role
    console.log('1️⃣ Creating test roles...');
    const plannerRole = await db.role.create({
      data: {
        name: 'Test Planner',
        basePrompt: 'You plan tasks step by step.',
        needsReasoning: true,
        defaultTemperature: 0.7,
        defaultMaxTokens: 2048,
      },
    });

    const coderRole = await db.role.create({
      data: {
        name: 'Test Coder',
        basePrompt: 'You generate code based on plans.',
        needsCoding: true,
        defaultTemperature: 0.5,
        defaultMaxTokens: 4096,
      },
    });

    console.log(`✅ Created roles: ${plannerRole.name}, ${coderRole.name}\n`);

    // Test 2: Create an orchestration
    console.log('2️⃣ Creating test orchestration...');
    const orchestration = await OrchestrationService.createOrchestration({
      name: 'Test Workflow',
      description: 'A simple test workflow',
      tags: ['test'],
      steps: [
        {
          name: 'Planning Step',
          order: 0,
          roleId: plannerRole.id,
          inputMapping: { task: '{{context.input.userRequest}}' },
          outputMapping: { plan: '{{output}}' },
        },
        {
          name: 'Coding Step',
          order: 1,
          roleId: coderRole.id,
          inputMapping: { requirements: '{{context.plan}}' },
          outputMapping: { code: '{{output}}' },
        },
      ],
    });

    console.log(`✅ Created orchestration: ${orchestration.name} (${orchestration.id})\n`);

    // Test 3: List orchestrations
    console.log('3️⃣ Listing orchestrations...');
    const allOrchestrations = await OrchestrationService.listOrchestrations();
    console.log(`✅ Found ${allOrchestrations.length} orchestration(s)\n`);

    // Test 4: Get orchestration details
    console.log('4️⃣ Getting orchestration details...');
    const details = await OrchestrationService.getOrchestration(orchestration.id);
    console.log(`✅ Retrieved orchestration with ${details?.steps.length} steps\n`);

    // Test 5: Update orchestration
    console.log('5️⃣ Updating orchestration...');
    await OrchestrationService.updateOrchestration(orchestration.id, {
      tags: ['test', 'verified'],
      isActive: true,
    });
    console.log(`✅ Updated orchestration\n`);

    // Cleanup
    console.log('🧹 Cleaning up test data...');
    await OrchestrationService.deleteOrchestration(orchestration.id);
    await db.role.delete({ where: { id: plannerRole.id } });
    await db.role.delete({ where: { id: coderRole.id } });
    console.log(`✅ Cleanup complete\n`);

    console.log('✨ All tests passed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testOrchestrationSystem();
