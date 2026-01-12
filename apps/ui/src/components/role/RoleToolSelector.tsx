import React, { useMemo } from 'react';
import { trpc } from '../../utils/trpc.js';
import { CompactCategorizer } from '../nebula/primitives/CompactCategorizer.js';
import type { CategorizerItem } from '../nebula/primitives/CompactCategorizer.js';
import { Wrench } from 'lucide-react';

interface RoleToolSelectorProps {
    selectedTools: string[]; // List of tool names
    onChange: (tools: string[]) => void;
    className?: string;
}

export const RoleToolSelector: React.FC<RoleToolSelectorProps> = ({ selectedTools = [], onChange, className }) => {
    const { data: tools } = trpc.tool.list.useQuery();

    // 1. Infer Categories from Tool Names or serverId
    const { items, categories } = useMemo(() => {
        const cats = new Set<string>();
        const mappedItems: CategorizerItem[] = (tools || []).map(t => {
            let category = t.serverId || 'General';
            if (!t.serverId && t.name.includes('_')) {
                 const parts = t.name.split('_');
                 category = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
            }
            cats.add(category);
            
            const isEnabled = selectedTools.includes(t.name);

            return {
                id: t.name,
                label: t.name,
                categoryId: category,
                icon: <Wrench size={12} className={isEnabled ? "text-[var(--color-primary)]" : "text-[var(--text-muted)]"} />
            };
        });
        return { items: mappedItems, categories: Array.from(cats).sort() };
    }, [tools, selectedTools]);

    return (
        <div className="h-full flex flex-col">
            <CompactCategorizer 
                title="Available Tools"
                items={items}
                categories={categories}
                selectedId={null} 
                onSelect={(id) => {
                    const newSelection = selectedTools.includes(id)
                        ? selectedTools.filter(t => t !== id)
                        : [...selectedTools, id];
                    onChange(newSelection);
                }}
                className={className}
            />
        </div>
    );
};
