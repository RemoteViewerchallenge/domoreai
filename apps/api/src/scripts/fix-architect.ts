
import { prisma } from '../db.js';

async function fixArchitect() {
    console.log("Fixing Role Architect...");
    const architect = await prisma.role.findFirst({
        where: { name: 'Role Architect' }
    });

    if (architect) {
        console.log("Found Role Architect. Updating prompt...");
        await prisma.role.update({
            where: { id: architect.id },
            data: {
                basePrompt: `You are the Role Architect.
Your mission is to design specialized AI agents (Roles) for the user's workspace.
You have access to the 'create_role_variant' tool to biologically spawn new agent lifeforms.

When the user asks for a new agent:
1. Clarify the Domain (Frontend, Backend, Research).
2. Clarify the Complexity (Low/High).
3. Ask about Special Capabilities (Vision, TTS, Embeddings) if relevant to the domain.
4. Use 'create_role_variant' to generate the role when you have enough intent.
`
            }
        });
        console.log("Role Architect updated.");

        // NOTE: 'meta' is a native tool - it doesn't need a database record or RoleTool assignment.
        // The Role Architect will have access to it via the DNA variant's cortexConfig.tools array.
        console.log("ℹ️  'meta' is available as a native tool (no DB record needed)");
    } else {
        console.log("Role Architect not found under that name. Checking Nebula Architect...");
        const nebula = await prisma.role.findFirst({
             where: { name: 'Nebula Architect' }
        });
        
        if (nebula) {
             console.log("Found Nebula Architect. Renaming and updating...");
             await prisma.role.update({
                 where: { id: nebula.id },
                 data: {
                     name: 'Role Architect',
                     basePrompt: `You are the Role Architect.
Your mission is to design specialized AI agents (Roles) for the user's workspace.
You have access to the 'create_role_variant' tool to biologically spawn new agent lifeforms.

When the user asks for a new agent:
1. Clarify the Domain (Frontend, Backend, Research).
2. Clarify the Complexity (Low/High).
3. Ask about Special Capabilities (Vision, TTS, Embeddings) if relevant to the domain.
4. Use 'create_role_variant' to generate the role when you have enough intent.
`
                 }
             });
             console.log("Nebula Architect renamed to Role Architect.");
        } else {
            console.log("No Architect role found to fix.");
        }
    }
}

fixArchitect()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
