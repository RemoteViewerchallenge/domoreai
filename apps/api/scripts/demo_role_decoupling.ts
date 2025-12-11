/**
 * Example: Dynamic Role Assignment in Orchestrations
 * 
 * This script demonstrates how orchestrations are now reusable templates
 * that can be executed with different role assignments.
 */

import { prisma } from '../src/db.js';
import { OrchestrationService } from '../src/services/orchestration.service.js';

async function main() {
  console.log('🎭 Orchestration & Role Decoupling Demo\n');
  console.log('═'.repeat(60));

  // Step 1: Create a reusable orchestration template
  console.log('\n📋 Step 1: Creating a reusable "Content Review" orchestration...\n');
  
  const orchestration = await OrchestrationService.createOrchestration({
    name: 'Content Review Workflow',
    description: 'A reusable template for reviewing any content',
    tags: ['content', 'review', 'quality'],
    steps: [
      {
        name: 'Analyze Content',
        description: 'Review the content for quality and accuracy',
        order: 0,
        stepType: 'sequential',
        inputMapping: { content: '{{context.input.content}}' },
        maxRetries: 1,
      },
      {
        name: 'Generate Feedback',
        description: 'Create constructive feedback based on analysis',
        order: 1,
        stepType: 'sequential',
        inputMapping: { analysis: '{{context["Analyze Content"]}}' },
        maxRetries: 1,
      },
    ],
  });

  console.log(`✅ Created orchestration: "${orchestration.name}" (ID: ${orchestration.id})`);
  console.log(`   Steps: ${(orchestration as any).steps?.map((s: any) => s.name).join(', ') || 'N/A'}`);

  // Step 2: Create example roles (if they don't exist)
  console.log('\n👥 Step 2: Ensuring example roles exist...\n');

  const seniorReviewerRole = await prisma.role.upsert({
    where: { name: 'senior_content_reviewer' },
    create: {
      name: 'senior_content_reviewer',
      basePrompt: 'You are a senior content reviewer with 10+ years of experience. You provide detailed, constructive feedback.',
      needsReasoning: true,
    },
    update: {},
  });

  const juniorReviewerRole = await prisma.role.upsert({
    where: { name: 'junior_content_reviewer' },
    create: {
      name: 'junior_content_reviewer',
      basePrompt: 'You are a junior content reviewer. You focus on basic grammar and structure.',
      needsReasoning: false,
    },
    update: {},
  });

  console.log(`✅ Senior Reviewer: ${seniorReviewerRole.name} (ID: ${seniorReviewerRole.id})`);
  console.log(`✅ Junior Reviewer: ${juniorReviewerRole.name} (ID: ${juniorReviewerRole.id})`);

  // Step 3: Execute the SAME orchestration with DIFFERENT role assignments
  console.log('\n🚀 Step 3: Executing the orchestration with different role assignments...\n');

  console.log('Scenario A: Senior reviewers for both steps');
  console.log('-'.repeat(60));
  const executionA = await OrchestrationService.executeOrchestration(
    orchestration.id,
    { content: 'This is a sample article about AI advancements.' },
    {
      'Analyze Content': seniorReviewerRole.id,
      'Generate Feedback': seniorReviewerRole.id,
    },
    'demo_user'
  );
  console.log(`✅ Execution A started: ${executionA.id}`);
  console.log(`   Status: ${executionA.status}`);

  console.log('\nScenario B: Junior reviewers for both steps');
  console.log('-'.repeat(60));
  const executionB = await OrchestrationService.executeOrchestration(
    orchestration.id,
    { content: 'This is a sample article about AI advancements.' },
    {
      'Analyze Content': juniorReviewerRole.id,
      'Generate Feedback': juniorReviewerRole.id,
    },
    'demo_user'
  );
  console.log(`✅ Execution B started: ${executionB.id}`);
  console.log(`   Status: ${executionB.status}`);

  console.log('\nScenario C: Mixed - Senior for analysis, Junior for feedback');
  console.log('-'.repeat(60));
  const executionC = await OrchestrationService.executeOrchestration(
    orchestration.id,
    { content: 'This is a sample article about AI advancements.' },
    {
      'Analyze Content': seniorReviewerRole.id,
      'Generate Feedback': juniorReviewerRole.id,
    },
    'demo_user'
  );
  console.log(`✅ Execution C started: ${executionC.id}`);
  console.log(`   Status: ${executionC.status}`);

  console.log('\nScenario D: No role assignments (using fallback)');
  console.log('-'.repeat(60));
  const executionD = await OrchestrationService.executeOrchestration(
    orchestration.id,
    { content: 'This is a sample article about AI advancements.' },
    undefined, // No role assignments!
    'demo_user'
  );
  console.log(`✅ Execution D started: ${executionD.id}`);
  console.log(`   Status: ${executionD.status}`);
  console.log(`   Note: Will use fallback role selection (general_worker or first available)`);

  // Summary
  console.log('\n' + '═'.repeat(60));
  console.log('🎉 Demo Complete!\n');
  console.log('Key Takeaway:');
  console.log('  • ONE orchestration template');
  console.log('  • FOUR different executions with different role configurations');
  console.log('  • No need to create multiple orchestrations!');
  console.log('\nThis demonstrates the power of decoupling roles from orchestrations.');
  console.log('Orchestrations are now reusable templates that accept dynamic role assignments.');
  console.log('═'.repeat(60));

  // Cleanup (optional)
  console.log('\n🧹 Cleanup: Deleting demo orchestration...');
  await OrchestrationService.deleteOrchestration(orchestration.id);
  console.log('✅ Cleanup complete');
}

main()
  .catch((error) => {
    console.error('❌ Demo failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
