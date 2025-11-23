import React, { useState } from 'react';
import { trpc } from '../utils/trpc.js';
import DualRangeSlider from '../components/DualRangeSlider.js';
import ToolSelector from '../components/ToolSelector.js';
import { Save, Trash2, Plus, Brain, Eye, Code } from 'lucide-react';

interface Role {
  id: string;
  name: string;
  basePrompt: string;
  minContext?: number | null;
  maxContext?: number | null;
  needsVision: boolean;
  needsReasoning: boolean;
  needsCoding: boolean;
  tools?: string[];
  defaultTemperature?: number | null;
  defaultMaxTokens?: number | null;
  defaultTopP?: number | null;
  defaultFrequencyPenalty?: number | null;
  defaultPresencePenalty?: number | null;
  defaultStop?: string[] | null;
  defaultSeed?: number | null;
  defaultResponseFormat?: 'text' | 'json_object' | null;
  terminalRestrictions?: { mode: 'whitelist' | 'blacklist' | 'unrestricted'; commands: string[] } | null;
}

const RoleCreator: React.FC = () => {
  const utils = trpc.useContext();
  const { data: roles } = trpc.role.list.useQuery();
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
  });

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

  const handleNew = () => {
    setSelectedRoleId(null);
    setFormData({
      name: '',
      basePrompt: '',
      minContext: 0,
      maxContext: 128000,
      needsVision: false,
      needsReasoning: false,
      needsCoding: false,
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
    });
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
      tools: role.tools || [],
      defaultTemperature: role.defaultTemperature || 0.7,
      defaultMaxTokens: role.defaultMaxTokens || 2048,
      defaultTopP: role.defaultTopP || 1.0,
      defaultFrequencyPenalty: role.defaultFrequencyPenalty || 0.0,
      defaultPresencePenalty: role.defaultPresencePenalty || 0.0,
      defaultStop: role.defaultStop || [],
      defaultSeed: role.defaultSeed || undefined,
      defaultResponseFormat: (role.defaultResponseFormat as 'text' | 'json_object') || 'text',
      terminalRestrictions: role.terminalRestrictions || { mode: 'blacklist', commands: ['rm', 'sudo'] },
    });
  };

  return (
    <div className="flex h-screen bg-black text-gray-100 font-mono text-xs">
      {/* Sidebar List */}
      <div className="w-56 bg-gray-950 border-r border-purple-900/50 flex flex-col">
        <div className="p-2 border-b border-purple-900/50 flex justify-between items-center">
          <span className="font-bold text-purple-400 uppercase tracking-wider">Roles</span>
          <button onClick={handleNew} className="p-1 hover:bg-purple-900/30 rounded border border-transparent hover:border-purple-500 transition-all">
            <Plus size={14} className="text-purple-400" />
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
              <div className="text-[10px] text-gray-500 truncate">{role.basePrompt}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Editor */}
      <div className="flex-1 flex flex-col overflow-hidden bg-black">
        <div className="p-4 flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto space-y-4">
            
            {/* Header & Actions */}
            <div className="flex justify-between items-center border-b border-gray-800 pb-2">
              <div>
                <span className="text-lg font-bold text-white uppercase tracking-widest">
                  {selectedRoleId ? 'Edit Role' : 'New Role'}
                </span>
              </div>
              <div className="flex gap-2">
                {selectedRoleId && (
                  <button 
                    onClick={() => deleteRoleMutation.mutate({ id: selectedRoleId })}
                    className="p-1.5 text-red-500 border border-red-900 hover:bg-red-900/20 hover:border-red-500 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
                <button 
                  onClick={handleSave}
                  className="flex items-center gap-2 px-3 py-1.5 bg-purple-900/30 border border-purple-500 text-purple-300 hover:bg-purple-900/50 hover:text-white transition-all uppercase tracking-wider text-xs font-bold"
                >
                  <Save size={14} />
                  Save
                </button>
              </div>
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-purple-400 uppercase mb-1">Role Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-950 border border-gray-800 text-white focus:border-purple-500 focus:outline-none text-xs"
                  placeholder="E.G. SENIOR PYTHON DEVELOPER"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-purple-400 uppercase mb-1">System Prompt</label>
                <textarea
                  value={formData.basePrompt}
                  onChange={(e) => setFormData({ ...formData, basePrompt: e.target.value })}
                  rows={6}
                  className="w-full px-3 py-2 bg-gray-950 border border-gray-800 text-gray-300 focus:border-purple-500 focus:outline-none font-mono text-xs"
                  placeholder="You are an expert AI assistant..."
                />
              </div>
            </div>

            {/* Capabilities */}
            <div className="border border-gray-800 p-3 bg-gray-950/50">
              <h3 className="text-[10px] font-bold text-gray-500 uppercase mb-2">Capabilities</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <label className={`flex items-center gap-2 p-2 border cursor-pointer transition-all ${
                  formData.needsVision 
                    ? 'border-blue-500 bg-blue-900/10 text-blue-300' 
                    : 'border-gray-800 hover:border-gray-600 text-gray-500'
                }`}>
                  <input
                    type="checkbox"
                    checked={formData.needsVision}
                    onChange={(e) => setFormData({ ...formData, needsVision: e.target.checked })}
                    className="hidden"
                  />
                  <Eye size={14} className={formData.needsVision ? 'text-blue-400' : 'text-gray-600'} />
                  <span className="font-bold uppercase text-[10px]">Vision</span>
                </label>

                <label className={`flex items-center gap-2 p-2 border cursor-pointer transition-all ${
                  formData.needsReasoning 
                    ? 'border-purple-500 bg-purple-900/10 text-purple-300' 
                    : 'border-gray-800 hover:border-gray-600 text-gray-500'
                }`}>
                  <input
                    type="checkbox"
                    checked={formData.needsReasoning}
                    onChange={(e) => setFormData({ ...formData, needsReasoning: e.target.checked })}
                    className="hidden"
                  />
                  <Brain size={14} className={formData.needsReasoning ? 'text-purple-400' : 'text-gray-600'} />
                  <span className="font-bold uppercase text-[10px]">Reasoning</span>
                </label>

                <label className={`flex items-center gap-2 p-2 border cursor-pointer transition-all ${
                  formData.needsCoding 
                    ? 'border-green-500 bg-green-900/10 text-green-300' 
                    : 'border-gray-800 hover:border-gray-600 text-gray-500'
                }`}>
                  <input
                    type="checkbox"
                    checked={formData.needsCoding}
                    onChange={(e) => setFormData({ ...formData, needsCoding: e.target.checked })}
                    className="hidden"
                  />
                  <Code size={14} className={formData.needsCoding ? 'text-green-400' : 'text-gray-600'} />
                  <span className="font-bold uppercase text-[10px]">Coding</span>
                </label>
              </div>
            </div>

            {/* Parameters Slider */}
            <div className="border border-gray-800 p-3 bg-gray-950/50">
              <h3 className="text-[10px] font-bold text-gray-500 uppercase mb-4">Context Window</h3>
              <DualRangeSlider
                min={0}
                max={200000}
                step={1000}
                value={[formData.minContext || 0, formData.maxContext || 128000]}
                onChange={(val) => setFormData({ ...formData, minContext: val[0], maxContext: val[1] })}
                label="TOKEN RANGE"
                unit="T"
              />
            </div>

            {/* Tool Selection */}
            <div className="border border-gray-800 p-3 bg-gray-950/50">
              <h3 className="text-[10px] font-bold text-gray-500 uppercase mb-2">Tool Access</h3>
              <ToolSelector
                selectedTools={formData.tools || []}
                onChange={(tools) => setFormData({ ...formData, tools })}
              />
            </div>

            {/* Terminal Security */}
            <div className="border border-gray-800 p-3 bg-gray-950/50">
              <h3 className="text-[10px] font-bold text-gray-500 uppercase mb-2">Terminal Security</h3>
              <p className="text-[9px] text-gray-600 mb-3">Control which terminal commands this role can execute.</p>
              
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-white block mb-2">Security Mode</label>
                  <select
                    value={formData.terminalRestrictions?.mode || 'blacklist'}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      terminalRestrictions: { 
                        mode: e.target.value as 'whitelist' | 'blacklist' | 'unrestricted',
                        commands: formData.terminalRestrictions?.commands || []
                      }
                    })}
                    className="w-full px-2 py-1 bg-gray-900 border border-gray-700 text-xs text-white rounded"
                  >
                    <option value="unrestricted">Unrestricted (⚠️ Full Access)</option>
                    <option value="blacklist">Blacklist (Block Dangerous)</option>
                    <option value="whitelist">Whitelist (Only Allow Specific)</option>
                  </select>
                </div>

                {formData.terminalRestrictions?.mode !== 'unrestricted' && (
                  <div>
                    <label className="text-[10px] font-bold text-white block mb-1">
                      {formData.terminalRestrictions?.mode === 'blacklist' ? 'Blocked Commands' : 'Allowed Commands'}
                    </label>
                    <p className="text-[9px] text-gray-600 mb-2">Comma-separated list of commands</p>
                    <input
                      type="text"
                      value={formData.terminalRestrictions?.commands?.join(', ') || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        terminalRestrictions: {
                          mode: formData.terminalRestrictions?.mode || 'blacklist',
                          commands: e.target.value ? e.target.value.split(',').map(s => s.trim()) : []
                        }
                      })}
                      placeholder={formData.terminalRestrictions?.mode === 'blacklist' ? 'rm, sudo, dd, mkfs' : 'ls, cat, grep, echo'}
                      className="w-full px-2 py-1 bg-gray-900 border border-gray-700 text-xs text-white rounded"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Hyperparameters */}
            <div className="border border-gray-800 p-3 bg-gray-950/50">
              <h3 className="text-[10px] font-bold text-gray-500 uppercase mb-4">Default Hyperparameters</h3>
              <p className="text-[9px] text-gray-600 mb-4">Cards using this role will inherit these defaults but can override them.</p>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-[10px] font-bold text-purple-400 uppercase">Temperature (Creativity)</label>
                    <span className="text-xs font-mono text-cyan-400">{formData.defaultTemperature}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={2}
                    step={0.1}
                    value={formData.defaultTemperature}
                    onChange={(e) => setFormData({ ...formData, defaultTemperature: parseFloat(e.target.value) })}
                    className="w-full accent-purple-500"
                  />
                  <div className="flex justify-between text-[9px] text-gray-600 mt-1">
                    <span>Precise</span>
                    <span>Balanced</span>
                    <span>Creative</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-[10px] font-bold text-purple-400 uppercase">Max Tokens</label>
                    <span className="text-xs font-mono text-cyan-400">{formData.defaultMaxTokens}</span>
                  </div>
                  <input
                    type="range"
                    min={256}
                    max={8192}
                    step={256}
                    value={formData.defaultMaxTokens}
                    onChange={(e) => setFormData({ ...formData, defaultMaxTokens: parseInt(e.target.value) })}
                    className="w-full accent-purple-500"
                  />
                  <div className="flex justify-between text-[9px] text-gray-600 mt-1">
                    <span>Short</span>
                    <span>Medium</span>
                    <span>Long</span>
                  </div>
                </div>

                {/* Top P */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-[10px] font-bold text-purple-400">Top P</label>
                    <span className="text-xs font-mono text-cyan-400">{formData.defaultTopP}</span>
                  </div>
                  <p className="text-[9px] text-gray-600 mb-2">Nucleus sampling - alternative to temperature. Lower = more focused.</p>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={formData.defaultTopP}
                    onChange={(e) => setFormData({ ...formData, defaultTopP: parseFloat(e.target.value) })}
                    className="w-full accent-blue-500"
                  />
                </div>

                {/* Frequency Penalty */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-[10px] font-bold text-purple-400">Frequency Penalty</label>
                    <span className="text-xs font-mono text-cyan-400">{formData.defaultFrequencyPenalty}</span>
                  </div>
                  <p className="text-[9px] text-gray-600 mb-2">Reduces repetition based on token frequency. Higher = less repetition.</p>
                  <input
                    type="range"
                    min={-2}
                    max={2}
                    step={0.1}
                    value={formData.defaultFrequencyPenalty}
                    onChange={(e) => setFormData({ ...formData, defaultFrequencyPenalty: parseFloat(e.target.value) })}
                    className="w-full accent-green-500"
                  />
                </div>

                {/* Presence Penalty */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-[10px] font-bold text-purple-400">Presence Penalty</label>
                    <span className="text-xs font-mono text-cyan-400">{formData.defaultPresencePenalty}</span>
                  </div>
                  <p className="text-[9px] text-gray-600 mb-2">Encourages topic diversity. Higher = more diverse topics.</p>
                  <input
                    type="range"
                    min={-2}
                    max={2}
                    step={0.1}
                    value={formData.defaultPresencePenalty}
                    onChange={(e) => setFormData({ ...formData, defaultPresencePenalty: parseFloat(e.target.value) })}
                    className="w-full accent-amber-500"
                  />
                </div>

                {/* Seed */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-[10px] font-bold text-purple-400">Seed (Optional)</label>
                    <input
                      type="number"
                      value={formData.defaultSeed ?? ''}
                      onChange={(e) => setFormData({ ...formData, defaultSeed: e.target.value ? parseInt(e.target.value) : undefined })}
                      placeholder="Random"
                      className="w-24 px-2 py-1 bg-gray-900 border border-gray-700 text-xs text-cyan-400 rounded"
                    />
                  </div>
                  <p className="text-[9px] text-gray-600">For deterministic outputs. Same seed = same output (if supported).</p>
                </div>

                {/* Response Format */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-[10px] font-bold text-purple-400">Response Format</label>
                    <select
                      value={formData.defaultResponseFormat}
                      onChange={(e) => setFormData({ ...formData, defaultResponseFormat: e.target.value as 'text' | 'json_object' })}
                      className="px-2 py-1 bg-gray-900 border border-gray-700 text-xs text-gray-300 rounded"
                    >
                      <option value="text">Text (Default)</option>
                      <option value="json_object">JSON Object</option>
                    </select>
                  </div>
                  <p className="text-[9px] text-gray-600">Force structured JSON output if needed.</p>
                </div>

                {/* Stop Sequences */}
                <div>
                  <label className="text-[10px] font-bold text-purple-400 block mb-1">Stop Sequences</label>
                  <p className="text-[9px] text-gray-600 mb-2">Comma-separated sequences to stop generation.</p>
                  <input
                    type="text"
                    value={formData.defaultStop?.join(', ') ?? ''}
                    onChange={(e) => setFormData({ ...formData, defaultStop: e.target.value ? e.target.value.split(',').map(s => s.trim()) : [] })}
                    placeholder="\n\n, END, ---"
                    className="w-full px-2 py-1 bg-gray-900 border border-gray-700 text-xs text-gray-300 rounded"
                  />
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default RoleCreator;
