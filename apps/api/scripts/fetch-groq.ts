import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';

async function fetchGroqDirect() {
  console.log('🔄 Fetching Groq models directly from API...\n');
  
  const apiKey = process.env.GROQ_API_KEY;
  
  if (!apiKey) {
    console.error('❌ GROQ_API_KEY not found in environment');
    console.log('Please set it in .env.local or export it');
    process.exit(1);
  }
  
  console.log(`Using API key: ${apiKey.substring(0, 10)}...`);
  
  const url = 'https://api.groq.com/openai/v1/models';
  console.log(`Fetching from: ${url}\n`);
  
  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`API Error ${response.status}: ${text}`);
    }
    
    const data = await response.json();
    const models = data.data || [];
    
    console.log(`✅ Fetched ${models.length} models from Groq\n`);
    
    // Save to file
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const filename = `groq_models_${timestamp}.json`;
    const filepath = path.join(process.cwd(), 'latest_models', filename);
    
    await fs.writeFile(filepath, JSON.stringify(models, null, 2));
    console.log(`💾 Saved to: ${filename}\n`);
    
    // Show all models
    console.log('Available Groq models:');
    models.forEach((m: any) => {
      console.log(`  - ${m.id} (context: ${m.context_window || 'N/A'})`);
    });
    
    console.log(`\n✅ Done! Now run: npx tsx scripts/reingest-all.ts`);
    
  } catch (error) {
    console.error('❌ Failed to fetch:', error);
    process.exit(1);
  }
}

fetchGroqDirect();
