import { PrismaClient } from '@prisma/client';
import { persistentModelDoctor } from '../src/services/PersistentModelDoctor.js';

const prisma = new PrismaClient();

async function finalCheck() {
  console.log('🏁 FINAL SYSTEM CHECK\n');
  console.log('='.repeat(60));
  
  // 1. Health Check
  console.log('\n📊 HEALTH STATUS');
  const health = await persistentModelDoctor.checkHealth();
  console.log(`Total Models: ${health.total}`);
  console.log(`Complete: ${health.complete}`);
  console.log(`Incomplete: ${health.incomplete}`);
  console.log(`Health: ${health.completionRate.toFixed(1)}%`);
  
  if (Object.keys(health.missingFields).length > 0) {
    console.log('\nMissing Fields:');
    for (const [field, count] of Object.entries(health.missingFields)) {
      console.log(`  - ${field}: ${count} models`);
    }
  }
  
  // 2. Provider Breakdown
  console.log('\n' + '='.repeat(60));
  console.log('\n🏢 PROVIDERS');
  const providers = await prisma.providerConfig.findMany();
  
  for (const provider of providers) {
    const modelCount = await prisma.model.count({
      where: { providerId: provider.id }
    });
    console.log(`${provider.type}: ${modelCount} models`);
  }
  
  // 3. Sample Models
  console.log('\n' + '='.repeat(60));
  console.log('\n📦 SAMPLE MODELS (First 3)');
  
  const sampleModels = await prisma.model.findMany({
    include: {
      provider: true,
      capabilities: true
    },
    take: 3
  });
  
  for (const model of sampleModels) {
    console.log(`\n${model.name}`);
    console.log(`  Provider: ${model.provider.type}`);
    console.log(`  ModelID: ${model.modelId}`);
    console.log(`  Context: ${model.capabilities?.contextWindow || 'N/A'}`);
    console.log(`  Has Vision: ${model.capabilities?.hasVision || false}`);
    console.log(`  Active: ${model.isActive}`);
  }
  
  // 4. Groq Specific Check
  console.log('\n' + '='.repeat(60));
  console.log('\n🔍 GROQ MODELS');
  
  const groqProvider = providers.find(p => p.type === 'groq');
  if (groqProvider) {
    const groqModels = await prisma.model.findMany({
      where: { providerId: groqProvider.id },
      include: { capabilities: true },
      take: 3
    });
    
    console.log(`Found ${groqModels.length} Groq models (showing first 3):`);
    groqModels.forEach(m => {
      console.log(`  - ${m.name} (context: ${m.capabilities?.contextWindow})`);
    });
  } else {
    console.log('❌ No Groq provider found');
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('\n✅ System check complete!');
  
  await prisma.$disconnect();
}

finalCheck().catch(err => {
  console.error('❌ Check failed:', err);
  process.exit(1);
});
