
import { RoleFactoryService } from '../services/RoleFactoryService.js';
import { ProviderManager } from '../services/ProviderManager.js';
import { prisma } from '../db.js';

async function main() {
    console.log("--- Role Creation Flow Verification ---");

    // 1. Initialize Providers
    await ProviderManager.initialize();

    // 2. Ensure "Architect" Role exists (required for factory)
    const factory = new RoleFactoryService();
    const architect = await factory.ensureArchitectRole();
    console.log(`✅ Architect Role ID: ${architect.id}`);

    // 3. Define Intent for a new role
    const intent = {
        name: "Test Frontend Agent",
        description: "A React/Next.js specialist that writes clean UI components.",
        domain: "Frontend",
        complexity: "MEDIUM" as const,
        capabilities: ["vision"] // Should trigger Cortex filtering
    };

    console.log(`\n[Test] Creating Role "${intent.name}"...`);

    try {
        const variant = await factory.createRoleVariant(architect.id, intent);
        console.log(`\n✅ Role Created Successfully!`);
        console.log(`- Variant ID: ${variant.id}`);
        console.log(`- Identity: ${(variant.identityConfig as any).personaName}`);
        console.log(`- Tools: ${JSON.stringify((variant.cortexConfig as any).tools)}`);
    } catch (error) {
        console.error("\n❌ Role Creation Failed:", error);
    }
}

main().catch(console.error);
