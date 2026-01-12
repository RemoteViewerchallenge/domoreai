import { UnifiedIngestionService } from "../services/UnifiedIngestionService.js";
import { prisma } from "../db.js";
import { ModelSelector } from "../services/ModelSelector.js";

async function main() {
    console.log("--- 1. Triggering Ingestion ---");
    await UnifiedIngestionService.ingestAllModels();

    console.log("--- 2. Verifying Filters ---");
    const openRouterCount = await prisma.model.count({
        where: { providerId: 'openrouter' }
    });
    console.log(`OpenRouter Count: ${openRouterCount} (Should be > 0 and < Total Available if filter works)`);
    
    console.log("--- 2. Verifying Filters (Breakdown) ---");
    
    // Group by Provider
    const breakdown = await prisma.model.groupBy({
        by: ['providerId'],
        _count: {
            id: true
        }
    });

    console.log("Model Counts by Provider:");
    let total = 0;
    for (const b of breakdown) {
        console.log(`- ${b.providerId}: ${b._count.id}`);
        total += b._count.id;
    }
    console.log(`Total: ${total}`);

    // Audit OpenRouter "Free" Models
    const openRouterModels = await prisma.model.findMany({
        where: { providerId: 'openrouter' },
        select: { name: true, costPer1k: true },
        take: 50 // Inspect first 50
    });
    console.log("Sample OpenRouter Models (First 50):");
    console.log(openRouterModels.map(m => `${m.name} ($${m.costPer1k})`));

    console.log("--- 3. Verifying Capabilities ---");
    const capsCount = await prisma.modelCapabilities.count();
    console.log(`Capabilities Count: ${capsCount}`);

    console.log("--- 4. Verifying ModelSelector Resolution ---");
    const selector = new ModelSelector();
    // Create a dummy role matching the Interface
    const role = {
        id: 'test-role',
        metadata: {
            requirements: {
                minContext: 16000 // High context requirement to force selection
            }
        },
        defaultModelId: undefined
    };
    
    try {
        const bestModelId = await selector.resolveModelForRole(role as any);
        console.log(`Resolved High Context Model ID: ${bestModelId}`);
        
        const model = await prisma.model.findUnique({ where: { id: bestModelId }, include: { capabilities: true } });
        console.log(`Selected Model Name: ${model?.name}`);
        console.log(`Selected Model Context: ${model?.capabilities?.contextWindow}`);
        
        // Test Exclusion
        console.log("--- 5. Testing Exclusion ---");
        // Exclude the ID we just found (Both CUID and Name to be safe)
        const excludeList = [bestModelId, model!.name];
        console.log(`Excluding:`, excludeList);
        
        const fallbackId = await selector.resolveModelForRole(role as any, 0, excludeList);
        console.log(`Resolved Fallback ID: ${fallbackId}`);
        
        const fallbackModel = await prisma.model.findUnique({ where: { id: fallbackId } });
        console.log(`Fallback Model Name: ${fallbackModel?.name}`);

        if(fallbackId === bestModelId) {
            console.error("❌ Exclusion FAILED: Returned same model");
        } else {
            console.log("✅ Exclusion WORKED: Returned different model");
        }

    } catch (e) {
        console.error("Selector Test Failed (Maybe no models found?):", e);
    }
}

main().catch(console.error);
