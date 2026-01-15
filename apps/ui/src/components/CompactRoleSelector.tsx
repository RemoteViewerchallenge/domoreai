import React from 'react';
import { trpc } from '../utils/trpc.js';
import { CompactCategorizer } from './nebula/primitives/CompactCategorizer.js';
import type { CategorizerItem } from './nebula/primitives/CompactCategorizer.js';
import { Bot } from 'lucide-react';

interface CompactRoleSelectorProps {
    selectedRoleId: string | null;
    onSelect: (roleId: string) => void;
    onEdit?: () => void;
    className?: string;
}

export const CompactRoleSelector: React.FC<CompactRoleSelectorProps> = ({ selectedRoleId, onSelect, onEdit, className }) => {
    // 1. Fetch Data
    const { data: roles, isLoading: rolesLoading, error: roleError } = trpc.role.list.useQuery();
    const { data: categories, isLoading: catsLoading } = trpc.role.listCategories.useQuery();

    const utils = trpc.useContext();
    const deleteMutation = trpc.role.delete.useMutation({
        onSuccess: () => {
            void utils.role.list.invalidate();
        },
        onError: (err) => {
            alert(`Failed to delete role: ${err.message}`);
        }
    });

    const handleDelete = (id: string) => {
         deleteMutation.mutate({ id });
         if (selectedRoleId === id) {
             onSelect(''); // Clear selection if deleted
         }
    };

    if (rolesLoading || catsLoading) {
        return <div className="p-4 text-[10px] text-zinc-500 flex items-center gap-2"><div className="animate-spin w-3 h-3 border-2 border-zinc-600 border-t-zinc-400 rounded-full"/> Loading Roles...</div>;
    }

    if (roleError) {
        return <div className="p-4 text-[10px] text-red-500">Failed to load roles: {roleError.message}</div>;
    }

    // 2. Transform to Primitive Format
    const items: CategorizerItem[] = (roles || []).map((r: any) => {
        let cat = r.category?.name || r.categoryString;
        // Normalize 'Uncategorized' to undefined so it falls into the uncategorized bucket
        if (cat === 'Uncategorized' || !cat) {
            cat = undefined;
        }
        
        return {
            id: r.id,
            label: r.name,
            categoryId: cat,
            icon: <Bot size={12} className={selectedRoleId === r.id ? 'text-[var(--color-primary)]' : 'text-[var(--text-muted)]'} />
        };
    });

    // 3. Dynamic Category Merging (Ensure no role is left behind because its category isn't in the DB list)
    const dbCategoryNames = (categories || []).map(c => c.name);
    const usedCategoryNames = Array.from(new Set(items.map(i => i.categoryId).filter(Boolean) as string[]));
    
    // Merge and deduplicate, preferring DB order (at the start)
    const allCategories = Array.from(new Set([...dbCategoryNames, ...usedCategoryNames]));

    return (
        <CompactCategorizer 
            title="Agent Roster"
            items={items}
            categories={allCategories}
            selectedId={selectedRoleId}
            onSelect={onSelect}
            onDelete={handleDelete}
            className={className}
        />
    );
};

export default CompactRoleSelector;
