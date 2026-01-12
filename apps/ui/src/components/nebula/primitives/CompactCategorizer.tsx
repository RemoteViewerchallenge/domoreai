import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Plus, Search, Folder } from 'lucide-react';
import { cn } from '../../../lib/utils.js';

export interface CategorizerItem {
  id: string;
  label: string;
  categoryId?: string;
  icon?: React.ReactNode;
  metadata?: Record<string, unknown>;
}

interface CategorizerProps {
  title: string;
  items: CategorizerItem[];
  categories: string[];
  selectedId?: string | null;
  onSelect: (id: string) => void;
  onAddCategory?: (name: string) => void;
  onAddItem?: (categoryId?: string) => void;
  className?: string;
}

export const CompactCategorizer: React.FC<CategorizerProps> = ({
  title,
  items,
  categories,
  selectedId,
  onSelect,
  onAddItem,
  className
}) => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>(
    categories.reduce((acc, cat) => ({ ...acc, [cat]: true }), { 'Uncategorized': true } as Record<string, boolean>)
  );
  const [search, setSearch] = useState('');

  const toggle = (cat: string) => setExpanded(prev => ({ ...prev, [cat]: !prev[cat] }));

  // Group items
  const grouped = categories.reduce((acc, cat) => {
    acc[cat] = items.filter(i => i.categoryId === cat && i.label.toLowerCase().includes(search.toLowerCase()));
    return acc;
  }, {} as Record<string, CategorizerItem[]>);

  const uncategorized = items.filter(i => !i.categoryId && i.label.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className={cn("flex flex-col h-full bg-[var(--bg-secondary)] border-r border-[var(--border-color)]", className)}>
      {/* Header */}
      <div className="h-8 flex items-center justify-between px-2 border-b border-[var(--border-color)]">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">{title}</span>
        <div className="flex gap-1">
            {onAddItem && <button type="button" onClick={() => onAddItem()} className="hover:text-[var(--text-primary)]"><Plus size={12} /></button>}
        </div>
      </div>

      {/* Search */}
      <div className="p-2 border-b border-[var(--border-color)]">
        <div className="relative">
            <Search size={10} className="absolute left-2 top-1.5 text-[var(--text-muted)]" />
            <input 
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Filter..." 
                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded h-6 pl-6 text-[10px] focus:border-[var(--color-primary)] outline-none"
            />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {categories.map(cat => (
          <div key={cat}>
            <div 
                className="flex items-center gap-1 px-2 py-1 hover:bg-[var(--bg-primary)] cursor-pointer group"
                onClick={() => toggle(cat)}
            >
              {expanded[cat] ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
              <Folder size={10} className="text-[var(--text-muted)] group-hover:text-[var(--color-primary)]" />
              <span className="text-[10px] font-bold text-[var(--text-secondary)]">{cat}</span>
              <span className="ml-auto text-[9px] text-[var(--text-muted)]">{grouped[cat].length}</span>
            </div>
            
            {expanded[cat] && grouped[cat].map(item => (
               <ListItem key={item.id} item={item} selected={selectedId === item.id} onClick={() => onSelect(item.id)} />
            ))}
          </div>
        ))}

        {/* Uncategorized */}
        {uncategorized.length > 0 && (
            <div className="mt-2">
                 <div className="px-2 py-1 text-[9px] font-bold text-[var(--text-muted)] opacity-50 uppercase">Uncategorized</div>
                 {uncategorized.map(item => (
                    <ListItem key={item.id} item={item} selected={selectedId === item.id} onClick={() => onSelect(item.id)} />
                 ))}
            </div>
        )}
      </div>
    </div>
  );
};

const ListItem = ({ item, selected, onClick }: { item: CategorizerItem, selected: boolean, onClick: () => void }) => (
    <div 
        onClick={onClick}
        className={cn(
            "flex items-center gap-2 px-4 py-1.5 cursor-pointer border-l-2 transition-all",
            selected 
                ? "bg-[var(--color-primary)]/10 border-[var(--color-primary)] text-[var(--color-primary)]" 
                : "border-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)]"
        )}
    >
        {item.icon}
        <span className="text-[11px] truncate">{item.label}</span>
        {selected && <div className="ml-auto w-1 h-1 rounded-full bg-[var(--color-primary)]" />}
    </div>
);
