
import { prisma } from '../db.js';
import { v4 as uuidv4 } from 'uuid';

async function addCerebrasProvider() {
    console.log("Adding Cerebras provider...");
    
    // Check if it exists
    const existing = await prisma.providerConfig.findFirst({
        where: { type: 'cerebras' }
    });

    if (existing) {
        console.log(`Cerebras provider already exists: ${existing.id}`);
        // Update URL if needed
        if (existing.baseURL !== 'https://api.cerebras.ai/v1') {
             await prisma.providerConfig.update({
                 where: { id: existing.id },
                 data: { baseURL: 'https://api.cerebras.ai/v1' }
             });
             console.log("Updated baseURL for existing provider.");
        }
        return;
    }

    // Add new
    const provider = await prisma.providerConfig.create({
        data: {
            id: 'cerebras', // Fixed ID for convenience
            label: 'Cerebras',
            type: 'cerebras',
            baseURL: 'https://api.cerebras.ai/v1',
            isEnabled: true
        }
    });

    console.log(`✅ Added Cerebras Provider: ${provider.id}`);
}

addCerebrasProvider()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
