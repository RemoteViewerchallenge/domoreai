import React, { useState, useMemo } from 'react';
import { trpc } from '../utils/trpc.js';
import DualRangeSlider from './DualRangeSlider.js';
import { RoleModelOverride } from './RoleModelOverride.js';
import { 
  Save, Trash2, Brain, Eye, Code, Wrench, FileJson, Skull, Sparkles, Shield, Database, 
  ChevronDown, ChevronRight, CheckCircle, Folder, FolderOpen, MoreVertical, Edit2, Plus 
} from 'lucide-react';
import { useEffect } from 'react';

interface RoleCreatorPanelProps {
  className?: string;
}

const RoleCreatorPanel: React.FC<RoleCreatorPanelProps> = ({ className = '' }) => {

// ... (existing hooks) ...

  const { data: categories, refetch: refetchCategories, isLoading: categoriesLoading, error: categoriesError } = trpc.role.listCategories.useQuery();
  const createCategoryMutation = trpc.role.createCategory.useMutation({ onSuccess: () => refetchCategories() });
  const updateCategoryMutation = trpc.role.updateCategory.useMutation({ onSuccess: () => refetchCategories() });
  const deleteCategoryMutation = trpc.role.deleteCategory.useMutation({ onSuccess: () => refetchCategories() });
  const moveRoleMutation = trpc.role.moveRoleToCategory.useMutation({ onSuccess: () => { utils.role.list.invalidate(); } });

  const [editingCategory, setEditingCategory] = useState<{id: string, name: string} | null>(null);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryParentId, setNewCategoryParentId] = useState<string | null>(null);
  const [tempCategoryName, setTempCategoryName] = useState('');
  const [isNewCategory, setIsNewCategory] = useState<boolean>(false);

  // State for form data
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    basePrompt: '',
    category: '', 
    minContext: 0,
    maxContext: 128000,
    needsVision: false,
    needsReasoning: false,
    needsCoding: false,
    needsTools: false,
    needsJson: false,
    needsUncensored: false,
    needsImageGeneration: false,
    tools: [] as string[],
    defaultTemperature: 0.7,
    defaultMaxTokens: 2048,
    defaultTopP: 1.0,
    defaultFrequencyPenalty: 0.0,
    defaultPresencePenalty: 0.0,
    defaultStop: [] as string[],
    defaultSeed: undefined as number | undefined,
    defaultResponseFormat: 'text' as 'text' | 'json_object',
    terminalRestrictions: { mode: 'blacklist', commands: ['rm', 'sudo', 'dd', 'mkfs', 'shutdown', 'reboot'] } as { mode: 'whitelist' | 'blacklist' | 'unrestricted'; commands: string[] },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    criteria: {} as Record<string, any>,
    orchestrationConfig: { requiresCheck: false, judgeRoleId: undefined as string | undefined, minPassScore: 80 },
    memoryConfig: { useProjectMemory: false, readOnly: false },
  });

  const [leftTab, setLeftTab] = useState<'params' | 'toolPrompts'>('params');
  const [rightTab, setRightTab] = useState<'capabilities' | 'orchestration' | 'assignments'>('capabilities');
  
  const [toolPrompts, setToolPrompts] = useState<Record<string, string>>({});
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  
  // Selection Handlers
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const { data: registryData } = trpc.orchestrator.getActiveRegistryData.useQuery();

  const filteredModels = useMemo(() => {
    if (!registryData) return [];
    // Filter logic if needed, currently just returning all
    return Object.values(registryData.models).flat(); 
  }, [registryData]);

  const datacenterBreakdown = useMemo(() => {
    // Mock breakdown for now if precise data structure isn't available
    return {} as Record<string, { matched: number; total: number }>; 
  }, []);

  const createRoleMutation = trpc.role.create.useMutation({
    onSuccess: () => {
        utils.role.list.invalidate();
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
    },
    onError: () => setSaveStatus('error')
  });

  const updateRoleMutation = trpc.role.update.useMutation({
    onSuccess: () => {
        utils.role.list.invalidate();
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
    },
    onError: () => setSaveStatus('error')
  });

  const deleteRoleMutation = trpc.role.delete.useMutation({
    onSuccess: () => utils.role.list.invalidate(),
  });

  const generatePromptMutation = trpc.role.generatePrompt.useMutation({
    onSuccess: (data) => {
        setFormData(prev => ({ ...prev, basePrompt: data }));
    }
  });

  const updateToolExamplesMutation = trpc.orchestrator.updateToolExamples.useMutation();
  const runDoctorMutation = trpc.model.runDoctor.useMutation();

  const { data: toolsList } = trpc.orchestrator.listTools.useQuery();

  const utils = trpc.useContext();
  const { data: roles, isLoading: rolesLoading } = trpc.role.list.useQuery();
  const selectedRole = useMemo(() => roles?.find((r: any) => r.id === selectedRoleId), [roles, selectedRoleId]);

  // Loading state
  if (categoriesLoading || rolesLoading) {
    return (
      <div className={`flex items-center justify-center h-full w-full bg-[var(--color-background)] ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)] mx-auto mb-4"></div>
          <p className="text-[var(--color-text-muted)]">Loading roles and categories...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (categoriesError) {
    return (
      <div className={`flex items-center justify-center h-full w-full bg-[var(--color-background)] ${className}`}>
        <div className="text-center p-8 border border-[var(--color-error)] rounded bg-[var(--color-error)]/10">
          <p className="text-[var(--color-error)] font-bold mb-2">Error loading categories</p>
          <p className="text-[var(--color-text-muted)] text-sm">{categoriesError.message}</p>
        </div>
      </div>
    );
  }

  // Helper to extract category name safely
  const getCategoryName = (role: any): string => {
    if (role.category && typeof role.category === 'object' && 'name' in role.category) {
        return role.category.name || 'Uncategorized';
    }
    if (role.categoryString) return role.categoryString;
    if (typeof role.category === 'string') return role.category;
    return 'Uncategorized';
  };

  const uniqueCategories = useMemo(() => {
    const categories = new Set<string>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (roles as any[])?.forEach(role => {
       categories.add(getCategoryName(role));
    });
    return Array.from(categories).filter(Boolean).sort();
  }, [roles]);

  // Handler for selecting a role
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSelectRole = async (role: any) => {
    setSelectedRoleId(role.id);
    setFormData({
      name: role.name,
      basePrompt: role.basePrompt,
      category: getCategoryName(role),
      minContext: role.minContext || 0,
      maxContext: role.maxContext || 128000,
      needsVision: role.needsVision,
      needsReasoning: role.needsReasoning,
      needsCoding: role.needsCoding,
      needsTools: role.needsTools,
      needsJson: role.needsJson,
      needsUncensored: role.needsUncensored,
      needsImageGeneration: role.needsImageGeneration || false,
      tools: role.tools || [],
      defaultTemperature: role.defaultTemperature || 0.7,
      defaultMaxTokens: role.defaultMaxTokens || 2048,
      defaultTopP: role.defaultTopP || 1.0,
      defaultFrequencyPenalty: role.defaultFrequencyPenalty || 0.0,
      defaultPresencePenalty: role.defaultPresencePenalty || 0.0,
      defaultStop: role.defaultStop || [],
      defaultSeed: role.defaultSeed || undefined,
      defaultResponseFormat: role.defaultResponseFormat || 'text',
      terminalRestrictions: role.terminalRestrictions || { mode: 'blacklist', commands: ['rm', 'sudo', 'dd', 'mkfs', 'shutdown', 'reboot'] },
      criteria: (role.criteria) || {},
      orchestrationConfig: (role.orchestrationConfig) || { requiresCheck: false, judgeRoleId: undefined, minPassScore: 80 },
      memoryConfig: (role.memoryConfig as unknown) || { useProjectMemory: false, readOnly: false },
    });
    
    // Load tool prompts if needed
    if (role.tools) {
        const prompts: Record<string, string> = {};
        for (const tool of role.tools) {
            try {
               const result = await utils.orchestrator.getToolExamples.fetch({ toolName: tool });
               if (result && result.content) {
                   prompts[tool] = result.content;
               }
            } catch (e) { console.error(e); }
        }
        setToolPrompts(prompts);
    }
    setSaveStatus('idle');
  };

  const handleSave = () => {
    setSaveStatus('saving');
    // Prepare input data
    const inputData = {
        name: formData.name,
        basePrompt: formData.basePrompt,
        categoryString: formData.category,
        minContext: formData.minContext,
        maxContext: formData.maxContext,
        needsVision: formData.needsVision,
        needsReasoning: formData.needsReasoning,
        needsCoding: formData.needsCoding,
        needsTools: formData.needsTools,
        needsJson: formData.needsJson,
        needsUncensored: formData.needsUncensored,
        needsImageGeneration: formData.needsImageGeneration,
        tools: formData.tools,
        defaultTemperature: formData.defaultTemperature,
        defaultMaxTokens: formData.defaultMaxTokens,
        defaultTopP: formData.defaultTopP,
        defaultFrequencyPenalty: formData.defaultFrequencyPenalty,
        defaultPresencePenalty: formData.defaultPresencePenalty,
        defaultStop: formData.defaultStop,
        defaultSeed: formData.defaultSeed,
        defaultResponseFormat: formData.defaultResponseFormat,
        terminalRestrictions: formData.terminalRestrictions,
        criteria: formData.criteria,
        orchestrationConfig: formData.orchestrationConfig,
        memoryConfig: formData.memoryConfig,
    };

    if (selectedRoleId) {
        updateRoleMutation.mutate({ id: selectedRoleId, ...inputData });
    } else {
        createRoleMutation.mutate(inputData);
    }
  };

  const handleMagicGenerate = () => {
     generatePromptMutation.mutate({ name: formData.name, category: formData.category });
  };

  const renderDynamicInputs = () => {
      return null; // Placeholder as implementation was complex and might be redundant or can be restored later if needed
  };

  // Tree Construction
  const categoryTree = useMemo(() => {
    if (!categories) return { roots: [], uncategorizedRoles: [] };
    
    const map = new Map<string, any>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const roots: any[] = [];
    
    // Initialize map
    categories.forEach((cat: any) => {
      map.set(cat.id, { ...cat, children: [], roles: [] });
    });

    // Place Roles
    const uncategorizedRoles: any[] = [];
    if (roles) {
      roles.forEach(role => {
        const catId = (role as any).categoryId;
         if (catId && map.has(catId)) {
           map.get(catId).roles.push(role);
         } else {
           uncategorizedRoles.push(role);
         }
      });
    }

    // Build Hierarchy
    categories.forEach((cat: any) => {
      if (cat.parentId && map.has(cat.parentId)) {
        map.get(cat.parentId).children.push(map.get(cat.id));
      } else {
        roots.push(map.get(cat.id));
      }
    });

    return { roots, uncategorizedRoles };
  }, [categories, roles]);

  // Recursive Category Renderer
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderCategory = (node: any, level = 0) => {
    const isExpanded = openCategories[node.id] !== false; // Default open
    
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
        moveRoleMutation.mutate({ roleId, categoryId: node.id });
      }
    };

    return (
      <div key={node.id} className="select-none">
        <div 
          className={`flex items-center justify-between group p-1 hover:bg-[var(--color-background-secondary)]/80 rounded transition-colors pl-${level * 4}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
            <div className="flex items-center gap-1 overflow-hidden flex-1">
                <button 
                  onClick={() => setOpenCategories(prev => ({ ...prev, [node.id]: !isExpanded }))}
                  className="p-0.5 hover:bg-[var(--color-primary)]/20 rounded text-[var(--color-text-muted)]"
                >
                  {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                </button>
                {editingCategory?.id === node.id ? (
                  <input 
                    autoFocus
                    value={tempCategoryName}
                    onChange={(e) => setTempCategoryName(e.target.value)}
                    onBlur={() => setEditingCategory(null)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        updateCategoryMutation.mutate({ id: node.id, name: tempCategoryName });
                        setEditingCategory(null);
                      }
                    }}
                    className="bg-black text-[var(--color-text)] px-1 py-0.5 text-[10px] w-full border border-blue-500 rounded"
                  />
                ) : (
                  <span 
                    className="font-bold text-[var(--color-text)] text-[10px] truncate cursor-pointer flex items-center gap-1"
                    onDoubleClick={() => {
                        setEditingCategory({ id: node.id, name: node.name });
                        setTempCategoryName(node.name);
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
                     setIsCreatingCategory(true);
                     setNewCategoryParentId(node.id);
                     setTempCategoryName('');
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
                      setTempCategoryName(node.name);
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
                        deleteCategoryMutation.mutate({ id: node.id });
                      }
                   }}
                   className="p-1 text-[var(--color-text-muted)] hover:text-red-400"
                 >
                   <Trash2 size={10} />
                 </button>
            </div>
        </div>

        {isExpanded && (
          <div className={`pl-2 border-l border-[var(--color-border)] ml-1`}>
             {/* Creating New Subcategory Input */}
             {isCreatingCategory && newCategoryParentId === node.id && (
                <div className="pl-4 p-1">
                   <input 
                    autoFocus
                    placeholder="New Folder..."
                    value={tempCategoryName}
                    onChange={(e) => setTempCategoryName(e.target.value)}
                    onBlur={() => setIsCreatingCategory(false)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && tempCategoryName.trim()) {
                        createCategoryMutation.mutate({ name: tempCategoryName, parentId: node.id });
                        setIsCreatingCategory(false);
                      }
                    }}
                    className="bg-black text-[var(--color-text)] px-1 py-0.5 text-[10px] w-full border border-green-500 rounded"
                  />
                </div>
             )}
             
             {/* Subcategories */}
             {node.children?.map((child: any) => renderCategory(child, level + 1))}
             
             {/* Roles */}
             {node.roles?.map((role: any) => (
                <div
                  key={role.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('roleId', role.id);
                  }}
                  onClick={() => { void handleSelectRole(role); }}
                  className={`flex items-center gap-1 p-1 pl-2 cursor-pointer hover:bg-[var(--color-background-secondary)] transition-colors rounded ${
                    selectedRoleId === role.id ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'
                  }`}
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
    <div className={`flex h-full w-full bg-[var(--color-background)] text-[var(--color-text)] font-sans ${className}`}>
       {/* Sidebar */}
       <div className="w-48 bg-[var(--color-background-secondary)] border-r border-[var(--color-border)] flex flex-col flex-shrink-0">
          <div className="p-2 border-b border-[var(--color-border)] flex justify-between items-center">
             <span className="text-xs font-bold uppercase text-[var(--color-text-muted)]">Categories</span>
             <button onClick={() => { setIsCreatingCategory(true); setNewCategoryParentId(null); setTempCategoryName(''); }} className="text-[var(--color-text-muted)] hover:text-[var(--color-success)]">
                <Plus size={14} />
             </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
             {isCreatingCategory && newCategoryParentId === null && (
                  <input 
                     autoFocus
                     placeholder="New Root Folder..."
                     value={tempCategoryName}
                     onChange={(e) => setTempCategoryName(e.target.value)}
                     onBlur={() => setIsCreatingCategory(false)}
                     onKeyDown={(e) => {
                       if (e.key === 'Enter' && tempCategoryName.trim()) {
                         createCategoryMutation.mutate({ name: tempCategoryName, parentId: undefined });
                         setIsCreatingCategory(false);
                       }
                     }}
                     className="bg-black text-[var(--color-text)] px-1 py-0.5 text-[10px] w-full border border-green-500 rounded mb-2"
                   />
             )}
             
             {categoryTree.roots.map((node) => renderCategory(node))}

             {/* Uncategorized */}
             <div className="mt-4 pt-2 border-t border-[var(--color-border)]">
                <div className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase mb-1 px-1">Uncategorized</div>
                {categoryTree.uncategorizedRoles.map((role) => (
                   <div
                   key={role.id}
                   draggable
                   onDragStart={(e) => {
                     e.dataTransfer.setData('roleId', role.id);
                   }}
                   onClick={() => { void handleSelectRole(role); }}
                   className={`flex items-center gap-1 p-1 pl-2 cursor-pointer hover:bg-[var(--color-background-secondary)] transition-colors rounded ${
                     selectedRoleId === role.id ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'
                   }`}
                 >
                   <Brain size={10} />
                   <span className="truncate text-[10px]">{role.name}</span>
                 </div>
                ))}
             </div>
          </div>
       </div>

      {/* Main Editor Area - 2 Columns */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* LEFT COLUMN: Prompt & Name (60%) */}
        <div className="w-[60%] flex flex-col border-r border-[var(--color-border)]">
          {/* Header with Name and Actions */}
          <div className="flex-none border-b border-[var(--color-border)] p-4">
            <div className="flex flex-col gap-2"> {/* Changed to flex-col for better layout of name and category */}
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
                    placeholder="NEW CATEGORY (e.g. 'Marketing')"
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
                    <option value="" disabled>Select Category</option>
                    {uniqueCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                    <option value="new">+ Create New Category</option>
                  </select>
                )}
                <div className="flex gap-2 ml-4">
                  {selectedRoleId && (
                    <button 
                      onClick={() => deleteRoleMutation.mutate({ id: selectedRoleId })}
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

          {/* Tabs for Base Prompt and Tool Prompts */}
          <div className="flex-none border-b border-[var(--color-border)]">
            <div className="flex">
              <button
                onClick={() => setLeftTab('params')}
                className={`flex-1 py-2 text-xs font-bold uppercase ${leftTab === 'params' ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)] bg-[var(--color-background-secondary)]/50' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
              >
                Base Prompt
              </button>
              <button
                onClick={() => setLeftTab('toolPrompts')}
                className={`flex-1 py-2 text-xs font-bold uppercase ${leftTab === 'toolPrompts' ? 'text-[var(--color-success)] border-b-2 border-[var(--color-success)] bg-[var(--color-background-secondary)]/50' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
              >
                Tool Prompts
              </button>
            </div>
          </div>
          
          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-4">
            {leftTab === 'params' ? (
              <div className="flex flex-col h-full">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase">System Prompt</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                         setFormData(prev => ({
                            ...prev,
                            needsReasoning: true,
                            criteria: { ...prev.criteria, model_id: 'gemini-3-pro-preview' }
                         }));
                      }}
                      className={`flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-teal-600 to-emerald-600 text-white text-[10px] font-bold rounded hover:opacity-80 transition-all ${formData.criteria.model_id === 'gemini-3-pro-preview' ? 'ring-2 ring-white' : ''}`}
                    >
                      <Sparkles size={12} />
                      USE GEMINI 3 (ANTIGRAVITY)
                    </button>
                    <button
                      onClick={() => { void handleMagicGenerate(); }}
                      disabled={generatePromptMutation.isLoading}
                      className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] text-white text-[10px] font-bold rounded hover:opacity-80 transition-all"
                    >
                      <Sparkles size={12} />
                      {generatePromptMutation.isLoading ? 'GENERATING...' : 'MAGIC GENERATE'}
                    </button>
                  </div>
                </div>
                <textarea
                  value={formData.basePrompt}
                  onChange={(e) => setFormData({ ...formData, basePrompt: e.target.value })}
                  className="flex-1 w-full p-4 bg-[var(--color-background-secondary)] border border-[var(--color-border)] text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-none font-mono text-sm resize-none rounded-lg leading-relaxed"
                  placeholder="You are an expert AI assistant..."
                />
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase mb-2 flex items-center gap-2">
                  <Code size={12} /> Tool Prompts (Auto-Injected)
                </h3>
                <p className="text-[10px] text-[var(--color-text-muted)]">
                    These prompts are automatically injected into the agent&apos;s system prompt when the corresponding tools are enabled.
                </p>
                {Object.keys(toolPrompts).length === 0 ? (
                    <div className="p-4 text-center text-[var(--color-text-muted)] border border-[var(--color-border)] border-dashed rounded">
                        No tools selected or no documentation available.
                    </div>
                ) : (
                    Object.entries(toolPrompts).map(([tool, prompt]) => (
                        <div key={tool} className="border border-[var(--color-border)] rounded overflow-hidden">
                            <div className="bg-[var(--color-background-secondary)] px-3 py-2 text-xs font-bold text-[var(--color-text)] uppercase border-b border-[var(--color-border)] flex justify-between items-center">
                                <span>{tool}</span>
                                <button
                                    onClick={() => {
                                        void (async () => {
                                            try {
                                                await updateToolExamplesMutation.mutateAsync({
                                                    toolName: tool,
                                                    content: prompt
                                                });
                                                alert(`Saved prompt for tool: ${tool}`);
                                            } catch (e) {
                                                console.error("Failed to save tool prompt:", e);
                                                alert("Failed to save tool prompt.");
                                            }
                                        })();
                                    }}
                                    className="px-2 py-0.5 bg-[var(--color-secondary)]/30 border border-[var(--color-secondary)] text-[var(--color-secondary)] hover:bg-[var(--color-secondary)]/50 hover:text-white transition-all uppercase text-[10px] font-bold rounded"
                                >
                                    Save
                                </button>
                            </div>
                            <div className="p-0 bg-[var(--color-background-secondary)]/50">
                                <textarea
                                    value={prompt}
                                    onChange={(e) => setToolPrompts(prev => ({ ...prev, [tool]: e.target.value }))}
                                    className="w-full h-64 p-3 bg-transparent text-[10px] text-[var(--color-text-muted)] font-mono resize-none focus:outline-none focus:bg-[var(--color-background-secondary)]/50 transition-colors"
                                />
                            </div>
                        </div>
                    ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Parameters (40%) */}
        <div className="w-[40%] flex flex-col bg-[var(--color-background-secondary)]/30 overflow-hidden">
          {/* Tab Headers */}
          <div className="flex border-b border-[var(--color-border)]">
            <button
              onClick={() => setRightTab('capabilities')}
              className={`flex-1 py-2 text-xs font-bold uppercase ${rightTab === 'capabilities' ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
            >
              Capabilities
            </button>
            <button
              onClick={() => setRightTab('orchestration')}
              className={`flex-1 py-2 text-xs font-bold uppercase ${rightTab === 'orchestration' ? 'text-[var(--color-secondary)] border-b-2 border-[var(--color-secondary)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
            >
              Orchestration
            </button>
            <button
              onClick={() => setRightTab('assignments')}
              className={`flex-1 py-2 text-xs font-bold uppercase ${rightTab === 'assignments' ? 'text-[var(--color-accent)] border-b-2 border-[var(--color-accent)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
            >
              Assignments
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {rightTab === 'assignments' ? (
              <div className="space-y-4">
                <h3 className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase mb-2">
                  Assign Role to Card Components
                </h3>
                <p className="text-[10px] text-[var(--color-text-muted)] mb-4">
                  Assign this role to specific components in work cards. The component will use this role for operations.
                </p>
                
                <div className="space-y-2">
                  {[
                    { id: 'terminal', name: 'Terminal', desc: 'Execute commands with this role' },
                    { id: 'fileSystem', name: 'File System', desc: 'File operations with this role' },
                    { id: 'monacoEditor', name: 'Monaco Editor', desc: 'Code editing assistance' },
                    { id: 'tiptapEditor', name: 'Tiptap Editor', desc: 'Text editing assistance' },
                    { id: 'browser', name: 'Browser', desc: 'Web research with this role' },
                    { id: 'sqlAssistant', name: 'SQL Assistant', desc: 'SQL Query generation assistance' }
                  ].map((component) => (
                    <div key={component.id} className="border border-[var(--color-border)] rounded p-2 bg-[var(--color-background-secondary)]/50">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-[var(--color-text)]">{component.name}</div>
                          <div className="text-[9px] text-[var(--color-text-muted)]">{component.desc}</div>
                        </div>
                        <button className="px-2 py-1 bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/80 text-[var(--color-background)] rounded text-[10px] font-bold uppercase tracking-wider transition-all shadow-[0_0_10px_rgba(var(--color-accent-rgb),0.4)] active:scale-95">
                          Assign
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* --- MODEL OVERRIDE INTEGRATION --- */}
                {selectedRole && (
                  <div className="mt-4 border-t border-[var(--color-border)] pt-4">
                    <RoleModelOverride role={selectedRole as any} />
                  </div>
                )}

                <div className="mt-4 border-t border-[var(--color-border)] pt-4">
                  <div className="p-3 bg-[var(--color-secondary)]/10 border border-[var(--color-secondary)]/50 rounded">
                    <h3 className="text-[10px] font-bold text-[var(--color-secondary)] uppercase mb-1 flex items-center gap-2">
                      <Wrench size={12} /> Button Creation Tool
                    </h3>
                    <p className="text-[9px] text-[var(--color-text-muted)]">
                      Button creation is available as a tool that AI agents can use. Enable the <span className="text-[var(--color-warning)] font-bold">create_button</span> tool in the Tools section above to allow agents to create custom action buttons for cards.
                    </p>
                  </div>
                </div>
              </div>
            ) : rightTab === 'capabilities' ? (
              <>
                {/* Capabilities */}
                <div>
                  <h3 className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase mb-2 flex items-center gap-2">
                    <Brain size={12} /> Capabilities
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { key: 'needsVision', label: 'Vision', icon: Eye, color: 'blue' },
                      { key: 'needsReasoning', label: 'Reasoning', icon: Brain, color: 'purple' },
                      { key: 'needsCoding', label: 'Coding', icon: Code, color: 'green' },
                      { key: 'needsTools', label: 'Tools', icon: Wrench, color: 'orange' },
                      { key: 'needsJson', label: 'JSON', icon: FileJson, color: 'yellow' },
                      { key: 'needsUncensored', label: 'Uncensored', icon: Skull, color: 'red' },
                      { key: 'needsImageGeneration', label: 'Image Gen', icon: Eye, color: 'pink' },
                    ].map(({ key, label, icon: Icon, color }) => (
                      <label key={key} className={`flex items-center gap-2 p-2 border rounded cursor-pointer transition-all ${
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        (formData as any)[key]
                          ? `border-${color}-500 bg-${color}-900/10 text-${color}-300 shadow-[0_0_10px_rgba(0,0,0,0.5)] shadow-${color}-500/20` 
                          : 'border-[var(--color-border)] hover:border-[var(--color-text-muted)] text-[var(--color-text-muted)]'
                      }`}>
                        <input
                          type="checkbox"
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          checked={(formData as any)[key]}
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          onChange={(e) => setFormData({ ...formData, [key]: e.target.checked })}
                          className="hidden"
                        />
                        <Icon size={14} className={
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          (formData as any)[key] ? `text-${color}-400` : 'text-[var(--color-text-muted)]'
                        } />
                        <span className="font-bold uppercase text-[10px]">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                
                {/* Tools Selection - Compact Multi-Select */}
                <div>
                  <h3 className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase mb-2 flex items-center gap-2">
                    <Wrench size={12} /> Tools ({formData.tools.length} selected)
                  </h3>
                  <div className="border border-[var(--color-border)] rounded bg-[var(--color-background-secondary)]/50 max-h-32 overflow-y-auto">
                    <div className="p-2 space-y-1">
                      {/* Manual Meta Tool Option */}
                      <label className="flex items-center gap-2 p-1 hover:bg-[var(--color-background-secondary)] rounded cursor-pointer transition-all text-[10px]">
                        <input
                          type="checkbox"
                          checked={formData.tools.includes('meta')}
                          onChange={(e) => {
                            const newTools = e.target.checked
                              ? [...formData.tools, 'meta']
                              : formData.tools.filter(t => t !== 'meta');
                            setFormData({ ...formData, tools: newTools, needsTools: newTools.length > 0 });
                          }}
                          className="w-3 h-3 rounded border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-error)] focus:ring-[var(--color-error)]"
                        />
                        <span className={`font-bold uppercase ${formData.tools.includes('meta') ? 'text-[var(--color-error)]' : 'text-[var(--color-text-muted)]'}`}>SYSTEM: META CONTROL</span>
                      </label>

                      {toolsList?.map((tool) => (
                        <label key={tool.name} className="flex items-center gap-2 p-1 hover:bg-[var(--color-background-secondary)] rounded cursor-pointer transition-all text-[10px]">
                          <input
                            type="checkbox"
                            checked={formData.tools.includes(tool.name)}
                            onChange={(e) => {
                              void (async () => {
                                  const checked = e.target.checked;
                                  const toolName = tool.name;
                                  
                                  const newTools = checked
                                    ? [...formData.tools, toolName]
                                    : formData.tools.filter(t => t !== toolName);
                                  
                                  setFormData(prev => ({ ...prev, tools: newTools, needsTools: newTools.length > 0 }));

                                  if (checked) {
                                     try {
                                       // Fetch examples and inject
                                       const result = await utils.orchestrator.getToolExamples.fetch({ toolName });
                                       if (result && result.content) {
                                           setToolPrompts(prev => ({
                                               ...prev,
                                               [toolName]: result.content
                                           }));
                                       }
                                     } catch (err) {
                                       console.error("Failed to fetch tool examples:", err);
                                     }
                                  } else {
                                      setToolPrompts(prev => {
                                          const newState = { ...prev };
                                          delete newState[toolName];
                                          return newState;
                                      });
                                  }
                              })();
                            }}
                            className="w-3 h-3 rounded border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-warning)] focus:ring-[var(--color-warning)]"
                          />
                          <span className={`font-bold uppercase ${formData.tools.includes(tool.name) ? 'text-[var(--color-warning)]' : 'text-[var(--color-text-muted)]'}`}>{tool.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Context Window */}
                <div className="border border-[var(--color-border)] p-3 bg-[var(--color-background-secondary)]/50 rounded">
                   <DualRangeSlider
                      min={0}
                      max={200000}
                      step={1000}
                      value={[formData.minContext || 0, formData.maxContext || 128000]}
                      onChange={(val) => setFormData({ ...formData, minContext: val[0], maxContext: val[1] })}
                      label="Context Window"
                      unit="T"
                    />
                </div>

                {/* Dynamic Sliders (Param Size, Cost, etc) */}
                {renderDynamicInputs()}

                {/* Provider Breakdown Table */}
                <div className="pt-4 border-t border-[var(--color-border)]">
                   <div className="flex justify-between items-end mb-2">
                     <div className="flex gap-1 flex-wrap">
                        {['chat', 'embedding', 'coding', 'tts', 'image'].map(type => (
                          <button
                            key={type}
                            onClick={() => {
                              if (selectedTypes.includes(type)) {
                                 if (selectedTypes.length > 1) setSelectedTypes(selectedTypes.filter(t => t !== type));
                              } else {
                                 setSelectedTypes([...selectedTypes, type]);
                              }
                            }}
                            className={`px-2 py-0.5 text-[10px] uppercase font-bold border rounded transition-all ${
                              selectedTypes.includes(type) 
                                ? 'bg-[var(--color-primary)]/50 border-[var(--color-primary)] text-white' 
                                : 'bg-transparent border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-text-secondary)]'
                            }`}
                          >
                            {type}
                          </button>
                        ))}
                        <button
                          onClick={() => {
                            if (confirm("Run Model Doctor? This will scan all models and infer their specs.")) {
                                runDoctorMutation.mutate({ force: false });
                            }
                          }}
                          disabled={runDoctorMutation.isLoading}
                          className="px-2 py-0.5 bg-purple-600 text-white text-[10px] font-bold rounded hover:bg-purple-500 transition-all ml-2"
                        >
                          {runDoctorMutation.isLoading ? 'HEALING...' : 'RUN DOCTOR'}
                        </button>
                     </div>
                     <span className="text-xl font-bold text-[var(--color-text)]">{filteredModels.length} <span className="text-xs text-[var(--color-text-muted)] font-normal">TOTAL</span></span>
                   </div>
                   
                   <div className="border border-[var(--color-border)] rounded overflow-hidden">
                     <table className="w-full text-left text-[10px]">
                       <thead className="bg-[var(--color-background-secondary)] text-[var(--color-text-muted)] uppercase">
                         <tr>
                           <th className="p-2">Datacenter</th>
                           <th className="p-2 text-right">Match</th>
                           <th className="p-2 text-right">Total</th>
                           <th className="p-2 text-right">%</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-[var(--color-border)]">
                         {Object.entries(datacenterBreakdown)
                           .sort(([, a], [, b]) => b.matched - a.matched)
                           .map(([datacenter, stats]) => {
                             const percent = Math.round((stats.matched / stats.total) * 100);
                             return (
                               <tr key={datacenter} className={stats.matched > 0 ? 'bg-[var(--color-background-secondary)]/20' : 'opacity-50'}>
                                 <td className="p-2 font-bold text-[var(--color-text-secondary)]">{datacenter}</td>
                                 <td className="p-2 text-right text-[var(--color-success)] font-bold">{stats.matched}</td>
                                 <td className="p-2 text-right text-[var(--color-text-muted)]">{stats.total}</td>
                                 <td className="p-2 text-right">
                                    <div className="w-12 h-1.5 bg-[var(--color-background)] rounded-full ml-auto overflow-hidden">
                                      <div className="h-full bg-[var(--color-success)]" style={{ width: `${percent}%` }}></div>
                                    </div>
                                 </td>
                               </tr>
                             );
                         })}
                       </tbody>
                     </table>
                   </div>
                </div>
              </>
            ) : (
              <div className="space-y-6">
                {/* TASK 3: Orchestration Config */}
                <div>
                  <h3 className="text-[10px] font-bold text-[var(--color-text-secondary)] uppercase mb-2 flex items-center gap-2">
                    <Shield size={12} /> Quality Control (Judge)
                  </h3>
                  <div className="border border-gray-800 p-3 bg-gray-950/50 rounded space-y-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.orchestrationConfig.requiresCheck}
                        onChange={(e) => setFormData({
                          ...formData,
                          orchestrationConfig: { ...formData.orchestrationConfig, requiresCheck: e.target.checked }
                        })}
                        className="rounded border-gray-700 bg-gray-900 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="text-gray-300 font-bold">Require Judge Verification</span>
                    </label>
                    
                    {formData.orchestrationConfig.requiresCheck && (
                      <div className="pl-6 space-y-2">
                         <div>
                            <label className="block text-[10px] text-[var(--color-text-secondary)] mb-1">Judge Role</label>
                            <select
                              value={formData.orchestrationConfig.judgeRoleId || ''}
                              onChange={(e) => setFormData({
                                ...formData,
                                orchestrationConfig: { ...formData.orchestrationConfig, judgeRoleId: e.target.value }
                              })}
                              className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-gray-300 text-xs focus:outline-none focus:border-purple-500"
                            >
                              <option value="">Select a Judge...</option>
                              {roles?.filter(r => r.id !== selectedRoleId).map(r => (
                                <option key={r.id} value={r.id}>{r.name}</option>
                              ))}
                            </select>
                         </div>
                         <div>
                            <label className="block text-[10px] text-[var(--color-text-secondary)] mb-1">Min Pass Score ({formData.orchestrationConfig.minPassScore})</label>
                            <input 
                              type="range" 
                              min="0" max="100" 
                              value={formData.orchestrationConfig.minPassScore}
                              onChange={(e) => setFormData({
                                ...formData,
                                orchestrationConfig: { ...formData.orchestrationConfig, minPassScore: parseInt(e.target.value) }
                              })}
                              className="w-full"
                            />
                         </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* TASK 3: Memory Config */}
                <div>
                  <h3 className="text-[10px] font-bold text-[var(--color-text-secondary)] uppercase mb-2 flex items-center gap-2">
                    <Database size={12} /> Long-Term Memory (Librarian)
                  </h3>
                  <div className="border border-gray-800 p-3 bg-gray-950/50 rounded space-y-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.memoryConfig.useProjectMemory}
                        onChange={(e) => setFormData({
                          ...formData,
                          memoryConfig: { ...formData.memoryConfig, useProjectMemory: e.target.checked }
                        })}
                        className="rounded border-gray-700 bg-gray-900 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-gray-300 font-bold">Enable Project Memory</span>
                    </label>
                    
                    {formData.memoryConfig.useProjectMemory && (
                       <label className="flex items-center gap-2 cursor-pointer pl-6">
                        <input
                          type="checkbox"
                          checked={formData.memoryConfig.readOnly}
                          onChange={(e) => setFormData({
                            ...formData,
                            memoryConfig: { ...formData.memoryConfig, readOnly: e.target.checked }
                          })}
                          className="rounded border-gray-700 bg-gray-900 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-[var(--color-text-secondary)]">Read-Only (Do not learn new lessons)</span>
                      </label>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoleCreatorPanel;
