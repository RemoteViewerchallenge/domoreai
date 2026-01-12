
import { ProviderService } from '../services/provider.service.js';
import { prisma } from '../db.js';

async function main() {
    const service = new ProviderService();
    const models = await service.listAllAvailableModels();
    
    console.log("Total Models returned:", models.length);
    if (models.length > 0) {
        console.log("Sample Model:", JSON.stringify(models[0], null, 2));
        
        // Find a high context model
        const highContext = models.find((m: any) => m.contextWindow > 100000);
        if (highContext) {
            console.log("High Context Model:", JSON.stringify(highContext, null, 2));
        } else {
            console.log("No models > 100k context found!");
        }
    }
}

main()
  .catch(console.error)
  .finally(async () => await prisma.$disconnect());
