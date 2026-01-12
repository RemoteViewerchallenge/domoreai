import React from 'react';
import { trpc } from '../utils/trpc.js';
import { CompactCategorizer } from './nebula/primitives/CompactCategorizer.js';
import type { CategorizerItem } from './nebula/primitives/CompactCategorizer.js';
import { Bot } from 'lucide-react';

interface CompactRoleSelectorProps {
    selectedRoleId: string | null;
    onSelect: (roleId: string) => void;
    className?: string;
}

export const CompactRoleSelector: React.FC<CompactRoleSelectorProps> = ({ selectedRoleId, onSelect, className }) => {
    // 1. Fetch Data
    const { data: roles } = trpc.role.list.useQuery();
    const { data: categories } = trpc.role.listCategories.useQuery();

    // 2. Transform to Primitive Format
    const items: CategorizerItem[] = (roles || []).map((r: any) => ({
        id: r.id,
        label: r.name,
        categoryId: r.category?.name || r.categoryString || 'Uncategorized',
        icon: <Bot size={12} className={selectedRoleId === r.id ? 'text-[var(--color-primary)]' : 'text-[var(--text-muted)]'} />
    }));

    const categoryNames = (categories || []).map(c => c.name);

    return (
        <CompactCategorizer 
            title="Agent Roster"
            items={items}
            categories={categoryNames}
            selectedId={selectedRoleId}
            onSelect={onSelect}
            className={className}
        />
    );
};

export default CompactRoleSelector;
