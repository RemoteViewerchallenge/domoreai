import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function getModels() {
  try {
    // Get all LLM models
    const llmModels = await prisma.lLMModel.findMany({
      select: {
        id: true,
        slug: true,
        name: true,
        provider: true,
        contextWindow: true,
        capabilities: true
      },
      orderBy: { provider: 'asc' }
    });
    
    // Get audio models
    const audioModels = await prisma.audioModel.findMany({
      select: {
        id: true,
        slug: true,
        name: true,
        provider: true,
        type: true
      },
      orderBy: { provider: 'asc' }
    });
    
    console.log('=== LLM MODELS ===');
    console.log('Total:', llmModels.length);
    
    // Group by provider
    const byProvider: Record<string, typeof llmModels> = {};
    llmModels.forEach(m => {
      if (!byProvider[m.provider]) byProvider[m.provider] = [];
      byProvider[m.provider].push(m);
    });
    
    for (const [provider, models] of Object.entries(byProvider)) {
      console.log(`\n${provider} (${models.length} models):`);
      models.slice(0, 5).forEach(m => {
        console.log(`  - ${m.slug} (${m.contextWindow || 'unknown'} tokens)`);
      });
      if (models.length > 5) {
        console.log(`  ... and ${models.length - 5} more`);
      }
    }
    
    console.log('\n\n=== AUDIO MODELS ===');
    console.log('Total:', audioModels.length);
    
    const audioByProvider: Record<string, typeof audioModels> = {};
    audioModels.forEach(m => {
      if (!audioByProvider[m.provider]) audioByProvider[m.provider] = [];
      audioByProvider[m.provider].push(m);
    });
    
    for (const [provider, models] of Object.entries(audioByProvider)) {
      console.log(`\n${provider}:`);
      models.forEach(m => {
        console.log(`  - ${m.slug} (${m.type})`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

getModels();
