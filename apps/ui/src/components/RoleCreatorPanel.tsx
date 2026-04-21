import React, { useState, useMemo } from 'react';
import { trpc } from '../utils/trpc.js';
import type { RoleFormState, Role, Tool, CategoryNode, Model } from '../types/role.js'; // type imports
import { DEFAULT_ROLE_FORM_DATA } from '../constants.js';
import { 
  Save, Trash2, Sparkles, CheckCircle, FilePlus, Database, Plus
} from 'lucide-react';
import { RoleToolSelector } from './role/RoleToolSelector.js';
import { RoleCategoryTree } from './role/RoleCategoryTree.js';
import { RoleParamsForm } from './role/RoleParamsForm.js';
import { useModelFilter } from '../hooks/useModelFilter.js';
import { toast } from 'sonner';

interface RoleCreatorPanelProps {
  className?: string;
}

const RoleCreatorPanel: React.FC<RoleCreatorPanelProps> = ({ className = '' }) => {
  // State declarations
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [formData, setFormData] = useState<RoleFormState>(DEFAULT_ROLE_FORM_DATA);
  const [leftTab, setLeftTab] = useState<'params' | 'toolPrompts'>('params');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [isNewCategory, setIsNewCategory] = useState<boolean>(false);
  
  // Category UI State
  const [isCreatingRootCat, setIsCreatingRootCat] = useState(false);

  // tRPC hooks
  const utils = trpc.useContext();
  const { data: categories, refetch: refetchCategories, isLoading: categoriesLoading, error: categoriesError } = trpc.role.listCategories.useQuery();
  const { data: roles, isLoading: rolesLoading } = trpc.role.list.useQuery();
  const { data: toolsList } = trpc.tool.list.useQuery();
  const { data: registry } = trpc.orchestrator.getActiveRegistryData.useQuery();

  const models = useMemo(() => {
     if (!registry) return [];
     if (Array.isArray(registry)) return registry;
     if ('rows' in registry && Array.isArray(registry.rows)) return registry.rows;
     // Fallback
     if ('models' in registry && Array.isArray(registry.models)) return registry.models;
     return [];
  }, [registry]);

  const { breakdown } = useModelFilter(models as Model[], {
      minContext: formData.minContext,
      maxContext: formData.maxContext,
      needsVision: formData.needsVision,
      needsReasoning: formData.needsReasoning
  });
  
  // Mutations
  const createCategoryMutation = trpc.role.createCategory.useMutation({ onSuccess: () => void refetchCategories() });
  const updateCategoryMutation = trpc.role.updateCategory.useMutation({ onSuccess: () => void refetchCategories() });
  const deleteCategoryMutation = trpc.role.deleteCategory.useMutation({ onSuccess: () => void refetchCategories() });
  const moveRoleMutation = trpc.role.moveRoleToCategory.useMutation({ onSuccess: () => { void utils.role.list.invalidate(); } });
  
  const createRoleMutation = trpc.role.create.useMutation({
    onSuccess: () => {
        void utils.role.list.invalidate();
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
        toast.success('Role Created');
    },
    onError: (e) => {
        setSaveStatus('error');
        toast.error(`Error creating role: ${e.message}`);
    }
  });

  const updateRoleMutation = trpc.role.update.useMutation({
    onSuccess: () => {
        void utils.role.list.invalidate();
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
        toast.success('Role Updated');
    },
    onError: (e) => {
        setSaveStatus('error');
        toast.error(`Error updating role: ${e.message}`);
    }
  });

  const deleteRoleMutation = trpc.role.delete.useMutation({
    onSuccess: () => {
        void utils.role.list.invalidate();
        handleCreateNewRole(); // Reset form
        toast.success('Role Deleted');
    },
  });

  const ingestLibraryMutation = trpc.role.ingestLibrary.useMutation({
      onSuccess: (data) => {
          toast.success(data.message);
          void utils.role.list.invalidate();
          void refetchCategories();
      }
  });

  // Derived Data
  const uniqueCategories = useMemo(() => {
    const cats = new Set<string>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (categories || []).forEach((c: any) => cats.add(c.name));
    return Array.from(cats).sort();
  }, [categories]);

  const categoryTree = useMemo(() => {
    if (!categories) return { roots: [], uncategorizedRoles: [] };
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const map = new Map<string, any>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const roots: CategoryNode[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const uncategorizedRoles: Role[] = [];
    
    // Initialize map
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    categories.forEach((cat: any) => {
      map.set(cat.id, { ...cat, children: [], roles: [] });
    });

    // Place Roles
    if (roles) {
      roles.forEach((r) => {
        const role = r as unknown as Role; // Cast to new Role type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const catId = (r as any).categoryId;
         if (catId && map.has(catId)) {
           map.get(catId).roles.push(role);
         } else {
           uncategorizedRoles.push(role);
         }
      });
    }

    // Build Hierarchy
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    categories.forEach((cat: any) => {
      if (cat.parentId && map.has(cat.parentId)) {
        map.get(cat.parentId).children.push(map.get(cat.id));
      } else {
        roots.push(map.get(cat.id));
      }
    });

    return { roots, uncategorizedRoles };
  }, [categories, roles]);


  // Handlers
  const handleSelectRole = async (role: Role) => {
    setSelectedRoleId(role.id);
    
    // Convert Role to RoleFormState
    // We assume backend Role matches interface largely, but need safeguards
    setFormData({
      name: role.name,
      basePrompt: role.basePrompt,
      category: role.categoryString || role.category?.name || '',
      minContext: role.minContext || 0,
      maxContext: role.maxContext || 128000,
      needsVision: role.needsVision || false,
      needsReasoning: role.needsReasoning || false,
      needsCoding: role.needsCoding || false,
      needsTools: role.needsTools || false,
      needsJson: role.needsJson || false,
      needsUncensored: role.needsUncensored || false,
      needsImageGeneration: role.needsImageGeneration || false,
      tools: role.tools || [],
      defaultTemperature: role.defaultTemperature || 0.7,
      defaultMaxTokens: role.defaultMaxTokens || 2048,
      defaultTopP: role.defaultTopP || 1.0,
      defaultFrequencyPenalty: role.defaultFrequencyPenalty || 0.0,
      defaultPresencePenalty: role.defaultPresencePenalty || 0.0,
      defaultStop: role.defaultStop || [],
      defaultSeed: role.defaultSeed,
      defaultResponseFormat: role.defaultResponseFormat || 'text',
      terminalRestrictions: role.terminalRestrictions || { mode: 'blacklist', commands: ['rm', 'sudo', 'dd', 'mkfs', 'shutdown', 'reboot'] },
      criteria: role.criteria || {},
      orchestrationConfig: role.orchestrationConfig || { requiresCheck: false, judgeRoleId: undefined, minPassScore: 80 },
      memoryConfig: {
        useProjectMemory: role.memoryConfig?.useProjectMemory ?? false,
        readOnly: role.memoryConfig?.readOnly ?? false,
      },
    });
    
    // Refresh tools loaded? (Optional logic here for tool prompts)
    setSaveStatus('idle');
  };

  const handleCreateNewRole = () => {
    setSelectedRoleId(null);
    setFormData(DEFAULT_ROLE_FORM_DATA);
    setSaveStatus('idle');
    setLeftTab('params');
  };

  const handleSave = () => {
    setSaveStatus('saving');
    // Align inputData with schema
    const inputData = { ...formData };
    
    // Clean category
    if (inputData.category === 'new') inputData.category = ''; 

    if (selectedRoleId) {
        updateRoleMutation.mutate({ id: selectedRoleId, ...inputData });
    } else {
        createRoleMutation.mutate(inputData);
    }
  };

  if (categoriesLoading || rolesLoading) {
    return (
      <div className={`flex items-center justify-center h-full w-full bg-[var(--color-background)] ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)] mx-auto mb-4"></div>
          <p className="text-[var(--color-text-muted)]">Loading roles...</p>
        </div>
      </div>
    );
  }

  if (categoriesError) {
    return <div className="p-4 text-red-500">Error: {categoriesError.message}</div>;
  }

  return (
    <div className={`flex h-full w-full bg-[var(--color-background)] text-[var(--color-text)] font-sans ${className}`}>
       {/* Sidebar: Category Tree */}
       <div className="w-56 bg-[var(--color-background-secondary)] border-r border-[var(--color-border)] flex flex-col flex-shrink-0">
          <div className="p-2 border-b border-[var(--color-border)] flex justify-between items-center bg-[var(--color-background)]/50">
             <span className="text-xs font-bold uppercase text-[var(--color-text-muted)]">Library ({roles?.length || 0})</span>
             <div className="flex gap-1">
                 <button 
                    onClick={handleCreateNewRole}
                    title="Create New Role"
                    className="text-[var(--color-text-muted)] hover:text-[var(--color-primary)] mr-2 transition-colors"
                 >
                    <FilePlus size={14} />
                 </button>
                 <button 
                    onClick={() => {
                        if(confirm('Ingest default library?')) ingestLibraryMutation.mutate();
                    }} 
                    title="Ingest Standard Library"
                    disabled={ingestLibraryMutation.isLoading}
                    className="text-[var(--color-text-muted)] hover:text-[var(--color-primary)] disabled:opacity-50 transition-colors"
                 >
                    <Database size={14} className={ingestLibraryMutation.isLoading ? "animate-spin" : ""} />
                 </button>
                 <button onClick={() => setIsCreatingRootCat(true)} className="text-[var(--color-text-muted)] hover:text-[var(--color-success)] transition-colors">
                    <Plus size={14} />
                 </button>
             </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2">
             <RoleCategoryTree 
                roots={categoryTree.roots}
                uncategorizedRoles={categoryTree.uncategorizedRoles}
                selectedRoleId={selectedRoleId}
                onSelectRole={handleSelectRole}
                onCreateCategory={(name, parentId) => createCategoryMutation.mutate({ name, parentId })}
                onUpdateCategory={(id, name) => updateCategoryMutation.mutate({ id, name })}
                onDeleteCategory={(id) => deleteCategoryMutation.mutate({ id })}
                onMoveRole={(roleId, categoryId) => moveRoleMutation.mutate({ roleId, categoryId })}
                isCreatingCategory={isCreatingRootCat}
                setIsCreatingCategory={setIsCreatingRootCat}
             />
          </div>
       </div>

       {/* Main Editor Area - 2 Columns */}
       <div className="flex-1 flex overflow-hidden relative">
         
         {/* LEFT COLUMN: Prompt & Config (60%) */}
         <div className="w-[60%] flex flex-col border-r border-[var(--color-border)] relative z-10">
           {/* Header */}
           <div className="flex-none border-b border-[var(--color-border)] p-4 bg-[var(--color-background)]/50">
             <div className="flex flex-col gap-2">
               <input
                 type="text"
                 value={formData.name}
                 onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                 className="w-full px-3 py-2 bg-transparent text-xl font-bold text-[var(--color-text)] focus:outline-none border-b border-[var(--color-border)] focus:border-[var(--color-primary)] placeholder-[var(--color-text-muted)]"
                 placeholder="ROLE NAME"
               />
               <div className="flex items-center gap-2">
                 {isNewCategory ? (
                   <input
                     type="text"
                     value={formData.category}
                     onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                     className="flex-grow px-3 py-2 bg-transparent text-sm text-[var(--color-text-muted)] focus:outline-none border-b border-[var(--color-border)] focus:border-[var(--color-primary)] placeholder-[var(--color-text-muted)]"
                     placeholder="NEW CATEGORY"
                   />
                 ) : (
                   <select
                     value={formData.category}
                     onChange={(e) => {
                       if (e.target.value === 'new') {
                         setIsNewCategory(true);
                         setFormData({ ...formData, category: '' });
                       } else {
                         setIsNewCategory(false);
                         setFormData({ ...formData, category: e.target.value });
                       }
                     }}
                     className="flex-grow px-3 py-2 bg-transparent text-sm text-[var(--color-text-muted)] focus:outline-none border-b border-[var(--color-border)] focus:border-[var(--color-primary)]"
                   >
                     <option value="" disabled className="bg-[var(--color-background)] text-[var(--color-text)]">Select Category</option>
                     {uniqueCategories.map(cat => (
                       <option key={cat} value={cat} className="bg-[var(--color-background)] text-[var(--color-text)]">{cat}</option>
                     ))}
                     <option value="new" className="bg-[var(--color-background)] text-[var(--color-text)]">+ Create New Category</option>
                   </select>
                 )}
                 
                 <div className="flex gap-2 ml-4">
                   {selectedRoleId && (
                     <button 
                       onClick={() => { if(confirm('Delete Role?')) deleteRoleMutation.mutate({ id: selectedRoleId }) }}
                       className="p-2 text-[var(--color-error)] hover:bg-[var(--color-error)]/20 rounded transition-all"
                     >
                       <Trash2 size={16} />
                     </button>
                   )}
                   <button 
                     onClick={handleSave}
                     disabled={saveStatus === 'saving'}
                     className={`flex items-center gap-2 px-4 py-2 font-bold rounded shadow-lg transition-all ${
                         saveStatus === 'saved' ? 'bg-[var(--color-success)] text-white' :
                         saveStatus === 'error' ? 'bg-[var(--color-error)] text-white' :
                         'bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/80 text-[var(--color-background)] shadow-[var(--color-primary)]/20'
                     }`}
                   >
                     {saveStatus === 'saving' ? <Sparkles size={16} className="animate-spin" /> : 
                      saveStatus === 'saved' ? <CheckCircle size={16} /> :
                      <Save size={16} />}
                     {saveStatus === 'saving' ? 'SAVING...' : 
                      saveStatus === 'saved' ? 'SAVED!' : 
                      saveStatus === 'error' ? 'ERROR' : 'SAVE'}
                   </button>
                 </div>
               </div>
             </div>
           </div>

           {/* Tabs */}
           <div className="flex-none border-b border-[var(--color-border)]">
             <div className="flex">
               <button
                 onClick={() => setLeftTab('params')}
                 className={`flex-1 py-2 text-xs font-bold uppercase ${leftTab === 'params' ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)] bg-[var(--color-background-secondary)]/50' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
               >
                 Settings & Prompt
               </button>
               <button
                 onClick={() => setLeftTab('toolPrompts')}
                 className={`flex-1 py-2 text-xs font-bold uppercase ${leftTab === 'toolPrompts' ? 'text-[var(--color-success)] border-b-2 border-[var(--color-success)] bg-[var(--color-background-secondary)]/50' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
               >
                 Tools ({formData.tools.length})
               </button>
             </div>
           </div>
           
           {/* Content */}
           <div className="flex-1 overflow-y-auto">
             {leftTab === 'params' ? (
                <div className="flex flex-col h-full">
                    <RoleParamsForm formData={formData} setFormData={setFormData} className="border-b border-[var(--color-border)]" />
                    
                    {/* Datacenter Breakdown */}
                    <div className="p-4 border-b border-[var(--color-border)] bg-[var(--color-background-secondary)]/10">
                        <div className="flex justify-between items-center mb-2">
                             <h4 className="text-xs font-bold text-[var(--color-text-muted)] uppercase flex items-center gap-2">
                                <Database size={12} /> Datacenter Breakdown
                             </h4>
                             <span className="text-[10px] text-[var(--color-text-muted)]">Matching Models</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {Object.entries(breakdown).map(([provider, stats]) => (
                                <div key={provider} className="flex items-center gap-2 px-2 py-1 bg-[var(--color-background)] border border-[var(--color-border)] rounded text-[10px]">
                                    <span className="font-bold text-[var(--color-text)]">{provider}</span>
                                    <div className="flex items-center gap-1 font-mono">
                                        <span className={stats.matched > 0 ? "text-[var(--color-success)]" : "text-[var(--color-text-muted)]"}>
                                            {stats.matched}
                                        </span>
                                        <span className="text-[var(--color-text-muted)]">/</span>
                                        <span className="text-[var(--color-text-muted)]">{stats.total}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 p-4 flex flex-col min-h-[300px]">
                        <h4 className="text-xs font-bold text-[var(--color-text-muted)] uppercase mb-2">System Prompt</h4>
                        <textarea 
                            value={formData.basePrompt}
                            onChange={(e) => setFormData(prev => ({ ...prev, basePrompt: e.target.value }))}
                            className="flex-1 w-full bg-[var(--color-background-secondary)]/30 border border-[var(--color-border)] rounded p-4 font-mono text-sm leading-relaxed text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-none resize-none"
                            placeholder="You are an expert AI..."
                        />
                    </div>
                </div>
             ) : (
                <RoleToolSelector 
                    availableTools={(toolsList as Tool[]) || []}
                    selectedTools={formData.tools}
                    onChange={(newTools) => setFormData(prev => ({ ...prev, tools: newTools }))}
                />
             )}
           </div>
         </div>

         {/* RIGHT COLUMN: Previews / Tool Prompts (40%) */}
         <div className="w-[40%] bg-[var(--color-background-secondary)]/20">
             {leftTab === 'toolPrompts' ? (
                 <div className="p-4 flex flex-col h-full">
                     <h3 className="text-xs font-bold uppercase text-[var(--color-text-muted)] mb-4">Tool Instructions</h3>
                     {formData.tools.length === 0 && (
                         <div className="text-center text-[var(--color-text-muted)] mt-10 italic">
                             No tools selected. Select tools from the list to see their instructions.
                         </div>
                     )}
                     <div className="space-y-4 overflow-y-auto flex-1 pr-2">
                         {formData.tools.map(toolName => {
                             const tool = toolsList?.find(t => t.name === toolName);
                             return (
                                 <div key={toolName} className="p-3 border border-[var(--color-border)] rounded bg-[var(--color-background)]">
                                     <div className="font-bold text-xs text-[var(--color-primary)] mb-1">{toolName}</div>
                                     <div className="text-[10px] whitespace-pre-wrap font-mono text-[var(--color-text-muted)]">
                                         {tool?.instruction || "No specific instructions found."}
                                     </div>
                                 </div>
                             );
                         })}
                     </div>
                 </div>
             ) : (
                 <div className="p-4 flex flex-col justify-center items-center h-full text-[var(--color-text-muted)]">
                     <Sparkles size={48} className="mb-4 opacity-20" />
                     <p className="text-sm font-medium">Select 'Tools' tab to configure capabilities</p>
                 </div>
             )}
         </div>
       </div>
    </div>
  );
};

export default RoleCreatorPanel;
