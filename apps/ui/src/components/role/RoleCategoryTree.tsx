import React, { useState } from 'react';
import type { CategoryNode, Role } from '../../types/role.js';
import { ChevronDown, ChevronRight, Folder, FolderOpen, Plus, Edit2, Trash2, Brain } from 'lucide-react';
import { cn } from '@/lib/utils.js';

interface RoleCategoryTreeProps {
  roots: CategoryNode[];
  uncategorizedRoles: Role[];
  selectedRoleId: string | null;
  onSelectRole: (role: Role) => void;
  // Category Actions
  onCreateCategory: (name: string, parentId?: string) => void;
  onUpdateCategory: (id: string, name: string) => void;
  onDeleteCategory: (id: string) => void;
  onMoveRole: (roleId: string, categoryId: string | null) => void;
  className?: string;
  isCreatingCategory?: boolean; // For root level creation
  setIsCreatingCategory?: (val: boolean) => void;
}

export const RoleCategoryTree: React.FC<RoleCategoryTreeProps> = ({
  roots,
  uncategorizedRoles,
  selectedRoleId,
  onSelectRole,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
  onMoveRole,
  className,
  isCreatingCategory: isCreatingRoot,
  setIsCreatingCategory: setIsCreatingRoot
}) => {
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});
  const [editingCategory, setEditingCategory] = useState<{id: string, name: string} | null>(null);
  
  // Local state for creating subcategories
  const [isCreatingSub, setIsCreatingSub] = useState<string | null>(null); // ID of parent category
  const [tempName, setTempName] = useState('');

  const renderCategory = (node: CategoryNode, level = 0) => {
    const isExpanded = openCategories[node.id] !== false; // Default open
    
    // Drag & Drop Handlers
    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      e.currentTarget.classList.add('bg-blue-900/50');
    };

    const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      e.currentTarget.classList.remove('bg-blue-900/50');
    };

    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      e.currentTarget.classList.remove('bg-blue-900/50');
      const roleId = e.dataTransfer.getData('roleId');
      if (roleId) {
        onMoveRole(roleId, node.id);
      }
    };

    return (
      <div key={node.id} className="select-none">
        <div 
          className={cn(
            "flex items-center justify-between group p-1 hover:bg-[var(--color-background-secondary)]/80 rounded transition-colors",
            "pl-[calc(0.25rem+var(--level)*1rem)]" // Dynamic padding using style or just simple math
          )}
          style={{ paddingLeft: `${level * 12 + 4}px` }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
            <div className="flex items-center gap-1 overflow-hidden flex-1">
                <button 
                  onClick={() => setOpenCategories(prev => ({ ...prev, [node.id]: !isExpanded }))}
                  className="p-0.5 hover:bg-[var(--color-primary)]/20 rounded text-[var(--color-text-muted)] flex-shrink-0"
                >
                  {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                </button>
                
                {editingCategory?.id === node.id ? (
                  <input 
                    autoFocus
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    onBlur={() => {
                        if (tempName.trim() && tempName !== node.name) {
                            onUpdateCategory(node.id, tempName);
                        }
                        setEditingCategory(null);
                        setTempName('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (tempName.trim()) {
                            onUpdateCategory(node.id, tempName);
                        }
                        setEditingCategory(null);
                        setTempName(''); 
                      } else if (e.key === 'Escape') {
                        setEditingCategory(null);
                        setTempName('');
                      }
                    }}
                    className="bg-black text-[var(--color-text)] px-1 py-0.5 text-[10px] w-full border border-blue-500 rounded"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span 
                    className="font-bold text-[var(--color-text)] text-[10px] truncate cursor-pointer flex items-center gap-1"
                    onDoubleClick={() => {
                        setEditingCategory({ id: node.id, name: node.name });
                        setTempName(node.name);
                    }}
                  >
                    {isExpanded ? <FolderOpen size={10} className="text-yellow-500" /> : <Folder size={10} className="text-yellow-500" />}
                    {node.name}
                  </span>
                )}
            </div>
            
            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                 <button 
                   title="Add Subcategory"
                   onClick={(e) => {
                     e.stopPropagation();
                     setIsCreatingSub(node.id);
                     setTempName('');
                   }}
                   className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-success)]"
                 >
                   <Plus size={10} />
                 </button>
                 <button 
                   title="Rename"
                   onClick={(e) => { 
                      e.stopPropagation();
                      setEditingCategory({ id: node.id, name: node.name });
                      setTempName(node.name);
                   }}
                   className="p-1 text-[var(--color-text-muted)] hover:text-blue-400"
                 >
                   <Edit2 size={10} />
                 </button>
                 <button 
                   title="Delete"
                   onClick={(e) => { 
                      e.stopPropagation();
                      if(confirm('Delete category? Roles will be uncategorized.')) {
                        onDeleteCategory(node.id);
                      }
                   }}
                   className="p-1 text-[var(--color-text-muted)] hover:text-red-400"
                 >
                   <Trash2 size={10} />
                 </button>
            </div>
        </div>

        {isExpanded && (
          <div className="border-l border-[var(--color-border)] ml-[calc(4px+0.5rem)]">
             {/* Creating New Subcategory Input */}
             {isCreatingSub === node.id && (
                <div className="pl-4 p-1">
                   <input 
                    autoFocus
                    placeholder="New Folder..."
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    onBlur={() => {
                        if (tempName.trim()) {
                            onCreateCategory(tempName, node.id);
                        }
                        setIsCreatingSub(null);
                        setTempName('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (tempName.trim()) {
                            onCreateCategory(tempName, node.id);
                        }
                        setIsCreatingSub(null);
                        setTempName('');
                      } else if (e.key === 'Escape') {
                        setIsCreatingSub(null);
                        setTempName('');
                      }
                    }}
                    className="bg-black text-[var(--color-text)] px-1 py-0.5 text-[10px] w-full border border-green-500 rounded"
                  />
                </div>
             )}
             
             {/* Subcategories */}
             {node.children?.map((child) => renderCategory(child, level + 1))}
             
             {/* Roles */}
             {node.roles?.map((role) => (
                <div
                  key={role.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('roleId', role.id);
                  }}
                  onClick={() => onSelectRole(role)}
                  className={cn(
                    "flex items-center gap-1 p-1 cursor-pointer hover:bg-[var(--color-background-secondary)] transition-colors rounded ml-1",
                     // Indent slightly from border
                     "pl-2",
                    selectedRoleId === role.id ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'
                  )}
                >
                  <Brain size={10} />
                  <span className="truncate text-[10px]">{role.name}</span>
                </div>
             ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
        {/* Root Creation Input */}
        {isCreatingRoot && setIsCreatingRoot && (
           <input 
              autoFocus
              placeholder="New Root Folder..."
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              onBlur={() => {
                 if (tempName.trim()) {
                     onCreateCategory(tempName);
                 }
                 setIsCreatingRoot(false);
                 setTempName('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (tempName.trim()) {
                      onCreateCategory(tempName);
                  }
                  setIsCreatingRoot(false);
                  setTempName('');
                } else if (e.key === 'Escape') {
                  setIsCreatingRoot(false);
                  setTempName('');
                }
              }}
              className="bg-black text-[var(--color-text)] px-1 py-0.5 text-[10px] w-full border border-green-500 rounded mb-2 mx-1"
            />
        )}

        {roots.map(node => renderCategory(node))}

        {/* Uncategorized */}
        <div className="mt-4 pt-2 border-t border-[var(--color-border)] px-1">
           <div className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase mb-1">Uncategorized</div>
           {uncategorizedRoles.map((role) => (
              <div
              key={role.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('roleId', role.id);
              }}
              onClick={() => onSelectRole(role)}
              className={cn(
                "flex items-center gap-1 p-1 pl-2 cursor-pointer hover:bg-[var(--color-background-secondary)] transition-colors rounded",
                selectedRoleId === role.id ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'
              )}
            >
              <Brain size={10} />
              <span className="truncate text-[10px]">{role.name}</span>
            </div>
           ))}
        </div>
    </div>
  );
};
