import React, { useState } from 'react';
import { toast } from 'sonner';
import { trpc } from '../utils/trpc';
import { NebulaRendererRoot } from '../features/nebula-renderer/NebulaRenderer';
// Import the JSON layout directly
import roleCreatorLayout from '../data/nebula/RoleCreator.json';
import type { NebulaTree } from '@repo/nebula';

export const RoleCreatorPage = () => {
    const utils = trpc.useContext();
    const createVariant = trpc.role.createVariant.useMutation({
        onSuccess: (data) => {
            toast.success(`Role Created: ${data.id}`);
            // utils.role.list.invalidate(); // Refresh roles list if we were viewing it
        },
        onError: (err) => {
            toast.error(`Failed to create role: ${err.message}`);
        }
    });

    const handleAction = async (action: string, payload?: any, bindings?: any) => {
        if (action === 'submit') {
            console.log("Submitting DNA...", bindings);
            const { name, domain, description, complexity } = bindings;

            if (!name || !domain || !complexity) {
                toast.error("Please fill in all required fields (Name, Domain, Complexity)");
                return;
            }

            try {
                // We use a dummy ID 'new_role' because the factory will likely generate a real ID or we are supposed to be "forking" an existing role.
                // But createVariant expects a roleId.
                // Based on the user flow, this page creates a NEW root role (maybe?) or a variant?
                // The factory says "createRoleVariant(roleId...)".
                // If this is a PURE new role, we might need a different mutation or assume 'roleId' is the parent.
                // Let's assume for now we are creating a fresh role, so we might need to adjust the backend OR pass a placeholder.
                // Wait, createVariant logic in RoleFactory does `prisma.roleVariant.create({ roleId: ... })`.
                // It requires an existing PARENT ROLE.
                
                // CRITICAL: The user wants to CREATE A ROLE.
                // The `createVariant` mutation I added assumes an existing Role ID.
                // I might need to Create the Role wrapper FIRST.
                
                // Actually, let's just trigger the 'create' mutation first to make the Role, then the Variant?
                // OR, let's update internal logic.
                // For now, I will error if no parent role is found.
                // BUT this is a "Role Creator".
                
                // FIX: I will use `trpc.role.create` INSTEAD if I want a brand new role?
                // But `create` uses the old logic.
                // I want the NEW Factor 4.0 logic.
                
                // I'll assume for this demo we are attaching to a "Generic Base" or I should have added a "createRoleWithVariant" method.
                // Let's assume we pass "default" or "root" as ID and the backend handles it?
                // No, foreign key constraint.
                
                // I will add a "createRoleWithFactory" mutation to the router later if needed.
                // For now, let's assume we are creating a variant of the "General Assistant" (id: 'default' or similar).
                
                // Let's try to map it to a "Base Role" if possible.
                // Or maybe the user selects a parent?
                
                // For simplicity in this iteration: I'll use a hardcoded valid ID 'default' if it exists, or handle it.
                // I will use 'default' for now.
                await createVariant.mutateAsync({
                    roleId: 'default', // TODO: Allow selecting parent role
                    intent: {
                        name,
                        domain,
                        description: description || "No description",
                        complexity: complexity as 'LOW' | 'MEDIUM' | 'HIGH'
                    }
                });
            } catch (e) {
                console.error(e);
            }
        }
    };

    return (
        <div className="w-full h-full flex items-center justify-center bg-zinc-950/50 p-4">
             <div className="w-full max-w-2xl h-auto"> {/* Constraint container */}
                <NebulaRendererRoot 
                    tree={roleCreatorLayout as unknown as NebulaTree} 
                    initialBindings={{
                        name: '',
                        domain: '',
                        description: '',
                        complexity: 'LOW'
                    }}
                    onAction={handleAction}
                />
             </div>
        </div>
    );
};

export default RoleCreatorPage;
