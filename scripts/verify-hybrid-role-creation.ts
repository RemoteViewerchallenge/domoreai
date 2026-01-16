import { prisma } from '../apps/api/src/db.js';
import { RoleFactoryService } from '../apps/api/src/services/RoleFactoryService.js';
import { ProviderManager } from '../apps/api/src/services/ProviderManager.js';

async function verifyHybridFlow() {
    console.log("🚀 Verifying Hybrid Role Creation Flow...");

    const factory = new RoleFactoryService();

    // 1. Create a Frontend Worker (High Complexity -> Should be HYBRID_AUTO)
    console.log("\n--- Scenario 1: Frontend Worker (Expect HYBRID_AUTO) ---");
    const frontendIntent = {
        name: "React Specialist",
        description: "Expert in React, Tailwind and Framer Motion.",
        domain: "Frontend",
        complexity: "HIGH" as const,
        capabilities: ['vision']
    };

    try {
        // We need a dummy role to evolve
        const baseRole = await prisma.role.upsert({
            where: { name: "Base Frontend" },
            update: {},
            create: { name: "Base Frontend", basePrompt: "Base" }
        });

        const variant = await factory.createRoleVariant(baseRole.id, frontendIntent);
        console.log("✅ Variant Created:", variant.id);
        const cortex = variant.cortexConfig as any;
        console.log("  Execution Mode:", cortex.executionMode);
        console.log("  Capabilities:", cortex.capabilities);
    } catch (e) {
        console.error("❌ Scenario 1 Failed:", e);
    }

    // 2. Create a Research Assistant (Low Complexity -> Should be JSON_STRICT)
    console.log("\n--- Scenario 2: Research Assistant (Expect JSON_STRICT) ---");
    const researchIntent = {
        name: "Fact Checker",
        description: "Quickly verifies facts using search tools.",
        domain: "Research",
        complexity: "LOW" as const
    };

    try {
        const baseRole = await prisma.role.upsert({
            where: { name: "Base Research" },
            update: {},
            create: { name: "Base Research", basePrompt: "Base" }
        });

        const variant = await factory.createRoleVariant(baseRole.id, researchIntent);
        console.log("✅ Variant Created:", variant.id);
        const cortex = variant.cortexConfig as any;
        console.log("  Execution Mode:", cortex.executionMode);
    } catch (e) {
        console.error("❌ Scenario 2 Failed:", e);
    }

    process.exit(0);
}

verifyHybridFlow();
