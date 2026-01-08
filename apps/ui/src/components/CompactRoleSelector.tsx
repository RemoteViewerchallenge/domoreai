import React, { useState, useMemo, useEffect } from 'react';
import { cn } from '@/lib/utils.js';
import { trpc } from '../utils/trpc.js';

type CompactRoleSelectorProps = {
  onSelect?: (roleId: string) => void;
  selectedRoleId?: string;
  lockedCategory?: string;
};

const CompactRoleSelector: React.FC<CompactRoleSelectorProps> = ({ 
  onSelect,
  selectedRoleId,
  lockedCategory
}) => {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Fetch roles from tRPC
  const { data: roles, isLoading } = trpc.role.list.useQuery();

  // Group roles by category
  const categorizedRoles = useMemo(() => {
    if (!roles) return {};
    
    const grouped: Record<string, typeof roles> = {};
    
    roles.forEach((role) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r = role as any;
      const category = r.category?.name || r.categoryString || 'Uncategorized';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(role);
    });
    
    return grouped;
  }, [roles]);

  const categories = useMemo(() => {
    return Object.keys(categorizedRoles).sort();
  }, [categorizedRoles]);

  // Auto-select first category or current category or locked category
  useEffect(() => {
    // 1. If Locked, force it
    if (lockedCategory) {
        if (activeCategory !== lockedCategory) setActiveCategory(lockedCategory);
        return;
    }

    // 2. If Selected Role, verify category
    if (selectedRoleId && roles) {
        const role = roles.find(r => r.id === selectedRoleId);
        if (role) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const r = role as any;
            const cat = r.category?.name || r.categoryString || 'Uncategorized';
            if (activeCategory !== cat) {
                setActiveCategory(cat);
            }
        }
    } else if (categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0]);
    }
  }, [categories, activeCategory, selectedRoleId, roles, lockedCategory]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4 text-[10px] text-[var(--color-text-secondary)]">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
          Loading roles...
        </div>
      </div>
    );
  }

  if (!roles || roles.length === 0) {
    return (
      <div className="flex items-center justify-center p-4 text-[10px] text-[var(--color-text-secondary)]">
        No roles found
      </div>
    );
  }

  const currentRoles = activeCategory ? categorizedRoles[activeCategory] || [] : [];

  return (
    <div className="flex h-full min-h-[180px] text-[10px]">
      {/* Category Icons (Left Column) */}
      <div className="w-8 flex flex-col items-center bg-[var(--color-background)]/50 border-r border-[var(--color-border)] py-1 gap-1">
        {categories.map((category) => {
          const firstLetter = category.charAt(0).toUpperCase();
          const isActive = activeCategory === category;
          
          return (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={cn(
                "w-6 h-6 flex items-center justify-center rounded-sm transition-all font-bold text-[10px]",
                isActive 
                  ? "bg-[var(--color-primary)] text-[var(--color-background)] shadow-sm" 
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-white/5 bg-[var(--color-background-secondary)]"
              )}
              title={category}
            >
              {firstLetter}
            </button>
          );
        })}
      </div>

      {/* Roles List (Right Column) */}
      <div className="flex-1 bg-[var(--color-background)]/30">
        {currentRoles.length === 0 ? (
          <div className="p-3 text-[var(--color-text-secondary)] text-center">
            No roles in this category
          </div>
        ) : (
          currentRoles.map((role) => {
            const isSelected = selectedRoleId === role.id;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const r = role as any;
            
            return (
              <button
                key={role.id}
                onClick={() => onSelect?.(role.id)}
                className={cn(
                  "w-full text-left px-2 py-1.5 transition-all border-b border-[var(--color-border)]/30 last:border-0 truncate text-[10px] block",
                  isSelected
                    ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-medium"
                    : "text-[var(--color-text)] hover:bg-[var(--color-primary)]/5 hover:text-[var(--color-primary)]"
                )}
                title={r.description || r.name}
              >
                <div className="flex items-center gap-1.5 w-full">
                  {isSelected && (
                    <div className="w-1 h-1 rounded-full bg-[var(--color-primary)] flex-shrink-0" />
                  )}
                  <span className="truncate flex-1">{r.name}</span>
                </div>
                {r.description && (
                  <div className="text-[9px] text-[var(--color-text-secondary)] truncate mt-0.5 opacity-70">
                    {r.description}
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

export default CompactRoleSelector;
