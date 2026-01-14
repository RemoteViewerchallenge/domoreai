
import { prisma } from '../db.js';

async function addProviders() {
    console.log("Ensuring extra providers exist...");

    const providers = [
        { 
            id: 'cerebras', 
            label: 'Cerebras', 
            type: 'cerebras', 
            baseURL: 'https://api.cerebras.ai/v1' 
        },
        { 
            id: 'nvidia', 
            label: 'NVIDIA', 
            type: 'nvidia', 
            baseURL: 'https://integrate.api.nvidia.com/v1' 
        }
    ];

    for (const p of providers) {
        const existing = await prisma.providerConfig.findFirst({
            where: { type: p.type }
        });

        if (existing) {
            console.log(`✅ ${p.label} provider already exists.`);
        } else {
            await prisma.providerConfig.create({
                data: {
                    id: p.id,
                    label: p.label,
                    type: p.type,
                    baseURL: p.baseURL,
                    isEnabled: true
                }
            });
            console.log(`✅ Added ${p.label} Provider.`);
        }
    }
}

addProviders()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
