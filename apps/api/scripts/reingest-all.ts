import { UnifiedIngestionService } from '../src/services/UnifiedIngestionService.js';

async function reingestModels() {
  console.log('🔄 Re-ingesting all models from providers...\n');
  
  try {
    console.log('Starting ingestion...');
    await UnifiedIngestionService.ingestAllModels();
    console.log('\n✅ Ingestion complete!');
    
    // Check results
    const { prisma } = await import('../src/db.js');
    const modelCount = await prisma.model.count();
    const capCount = await prisma.modelCapabilities.count();
    
    console.log(`\nResults:`);
    console.log(`  Models: ${modelCount}`);
    console.log(`  Capabilities: ${capCount}`);
    
    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Ingestion failed:', error);
    process.exit(1);
  }
}

reingestModels().catch((err) => {
  console.error('Unhandled performance error:', err);
  process.exit(1);
});
