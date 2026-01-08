import React, { useState, useMemo } from 'react';
import { Briefcase, Code, Shield, Sparkles, User } from 'lucide-react';
import { cn } from '@/lib/utils.js';
import { trpc } from '../utils/trpc.js';

type CompactRoleSelectorProps = {
  onSelect?: (roleId: string) => void;
  selectedRoleId?: string;
  lockedCategory?: string;
};

// Icon mapping for categories
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'Frontend Department': <Code size={12} />,
  'Backend Department': <Code size={12} />,
  'Engineering': <Code size={12} />,
  'Executive': <Briefcase size={12} />,
  'Operations': <Shield size={12} />,
  'AI': <Sparkles size={12} />,
  'Uncategorized': <User size={12} />,
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
      const category = role.categoryString || role.category?.name || 'Uncategorized';
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
  React.useEffect(() => {
    // 1. If Locked, force it
    if (lockedCategory) {
        if (activeCategory !== lockedCategory) setActiveCategory(lockedCategory);
        return;
    }

    // 2. If Selected Role, verify category
    if (selectedRoleId && roles) {
        const role = roles.find(r => r.id === selectedRoleId);
        if (role) {
            const cat = role.categoryString || role.category?.name || 'Uncategorized';
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
      <div className="flex items-center justify-center h-32 text-[10px] text-[var(--color-text-secondary)]">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
          Loading roles...
        </div>
      </div>
    );
  }

  if (!roles || roles.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-[10px] text-[var(--color-text-secondary)]">
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
          const icon = CATEGORY_ICONS[category] || <User size={12} />;
          const isActive = activeCategory === category;
          
          return (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={cn(
                "p-1.5 rounded transition-all",
                isActive 
                  ? "bg-[var(--color-primary)]/20 text-[var(--color-primary)] shadow-sm" 
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-white/5"
              )}
              title={category}
            >
              {icon}
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
            
            return (
              <button
                key={role.id}
                onClick={() => onSelect?.(role.id)}
                className={cn(
                  "w-full text-left px-2 py-1.5 transition-all border-b border-[var(--color-border)]/30 last:border-0 truncate text-[10px]",
                  isSelected
                    ? "bg-[var(--color-primary)]/20 text-[var(--color-primary)] font-medium"
                    : "text-[var(--color-text)] hover:bg-[var(--color-primary)]/10 hover:text-[var(--color-primary)]"
                )}
                title={role.description || role.name}
              >
                <div className="flex items-center gap-1.5">
                  {isSelected && (
                    <div className="w-1 h-1 rounded-full bg-[var(--color-primary)]" />
                  )}
                  <span className="truncate">{role.name}</span>
                </div>
                {role.description && (
                  <div className="text-[9px] text-[var(--color-text-secondary)] truncate mt-0.5 opacity-70">
                    {role.description}
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
