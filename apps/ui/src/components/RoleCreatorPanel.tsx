import React, { useState, useMemo } from 'react';
import { trpc } from '../utils/trpc.js';
import DualRangeSlider from './DualRangeSlider.js';
import { Save, Trash2, Brain, Eye, Code, Wrench, FileJson, Skull } from 'lucide-react';

interface Role {
  id: string;
  name: string;
  basePrompt: string;
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

  const createRoleMutation = trpc.role.create.useMutation({
    onSuccess: () => utils.role.list.invalidate(),
  });
  const updateRoleMutation = trpc.role.update.useMutation({
    onSuccess: () => utils.role.list.invalidate(),
  });
  const deleteRoleMutation = trpc.role.delete.useMutation({
    onSuccess: () => utils.role.list.invalidate(),
  });

  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    basePrompt: '',
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
  });

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
      // Check Type (Default to 'chat' if unknown, unless explicit type column exists)
      // We assume 'type' column exists or we infer it.
      const rowType = row.type || row.model_type || 'chat'; 
      // If rowType is an array (some dbs), check intersection, else check inclusion
      const typeMatch = Array.isArray(rowType) 
        ? rowType.some((t: string) => selectedTypes.includes(t))
        : selectedTypes.includes(rowType);

      if (!typeMatch) return false;

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
       const provider = row.data_source || row.provider_id || row.provider || 'Unknown';
       if (!stats[provider]) stats[provider] = { matched: 0, total: 0 };
       stats[provider].total++;
    });

    // Calculate matched
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    filteredModels.forEach((m: any) => {
      const provider = m.data_source || m.provider_id || m.provider || 'Unknown';
      if (stats[provider]) stats[provider].matched++;
    });

    return stats;
  }, [registryData, filteredModels]);


  const handleSave = () => {
    if (selectedRoleId) {
      updateRoleMutation.mutate({
        id: selectedRoleId,
        ...formData,
      });
    } else {
      createRoleMutation.mutate(formData);
    }
  };

  const handleSelectRole = (role: Role) => {
    setSelectedRoleId(role.id);
    setFormData({
      name: role.name,
      basePrompt: role.basePrompt,
      minContext: role.minContext || 0,
      maxContext: role.maxContext || 128000,
      needsVision: role.needsVision,
      needsReasoning: role.needsReasoning,
      needsCoding: role.needsCoding,
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
      defaultStop: Array.isArray(role.defaultStop) ? role.defaultStop : [],
      defaultSeed: role.defaultSeed || undefined,
      defaultResponseFormat: (role.defaultResponseFormat as 'text' | 'json_object') || 'text',
      terminalRestrictions: (role.terminalRestrictions && typeof role.terminalRestrictions === 'object' && !Array.isArray(role.terminalRestrictions)) 
        ? role.terminalRestrictions as { mode: 'whitelist' | 'blacklist' | 'unrestricted'; commands: string[] }
        : { mode: 'blacklist', commands: ['rm', 'sudo'] },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      criteria: (role.criteria as Record<string, any>) || {},
    });
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
              <div key={col.name} className="border border-gray-800 p-2 bg-gray-950/50 rounded">
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
    <div className={`flex bg-black text-gray-100 font-mono text-xs h-full ${className}`}>
      {/* Sidebar List */}
      <div className="w-48 bg-gray-950 border-r border-purple-900/50 flex flex-col flex-shrink-0">
        <div className="p-2 border-b border-purple-900/50 flex justify-between items-center">
          <span className="font-bold text-purple-400 uppercase tracking-wider">Roles</span>
          <button 
            onClick={() => {
              setSelectedRoleId(null);
              setFormData({
                name: '',
                basePrompt: '',
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
              });
            }}
            className="px-2 py-0.5 bg-blue-900/30 border border-blue-500 text-blue-300 hover:bg-blue-900/50 hover:text-white transition-all uppercase text-[10px] font-bold"
          >
            + New
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {roles?.map((role) => (
            <div
              key={role.id}
              onClick={() => handleSelectRole(role)}
              className={`p-2 cursor-pointer border-b border-gray-900 hover:bg-gray-900 transition-colors ${
                selectedRoleId === role.id ? 'bg-purple-900/20 border-l-2 border-l-purple-500' : 'border-l-2 border-l-transparent'
              }`}
            >
              <div className="font-bold text-gray-200 truncate">{role.name}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Editor Area - 2 Columns */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* LEFT COLUMN: Prompt & Name (60%) */}
        <div className="w-[60%] flex flex-col border-r border-gray-800 p-4">
          <div className="flex justify-between items-center mb-4">
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 bg-transparent text-xl font-bold text-white focus:outline-none border-b border-gray-800 focus:border-purple-500 placeholder-gray-700"
              placeholder="ROLE NAME"
            />
             <div className="flex gap-2 ml-4">
                {selectedRoleId && (
                  <button 
                    onClick={() => deleteRoleMutation.mutate({ id: selectedRoleId })}
                    className="p-2 text-red-500 hover:bg-red-900/20 rounded transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
                <button 
                  onClick={handleSave}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded shadow-lg shadow-purple-900/20 transition-all"
                >
                  <Save size={16} />
                  SAVE
                </button>
              </div>
          </div>
          
          <div className="flex-1 flex flex-col">
            <label className="text-xs font-bold text-gray-500 uppercase mb-2">System Prompt</label>
            <textarea
              value={formData.basePrompt}
              onChange={(e) => setFormData({ ...formData, basePrompt: e.target.value })}
              className="flex-1 w-full p-4 bg-gray-950 border border-gray-800 text-gray-300 focus:border-purple-500 focus:outline-none font-mono text-sm resize-none rounded-lg leading-relaxed"
              placeholder="You are an expert AI assistant..."
            />
          </div>
        </div>

        {/* RIGHT COLUMN: Parameters (40%) */}
        <div className="w-[40%] flex flex-col bg-gray-950/30 overflow-y-auto p-4 space-y-6">
          
          {/* Capabilities */}
          <div>
            <h3 className="text-[10px] font-bold text-gray-500 uppercase mb-2 flex items-center gap-2">
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
                    : 'border-gray-800 hover:border-gray-700 text-gray-500'
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
                    (formData as any)[key] ? `text-${color}-400` : 'text-gray-600'
                  } />
                  <span className="font-bold uppercase text-[10px]">{label}</span>
                </label>
              ))}
            </div>
          </div>
          
          {/* Tools Selection */}
          <div>
            <h3 className="text-[10px] font-bold text-gray-500 uppercase mb-2 flex items-center gap-2">
              <Wrench size={12} /> Tools
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {toolsList?.map((tool) => (
                <label key={tool.name} className={`flex items-center gap-2 p-2 border rounded cursor-pointer transition-all ${
                  formData.tools.includes(tool.name)
                    ? 'border-orange-500 bg-orange-900/10 text-orange-300 shadow-[0_0_10px_rgba(0,0,0,0.5)] shadow-orange-500/20' 
                    : 'border-gray-800 hover:border-gray-700 text-gray-500'
                }`}>
                  <input
                    type="checkbox"
                    checked={formData.tools.includes(tool.name)}
                    onChange={(e) => {
                      const newTools = e.target.checked
                        ? [...formData.tools, tool.name]
                        : formData.tools.filter(t => t !== tool.name);
                      setFormData({ ...formData, tools: newTools, needsTools: newTools.length > 0 });
                    }}
                    className="hidden"
                  />
                  <span className="font-bold uppercase text-[10px]">{tool.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Context Window */}
          <div className="border border-gray-800 p-3 bg-gray-950/50 rounded">
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

          {/* Provider Table */}
          <div className="mt-auto pt-4 border-t border-gray-800">
             <div className="flex justify-between items-end mb-2">
               <div className="flex gap-1">
                  {['chat', 'embedding', 'coding', 'tts'].map(type => (
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
                          ? 'bg-purple-900/50 border-purple-500 text-white' 
                          : 'bg-transparent border-gray-800 text-gray-500 hover:border-gray-600'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
               </div>
               <span className="text-xl font-bold text-white">{filteredModels.length} <span className="text-xs text-gray-500 font-normal">TOTAL</span></span>
            </div>
            
            <div className="border border-gray-800 rounded overflow-hidden">
              <table className="w-full text-left text-[10px]">
                <thead className="bg-gray-900 text-gray-400 uppercase">
                  <tr>
                    <th className="p-2">Provider</th>
                    <th className="p-2 text-right">Match</th>
                    <th className="p-2 text-right">Total</th>
                    <th className="p-2 text-right">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {Object.entries(providerBreakdown)
                    .sort(([, a], [, b]) => b.matched - a.matched)
                    .map(([provider, stats]) => {
                      const percent = Math.round((stats.matched / stats.total) * 100);
                      return (
                        <tr key={provider} className={stats.matched > 0 ? 'bg-gray-900/20' : 'opacity-50'}>
                          <td className="p-2 font-bold text-gray-300">{provider}</td>
                          <td className="p-2 text-right text-green-400 font-bold">{stats.matched}</td>
                          <td className="p-2 text-right text-gray-500">{stats.total}</td>
                          <td className="p-2 text-right">
                             <div className="w-12 h-1.5 bg-gray-800 rounded-full ml-auto overflow-hidden">
                               <div className="h-full bg-green-500" style={{ width: `${percent}%` }}></div>
                             </div>
                          </td>
                        </tr>
                      );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default RoleCreatorPanel;
