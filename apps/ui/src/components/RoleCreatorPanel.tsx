import React, { useState } from 'react';
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
  tools?: string[];
  defaultTemperature?: number | null;
  defaultMaxTokens?: number | null;
  defaultTopP?: number | null;
  defaultFrequencyPenalty?: number | null;
  defaultPresencePenalty?: number | null;
  defaultStop?: unknown; // JsonValue from Prisma
  defaultSeed?: number | null;
  defaultResponseFormat?: unknown; // JsonValue from Prisma
  terminalRestrictions?: unknown; // JsonValue from Prisma
}

interface RoleCreatorPanelProps {
  className?: string;
}

const RoleCreatorPanel: React.FC<RoleCreatorPanelProps> = ({ className = '' }) => {
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
    needsTools: false,
    needsJson: false,
    needsUncensored: false,
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
    });
  };

  return (
    <div className={`flex bg-black text-gray-100 font-mono text-xs ${className}`}>
      {/* Sidebar List */}
      <div className="w-56 bg-gray-950 border-r border-purple-900/50 flex flex-col">
        <div className="p-2 border-b border-purple-900/50">
          <span className="font-bold text-purple-400 uppercase tracking-wider">Select Role</span>
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
          <div className="max-w-3xl mx-auto space-y-4">
            
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
                  rows={4}
                  className="w-full px-3 py-2 bg-gray-950 border border-gray-800 text-gray-300 focus:border-purple-500 focus:outline-none font-mono text-xs"
                  placeholder="You are an expert AI assistant..."
                />
              </div>
            </div>

            {/* Capabilities */}
            <div className="border border-gray-800 p-3 bg-gray-950/50">
              <h3 className="text-[10px] font-bold text-gray-500 uppercase mb-2">Capabilities</h3>
              <div className="grid grid-cols-3 gap-3">
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
              <div className="grid grid-cols-3 gap-3 mt-3">
                <label className={`flex items-center gap-2 p-2 border cursor-pointer transition-all ${
                  formData.needsTools 
                    ? 'border-orange-500 bg-orange-900/10 text-orange-300' 
                    : 'border-gray-800 hover:border-gray-600 text-gray-500'
                }`}>
                  <input
                    type="checkbox"
                    checked={formData.needsTools}
                    onChange={(e) => setFormData({ ...formData, needsTools: e.target.checked })}
                    className="hidden"
                  />
                  <Wrench size={14} className={formData.needsTools ? 'text-orange-400' : 'text-gray-600'} />
                  <span className="font-bold uppercase text-[10px]">Tools</span>
                </label>

                <label className={`flex items-center gap-2 p-2 border cursor-pointer transition-all ${
                  formData.needsJson 
                    ? 'border-yellow-500 bg-yellow-900/10 text-yellow-300' 
                    : 'border-gray-800 hover:border-gray-600 text-gray-500'
                }`}>
                  <input
                    type="checkbox"
                    checked={formData.needsJson}
                    onChange={(e) => setFormData({ ...formData, needsJson: e.target.checked })}
                    className="hidden"
                  />
                  <FileJson size={14} className={formData.needsJson ? 'text-yellow-400' : 'text-gray-600'} />
                  <span className="font-bold uppercase text-[10px]">JSON</span>
                </label>

                <label className={`flex items-center gap-2 p-2 border cursor-pointer transition-all ${
                  formData.needsUncensored 
                    ? 'border-red-500 bg-red-900/10 text-red-300' 
                    : 'border-gray-800 hover:border-gray-600 text-gray-500'
                }`}>
                  <input
                    type="checkbox"
                    checked={formData.needsUncensored}
                    onChange={(e) => setFormData({ ...formData, needsUncensored: e.target.checked })}
                    className="hidden"
                  />
                  <Skull size={14} className={formData.needsUncensored ? 'text-red-400' : 'text-gray-600'} />
                  <span className="font-bold uppercase text-[10px]">Uncensored</span>
                </label>
              </div>
            </div>

            {/* Context Window */}
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

            {/* Hyperparameters (Condensed) */}
            <div className="border border-gray-800 p-3 bg-gray-950/50">
              <h3 className="text-[10px] font-bold text-gray-500 uppercase mb-4">Default Hyperparameters</h3>
              
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[10px] font-bold text-purple-400 uppercase">Temperature</label>
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
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
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
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default RoleCreatorPanel;
