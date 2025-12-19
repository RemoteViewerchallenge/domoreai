import { db } from '../src/db.js';
import { modelRegistry, modelCapabilities } from '../src/db/schema.js';
import { eq } from 'drizzle-orm';

async function diagnose() {
  console.log('🔍 Diagnosing ModelCapabilities Join Issue\n');
  
  // 1. Check total counts
  const allModels = await db.select().from(modelRegistry);
  const allCaps = await db.select().from(modelCapabilities);
  
  console.log(`Total Models: ${allModels.length}`);
  console.log(`Total Capabilities: ${allCaps.length}\n`);
  
  // 2. Find a Groq model
  const groqModel = allModels.find(m => 
    m.modelId.toLowerCase().includes('groq') || 
    m.providerId?.toLowerCase().includes('groq')
  );
  
  if (!groqModel) {
    console.log('❌ No Groq model found in registry');
    return;
  }
  
  console.log('=== GROQ MODEL ===');
  console.log(`ID: ${groqModel.id}`);
  console.log(`ModelID: ${groqModel.modelId}`);
  console.log(`Provider: ${groqModel.providerId}`);
  console.log(`Active: ${groqModel.isActive}\n`);
  
  // 3. Try to find its capabilities
  const caps = allCaps.find(c => c.modelId === groqModel.id);
  
  if (caps) {
    console.log('=== CAPABILITIES FOUND ===');
    console.log(`Context Window: ${caps.contextWindow}`);
    console.log(`Has Vision: ${caps.hasVision}`);
    console.log(`Has Audio Input: ${caps.hasAudioInput}`);
    console.log(`Has TTS: ${caps.hasTTS}\n`);
  } else {
    console.log('❌ NO CAPABILITIES FOUND FOR THIS MODEL\n');
    console.log('Checking if there\'s a mismatch...');
    
    // Check if there's a capability with a similar ID
    const similarCaps = allCaps.filter(c => 
      c.modelId.includes(groqModel.modelId) ||
      groqModel.id.includes(c.modelId)
    );
    
    if (similarCaps.length > 0) {
      console.log(`Found ${similarCaps.length} capabilities with similar IDs:`);
      similarCaps.forEach(c => {
        console.log(`  - Capability modelId: ${c.modelId}`);
        console.log(`    Model ID: ${groqModel.id}`);
        console.log(`    Match: ${c.modelId === groqModel.id}`);
      });
    }
  }
  
  // 4. Test the actual join query
  console.log('\n=== TESTING JOIN QUERY ===');
  const joinResult = await db.select({
    modelId: modelRegistry.modelId,
    contextWindow: modelCapabilities.contextWindow,
    hasVision: modelCapabilities.hasVision
  })
    .from(modelRegistry)
    .leftJoin(modelCapabilities, eq(modelRegistry.id, modelCapabilities.modelId))
    .where(eq(modelRegistry.id, groqModel.id))
    .limit(1);
  
  if (joinResult.length > 0) {
    console.log('Join successful:');
    console.log(JSON.stringify(joinResult[0], null, 2));
  } else {
    console.log('❌ Join returned no results');
  }
  
  process.exit(0);
}

diagnose().catch(err => {
  console.error('❌ Diagnostic failed:', err);
  process.exit(1);
});
