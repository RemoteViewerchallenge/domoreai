import { UnifiedIngestionService } from "../src/services/UnifiedIngestionService.js";
import { prisma } from "../src/db.js";
import { LLMSelector } from "../src/orchestrator/LLMSelector.js";
import { ProviderManager } from "../src/services/ProviderManager.js";

async function main() {
    // [SKIP] Ingestion is handled by force-sync.ts to ensure raw files are present
    // console.log("--- 1. Triggering Ingestion ---");
    // await UnifiedIngestionService.ingestAllModels();

    const totalModels = await prisma.model.count();
    const activeModels = await prisma.model.count({ where: { isActive: true } });
    // Cast to any for unknownModel
    const unknownModels = await (prisma as any).unknownModel.count();

    console.log(`--- 2. Verifying Filters ---`);
    console.log(`Model Verification:`);
    console.log(` - Total: ${totalModels}`);
    console.log(` - Active: ${activeModels}`);
    console.log(` - Unknown: ${unknownModels}`);

    const counts = await prisma.model.groupBy({
        by: ['providerId'],
        _count: { id: true }
    });
    console.log(`OpenRouter Count: ${counts.find(c => c.providerId === 'openrouter-env')?._count.id || 0}`);
    console.log(`--- 2. Verifying Filters (Breakdown) ---`);
    
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
    const selector = new LLMSelector();
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
        
        const total = await prisma.model.count();
        const active = await prisma.model.count({ where: { isActive: true } });
        // Cast to any for unknownModel
        const unknownCount = await (prisma as any).unknownModel.count();
        
        console.log(`Model Verification:`);
        console.log(` - Total: ${total}`);
        console.log(` - Active: ${active}`);
        console.log(` - Unknown: ${unknownCount}`);
        
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
