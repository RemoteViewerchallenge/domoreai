import React, { useState, useMemo } from 'react';
import { trpc } from '../../utils/trpc.js';
import DualRangeSlider from '../../../NUI/ui/DualRangeSlider.js';
import { RoleModelOverride } from '../../components/creator-studio/RoleModelOverride.js';
import { RoleVfsContextSelector } from '../../components/creator-studio/RoleVfsContextSelector.js';
import { Save, Trash2, Brain, Eye, Code, Wrench, FileJson, Skull, Sparkles, Shield, Database, ChevronDown, ChevronRight, CheckCircle } from 'lucide-react';
import { useEffect } from 'react';
import { AiButton } from '../../../NUI/ui/AiButton.js';

interface Role {
  id: string;
  name: string;
  basePrompt: string;
  category: string; // Ensure category is always a string
  minContext?: number | null;
  maxContext?: number | null;
  needsVision: boolean;
  needsReasoning: boolean;
  needsCoding: boolean;
  needsTools: boolean;
  needsJson: boolean;
  needsUncensored: boolean;
  needsImageGeneration?: boolean;
  tools?: string[];
  defaultTemperature?: number | null;
  defaultMaxTokens?: number | null;
  defaultTopP?: number | null;
  defaultFrequencyPenalty?: number | null;
  defaultPresencePenalty?: number | null;
  defaultStop?: unknown;
  defaultSeed?: number | null;
  defaultResponseFormat?: unknown;
  terminalRestrictions?: unknown;
  criteria?: unknown;
  orchestrationConfig?: { requiresCheck: boolean; judgeRoleId?: string; minPassScore: number } | unknown;
  memoryConfig?: { useProjectMemory: boolean; readOnly: boolean } | unknown;
  vfsConfig?: { selectedPaths: string[]; maxFileSize?: number; excludePatterns?: string[] } | unknown;
}

interface RoleCreatorPanelProps {
  className?: string;
}

const RoleCreatorPanel: React.FC<RoleCreatorPanelProps> = ({ className = '' }) => {
  const utils = trpc.useContext();
  const { data: roles } = trpc.role.list.useQuery();
  
  // Fetch Active Registry Data (Schema + Rows)
  const { data: registrySchema } = trpc.orchestrator.getActiveRegistrySchema.useQuery();
  const { data: registryData } = trpc.orchestrator.getActiveRegistryData.useQuery();
  const { data: toolsList } = trpc.orchestrator.listTools.useQuery();

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

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
  const generatePromptMutation = trpc.role.generatePrompt.useMutation();
  const updateToolExamplesMutation = trpc.orchestrator.updateToolExamples.useMutation();
  const runDoctorMutation = trpc.model.runDoctor.useMutation();

  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    basePrompt: '',
    category: '', // Add category to formData
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
    vfsConfig: undefined as { selectedPaths: string[]; maxFileSize?: number; excludePatterns?: string[] } | undefined,
  });

  const [leftTab, setLeftTab] = useState<'params' | 'toolPrompts'>('params');
  const [rightTab, setRightTab] = useState<'capabilities' | 'orchestration' | 'assignments' | 'vfsContext'>('capabilities');
  
  const [toolPrompts, setToolPrompts] = useState<Record<string, string>>({});
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});
  const [isNewCategory, setIsNewCategory] = useState<boolean>(false);

  const uniqueCategories = useMemo(() => {
    const categories = new Set<string>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (roles as any[])?.forEach(role => {
      if (role.category) categories.add(role.category);
    });
    return Array.from(categories).sort();
  }, [roles]);

  // Memoize grouped roles for performance and to ensure categories are processed consistently
  const groupedRoles = useMemo(() => {
    if (!roles) return {};
    const groups: Record<string, Role[]> = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (roles as any[])?.forEach(role => {
      const category = role.category || 'Uncategorized';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(role as Role);
    });
    // Sort roles within each category alphabetically
    Object.keys(groups).forEach(category => {
      groups[category].sort((a, b) => a.name.localeCompare(b.name));
    });
    return groups;
  }, [roles]);

  // Memoize the currently selected role object for passing to child components
  const selectedRole = useMemo(() => {
    if (!selectedRoleId || !roles) return null;
    return (roles as Role[]).find(r => r.id === selectedRoleId);
  }, [selectedRoleId, roles]);

  // ... (useEffect removed) ...

  // ... (Tasks 1 & 2) ...

  // --- DYNAMIC LOGIC ---

  // 1. Calculate Min/Max for Numeric Columns
  const columnStats = useMemo(() => {
    if (!registryData?.rows || !registrySchema?.columns) return {};
    const stats: Record<string, { min: number, max: number }> = {};
    
    registrySchema.columns.forEach(col => {
      const isNumber = ['integer', 'int', 'bigint', 'numeric', 'real', 'double precision'].includes(col.type);
      if (isNumber) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const values = registryData.rows.map((r: any) => Number(r[col.name])).filter(n => !isNaN(n));
        if (values.length > 0) {
          stats[col.name] = { min: Math.min(...values), max: Math.max(...values) };
        }
      }
    });
    return stats;
  }, [registryData, registrySchema]);

  // 2. Filter Models based on Criteria AND Capabilities
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['chat']);

  const filteredModels = useMemo(() => {
    if (!registryData?.rows) return [];
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return registryData.rows.filter((row: any) => {
      // RELAXED TYPE CHECK:
      const rowType = (row.type || row.model_type || 'chat').toLowerCase(); 
      
      // Allow if ANY selected type matches part of the row type string
      // e.g. selected=['tts'] matches rowType='text-to-speech'
      const typeMatch = selectedTypes.some(t => rowType.includes(t.toLowerCase()));

      // If 'chat' is selected, include 'text-generation' and models with NO type
      if (selectedTypes.includes('chat') && (rowType === 'text-generation' || !row.type)) {
          // keep it
      } else if (!typeMatch) {
          return false;
      }

      // Check standard context window
      const contextCol = Object.keys(row).find(k => k.includes('context') || k.includes('window'));
      if (contextCol) {
        const val = Number(row[contextCol]);
        if (val < (formData.minContext || 0) || val > (formData.maxContext || 128000)) return false;
      }

      // Check Capabilities (Explicit Mapping)
      if (formData.needsVision && (row['is_vision'] === false || row['vision'] === false || row['is_multimodal'] === false)) return false;
      if (formData.needsReasoning && row['is_reason'] === false) return false;
      if (formData.needsCoding && row['is_code'] === false) return false;
      if (formData.needsTools && row['supports_tools'] === false) return false;
      if (formData.needsJson && row['supports_json'] === false) return false;
      if (formData.needsUncensored && row['is_uncensored'] === false) return false;
      
      // Image Generation Check
      // We check multiple possible column names for image generation capability
      const hasImageGen = row['has_image_generation'] === true || row['is_image_generation'] === true || row['is_gen'] === true;
      if (formData.needsImageGeneration && !hasImageGen) return false;
      if (!formData.needsImageGeneration && hasImageGen) return false; // Exclude image models if not requested

      // Check Dynamic Criteria (Sliders)
      for (const [key, value] of Object.entries(formData.criteria)) {
        if (value === undefined || value === null) continue;

        // Boolean Check (if mapped to criteria)
        if (typeof value === 'boolean' && value === true) {
          if (!row[key]) return false;
        }

        // Range Check (Array [min, max])
        if (Array.isArray(value) && value.length === 2) {
          const rowVal = Number(row[key]);
          if (rowVal < value[0] || rowVal > value[1]) return false;
        }
      }
      return true;
    });
  }, [registryData, formData, selectedTypes]);

  // 3. Provider Breakdown
  const providerBreakdown = useMemo(() => {
    const stats: Record<string, { matched: number, total: number }> = {};
    
    // Initialize totals
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    registryData?.rows.forEach((row: any) => {
       const provider = row.provider_name || row.data_source || row.provider_id || row.provider || 'Unknown';
       if (!stats[provider]) stats[provider] = { matched: 0, total: 0 };
       stats[provider].total++;
    });

    // Calculate matched
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    filteredModels.forEach((m: any) => {
      const provider = m.provider_name || m.data_source || m.provider_id || m.provider || 'Unknown';
      if (stats[provider]) stats[provider].matched++;
    });

    return stats;
  }, [registryData, filteredModels]);

  const handleSave = () => {
    setSaveStatus('saving');
    if (selectedRoleId) {
      updateRoleMutation.mutate({
        id: selectedRoleId,
        name: formData.name,
        basePrompt: formData.basePrompt,
        category: formData.category || 'Uncategorized',
        minContext: formData.minContext,
        maxContext: formData.maxContext,
        needsVision: formData.needsVision,
        needsReasoning: formData.needsReasoning,
        needsCoding: formData.needsCoding,
        needsTools: formData.needsTools,
        needsJson: formData.needsJson,
        needsUncensored: formData.needsUncensored,
        // needsImageGeneration: formData.needsImageGeneration, // Removed as it's not in the schema yet
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
        vfsConfig: formData.vfsConfig,
      });
    } else {
      createRoleMutation.mutate({
        ...formData,
        category: formData.category || 'Uncategorized',
      });
    }
  };

  const handleMagicGenerate = async () => {
    if (!formData.name) {
        alert("Please enter a role name first.");
        return;
    }
    try {
        const result = await generatePromptMutation.mutateAsync({
            name: formData.name,
            category: formData.category,
            capabilities: {
                vision: formData.needsVision,
                reasoning: formData.needsReasoning,
                coding: formData.needsCoding,
                tools: formData.needsTools,
            }
        });
        if (result) {
            setFormData(prev => ({ ...prev, basePrompt: result }));
        }
    } catch (error) {
        console.error("Failed to generate prompt:", error);
        alert("Failed to generate prompt. Please try again.");
    }
  };

  const handleSelectRole = async (role: Role) => {
    setSelectedRoleId(role.id);
    const tools = role.tools || [];
    
    // Set isNewCategory based on if the role has a category
    setIsNewCategory(!role.category);

    setFormData({
      name: role.name,
      basePrompt: role.basePrompt,
      category: role.category || '',
      minContext: role.minContext || 0, // Added minContext
      maxContext: role.maxContext || 128000, // Added maxContext
      needsVision: role.needsVision,
      needsReasoning: role.needsReasoning,
      needsCoding: role.needsCoding,
      needsTools: role.needsTools || false,
      needsJson: role.needsJson || false,
      needsUncensored: role.needsUncensored || false,
      needsImageGeneration: role.needsImageGeneration || false,
      tools: tools,
      defaultTemperature: role.defaultTemperature || 0.7,
      defaultMaxTokens: role.defaultMaxTokens || 2048,
      defaultTopP: role.defaultTopP || 1.0,
      defaultFrequencyPenalty: role.defaultFrequencyPenalty || 0.0,
      defaultPresencePenalty: role.defaultPresencePenalty || 0.0,
      defaultStop: Array.isArray(role.defaultStop) ? role.defaultStop : [],
      defaultSeed: role.defaultSeed || undefined,
      defaultResponseFormat: (role.defaultResponseFormat as 'text' | 'json_object') || 'text',
      terminalRestrictions: (role.terminalRestrictions && typeof role.terminalRestrictions === 'object' && !Array.isArray(role.terminalRestrictions)) 
        ? role.terminalRestrictions as { mode: 'whitelist' | 'blacklist' | 'unrestricted'; commands: string[] }
        : { mode: 'blacklist', commands: ['rm', 'sudo'] },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      criteria: (role.criteria as Record<string, any>) || {},
      orchestrationConfig: (role.orchestrationConfig && typeof role.orchestrationConfig === 'object') ? {
        requiresCheck: (role.orchestrationConfig as any).requiresCheck || false,
        minPassScore: (role.orchestrationConfig as any).minPassScore || 80,
        judgeRoleId: (role.orchestrationConfig as any).judgeRoleId
      } : { requiresCheck: false, judgeRoleId: undefined, minPassScore: 80 },
      memoryConfig: (role.memoryConfig && typeof role.memoryConfig === 'object') ? {
        useProjectMemory: (role.memoryConfig as any).useProjectMemory || false,
        readOnly: (role.memoryConfig as any).readOnly || false
      } : { useProjectMemory: false, readOnly: false },
      vfsConfig: (role.vfsConfig && typeof role.vfsConfig === 'object') ? {
        selectedPaths: (role.vfsConfig as any).selectedPaths || [],
        maxFileSize: (role.vfsConfig as any).maxFileSize,
        excludePatterns: (role.vfsConfig as any).excludePatterns || []
      } : undefined,
    });

    // Fetch prompts for all tools
    const newToolPrompts: Record<string, string> = {};
    for (const toolName of tools) {
        if (toolName === 'meta') continue;
        try {
            const result = await utils.orchestrator.getToolExamples.fetch({ toolName });
            if (result && result.content) {
                newToolPrompts[toolName] = result.content;
            }
        } catch (err) {
            console.error(`Failed to fetch prompt for tool ${toolName}:`, err);
        }
    }
    setToolPrompts(newToolPrompts);
  };

  // Helper to render dynamic inputs
  const renderDynamicInputs = () => {
    if (!registrySchema?.columns) return null;

    // Columns explicitly handled by other UI elements or ignored
    const handledOrIgnored = [
      'id', 'name', 'model_id', 'provider_id', 'created_at', 'updated_at', 
      'context_length', 'context_window', // Main slider
      'is_vision', 'is_code', 'is_reason', 'supports_tools', 'supports_json', 'is_uncensored', // Capabilities
      'max_rpm', 'max_tpm', 'max_rpd', 'max_output_tokens', 'data_source', // Ignored
      'param_status', 'is_code_unk', 'is_reason_unk', 'underlying_provider', 'supported_params', 'has_image_generation', 'param_size_status', 'is_coding_unknown', 'is_reasoning_unknown', 'is_gen', 'is_free', 'supports_rag', // Ignored/Unknown
      'rate_limited', 'rate_limits_known', 'rate_limit_rpm', 'rate_limit_tpm', 'is_open_source', 'cost_tier', 'model_name', 'provider', 'type', 'vision', 'is_multimodal' // New Schema Ignored for Sliders
    ];
    
    // We specifically want sliders for these if they exist
    const sliderColumns = ['param_size', 'cost', 'risk_conf'];
    
    const dynamicColumns = registrySchema.columns.filter(col => 
      !handledOrIgnored.includes(col.name.toLowerCase()) || sliderColumns.includes(col.name.toLowerCase())
    );

    if (dynamicColumns.length === 0) return null;

    return (
      <div className="space-y-4">
        {dynamicColumns.map((col) => {
          const isNumber = ['integer', 'int', 'bigint', 'numeric', 'real', 'double precision'].includes(col.type);
          
          if (isNumber) {
            const stats = columnStats[col.name] || { min: 0, max: 100 };
            const currentVal = (formData.criteria[col.name] as [number, number]) || [stats.min, stats.max];

            return (
              <div key={col.name} className="border border-[var(--color-border)] p-2 bg-[var(--color-background-secondary)]/50 rounded">
                 <DualRangeSlider
                  min={stats.min}
                  max={stats.max}
                  step={stats.max > 1000 ? 100 : (stats.max < 10 ? 0.01 : 1)}
                  value={currentVal}
                  onChange={(val) => setFormData({
                    ...formData,
                    criteria: { ...formData.criteria, [col.name]: val }
                  })}
                  label={col.name.replace(/_/g, ' ')}
                />
              </div>
            );
          }
          return null;
        })}
      </div>
    );
  };

  return (
    <div className={`flex bg-[var(--color-background)] text-[var(--color-text)] font-mono text-xs h-full ${className}`}>
      {/* Sidebar List */}
      <div className="w-48 bg-[var(--color-background-secondary)] border-r border-[var(--color-border)] flex flex-col flex-shrink-0">
        <div className="p-2 border-b border-[var(--color-border)] flex justify-between items-center">
          <span className="font-bold text-[var(--color-primary)] uppercase tracking-wider">Roles (v2)</span>
          <button 
            onClick={() => {
              setSelectedRoleId(null);
              setIsNewCategory(true); // Always start with new category input for new roles
              setFormData({
                name: '',
                basePrompt: '',
                category: '', // Empty category for new roles
                minContext: 0,
                maxContext: 128000,
                needsVision: false,
                needsReasoning: false,
                needsCoding: false,
                needsTools: false,
                needsJson: false,
                needsUncensored: false,
                needsImageGeneration: false,
                tools: [],
                defaultTemperature: 0.7,
                defaultMaxTokens: 2048,
                defaultTopP: 1.0,
                defaultFrequencyPenalty: 0.0,
                defaultPresencePenalty: 0.0,
                defaultStop: [],
                defaultSeed: undefined,
                defaultResponseFormat: 'text',
                terminalRestrictions: { mode: 'blacklist', commands: ['rm', 'sudo', 'dd', 'mkfs', 'shutdown', 'reboot'] },
                criteria: {},
                orchestrationConfig: { requiresCheck: false, judgeRoleId: undefined, minPassScore: 80 },
                memoryConfig: { useProjectMemory: false, readOnly: false },
              });
            }}
            className="px-2 py-0.5 bg-[var(--color-secondary)]/30 border border-[var(--color-secondary)] text-[var(--color-secondary)] hover:bg-[var(--color-secondary)]/50 hover:text-white transition-all uppercase text-[10px] font-bold"
          >
            + New
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {Object.entries(groupedRoles).map(([category, rolesInCategory]) => (
            <div key={category} className="border-b border-[var(--color-border)] last:border-b-0">
              <button
                onClick={() => {
                    console.log('Toggling category:', category);
                    setOpenCategories(prev => ({ ...prev, [category]: !prev[category] }));
                }}
                className="flex justify-between items-center w-full p-2 bg-[var(--color-background-secondary)] hover:bg-[var(--color-background-secondary)]/70 transition-colors"
              >
                <span className="font-bold text-[var(--color-primary)] uppercase tracking-wider text-[10px]">{category}</span>
                {openCategories[category] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
              {openCategories[category] && (
                <div>
                  {rolesInCategory.map((role) => (
                    <div
                      key={role.id}
                      onClick={() => { void handleSelectRole(role); }}
                      className={`p-2 pl-4 cursor-pointer hover:bg-[var(--color-background-secondary)] transition-colors ${
                        selectedRoleId === role.id ? 'bg-[var(--color-primary)]/20 border-l-2 border-l-[var(--color-primary)]' : 'border-l-2 border-l-transparent'
                      }`}
                    >
                      <div className="font-bold text-[var(--color-text)] truncate">{role.name}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
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
                    <AiButton 
                      source={{ type: 'role', roleId: selectedRoleId }}
                    />
                  )}
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
            <button
              onClick={() => setRightTab('vfsContext')}
              className={`flex-1 py-2 text-xs font-bold uppercase ${rightTab === 'vfsContext' ? 'text-green-500 border-b-2 border-green-500' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
            >
              VFS Context
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {rightTab === 'vfsContext' ? (
              <div className="space-y-4">
                <h3 className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase mb-2">
                  VFS Context Configuration
                </h3>
                <p className="text-[10px] text-[var(--color-text-muted)] mb-4">
                  Configure which files and directories should be included in this role&apos;s context when executing tasks.
                </p>
                <RoleVfsContextSelector
                  roleId={selectedRoleId || undefined}
                  initialConfig={formData.vfsConfig}
                  onChange={(config) => setFormData({ ...formData, vfsConfig: config })}
                />
              </div>
            ) : rightTab === 'assignments' ? (
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
                           <th className="p-2">Provider</th>
                           <th className="p-2 text-right">Match</th>
                           <th className="p-2 text-right">Total</th>
                           <th className="p-2 text-right">%</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-[var(--color-border)]">
                         {Object.entries(providerBreakdown)
                           .sort(([, a], [, b]) => b.matched - a.matched)
                           .map(([provider, stats]) => {
                             const percent = Math.round((stats.matched / stats.total) * 100);
                             return (
                               <tr key={provider} className={stats.matched > 0 ? 'bg-[var(--color-background-secondary)]/20' : 'opacity-50'}>
                                 <td className="p-2 font-bold text-[var(--color-text-secondary)]">{provider}</td>
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
            ) : rightTab === 'orchestration' ? (
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
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoleCreatorPanel;
