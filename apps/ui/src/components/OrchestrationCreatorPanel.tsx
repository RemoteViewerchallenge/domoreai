import React, { useState } from 'react';
import { trpc } from '../utils/trpc.js';
import { Save, Trash2, Play, Plus } from 'lucide-react';

interface Step {
  name: string;
  description?: string;
  order: number;
  roleId?: string;
  roleName?: string;
  stepType: 'sequential' | 'parallel' | 'conditional' | 'loop';
  condition?: Record<string, unknown>;
  inputMapping?: Record<string, unknown>;
  outputMapping?: Record<string, unknown>;
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
  parallelGroup?: string;
}

const OrchestrationCreatorPanel: React.FC<{ className?: string }> = ({ className = '' }) => {
  const utils = trpc.useContext();
  const { data: orchestrations } = trpc.orchestrationManagement.list.useQuery({});
  const { data: roles } = trpc.role.list.useQuery();

  const createMutation = trpc.orchestrationManagement.create.useMutation({
    onSuccess: () => utils.orchestrationManagement.list.invalidate(),
  });
  const updateMutation = trpc.orchestrationManagement.update.useMutation({
    onSuccess: () => utils.orchestrationManagement.list.invalidate(),
  });
  const deleteMutation = trpc.orchestrationManagement.delete.useMutation({
    onSuccess: () => utils.orchestrationManagement.list.invalidate(),
  });
  const executeMutation = trpc.orchestrationManagement.execute.useMutation();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    tags: string[];
    steps: Step[];
  }>({
    name: '',
    description: '',
    tags: [],
    steps: [],
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSelect = (orch: any) => {
    setSelectedId(orch.id);
    setFormData({
      name: orch.name,
      description: orch.description || '',
      tags: orch.tags,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      steps: orch.steps.map((s: any) => ({
        ...s,
        condition: s.condition as Record<string, unknown>,
        inputMapping: s.inputMapping as Record<string, unknown>,
        outputMapping: s.outputMapping as Record<string, unknown>,
      })),
    });
  };

  const handleSave = () => {
    if (selectedId) {
      updateMutation.mutate({
        id: selectedId,
        ...formData,
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  const addStep = () => {
    setFormData({
      ...formData,
      steps: [
        ...formData.steps,
        {
          name: `Step ${formData.steps.length + 1}`,
          order: formData.steps.length,
          stepType: 'sequential',
          maxRetries: 0,
        },
      ],
    });
  };

  const updateStep = (index: number, updates: Partial<Step>) => {
    const newSteps = [...formData.steps];
    newSteps[index] = { ...newSteps[index], ...updates };
    setFormData({ ...formData, steps: newSteps });
  };

  const removeStep = (index: number) => {
    const newSteps = formData.steps.filter((_, i) => i !== index);
    // Reorder
    newSteps.forEach((s, i) => s.order = i);
    setFormData({ ...formData, steps: newSteps });
  };

  return (
    <div className={`flex bg-black text-gray-100 font-mono text-xs h-full ${className}`}>
      {/* Sidebar */}
      <div className="w-64 bg-gray-950 border-r border-blue-900/50 flex flex-col flex-shrink-0">
        <div className="p-2 border-b border-blue-900/50 flex justify-between items-center">
          <span className="font-bold text-blue-400 uppercase tracking-wider">Orchestrations</span>
          <button
            onClick={() => {
              setSelectedId(null);
              setFormData({ name: '', description: '', tags: [], steps: [] });
            }}
            className="px-2 py-0.5 bg-blue-900/30 border border-blue-500 text-blue-300 hover:bg-blue-900/50 hover:text-white transition-all uppercase text-[10px] font-bold"
          >
            + New
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {orchestrations?.map((orch) => (
            <div
              key={orch.id}
              onClick={() => handleSelect(orch)}
              className={`p-2 cursor-pointer border-b border-gray-900 hover:bg-gray-900 transition-colors ${
                selectedId === orch.id ? 'bg-blue-900/20 border-l-2 border-l-blue-500' : 'border-l-2 border-l-transparent'
              }`}
            >
              <div className="font-bold text-gray-200 truncate">{orch.name}</div>
              <div className="text-[10px] text-gray-500 truncate">{orch.steps.length} steps</div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Editor */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b border-gray-800 p-4 flex justify-between items-start bg-gray-950/30">
          <div className="flex-1 mr-4">
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-transparent text-xl font-bold text-white focus:outline-none border-b border-gray-800 focus:border-blue-500 placeholder-gray-700 mb-2"
              placeholder="ORCHESTRATION NAME"
            />
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-transparent text-sm text-gray-400 focus:outline-none border-b border-gray-800 focus:border-blue-500 placeholder-gray-700"
              placeholder="Description..."
            />
          </div>
          <div className="flex gap-2">
            {selectedId && (
              <>
                <button
                  onClick={() => executeMutation.mutate({ orchestrationId: selectedId, input: {} })}
                  className="p-2 text-green-500 hover:bg-green-900/20 rounded transition-all"
                  title="Execute"
                >
                  <Play size={16} />
                </button>
                <button
                  onClick={() => deleteMutation.mutate({ id: selectedId })}
                  className="p-2 text-red-500 hover:bg-red-900/20 rounded transition-all"
                >
                  <Trash2 size={16} />
                </button>
              </>
            )}
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded shadow-lg shadow-blue-900/20 transition-all"
            >
              <Save size={16} />
              SAVE
            </button>
          </div>
        </div>

        {/* Steps Editor */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black">
          {formData.steps.map((step, index) => (
            <div key={index} className="border border-gray-800 rounded bg-gray-950/50 p-3 relative group">
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => removeStep(index)} className="text-red-500 hover:text-red-400">
                  <Trash2 size={14} />
                </button>
              </div>
              
              <div className="flex items-center gap-4 mb-3">
                <div className="w-6 h-6 rounded-full bg-blue-900/50 text-blue-300 flex items-center justify-center font-bold border border-blue-500/30">
                  {index + 1}
                </div>
                <input
                  type="text"
                  value={step.name}
                  onChange={(e) => updateStep(index, { name: e.target.value })}
                  className="bg-transparent font-bold text-gray-200 focus:outline-none border-b border-transparent focus:border-blue-500"
                  placeholder="Step Name"
                />
                <select
                  value={step.stepType}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  onChange={(e) => updateStep(index, { stepType: e.target.value as any })}
                  className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-[10px] uppercase"
                >
                  <option value="sequential">Sequential</option>
                  <option value="parallel">Parallel</option>
                  <option value="conditional">Conditional</option>
                  <option value="loop">Loop</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4 pl-10">
                {/* Role Selection */}
                <div>
                  <label className="block text-[10px] uppercase text-gray-500 mb-1">Role</label>
                  <select
                    value={step.roleName || ''}
                    onChange={(e) => updateStep(index, { roleName: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs"
                  >
                    <option value="">Select Role...</option>
                    {roles?.map(r => (
                      <option key={r.id} value={r.name}>{r.name}</option>
                    ))}
                  </select>
                </div>

                {/* Parallel Group */}
                {step.stepType === 'parallel' && (
                  <div>
                    <label className="block text-[10px] uppercase text-gray-500 mb-1">Parallel Group</label>
                    <input
                      type="text"
                      value={step.parallelGroup || ''}
                      onChange={(e) => updateStep(index, { parallelGroup: e.target.value })}
                      className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs"
                      placeholder="e.g. 'search'"
                    />
                  </div>
                )}

                {/* Input Mapping */}
                <div className="col-span-2">
                  <label className="block text-[10px] uppercase text-gray-500 mb-1">Input Mapping (JSON)</label>
                  <textarea
                    value={JSON.stringify(step.inputMapping || {}, null, 2)}
                    onChange={(e) => {
                      try {
                        updateStep(index, { inputMapping: JSON.parse(e.target.value) });
                      } catch (err) {
                        // Allow typing invalid JSON temporarily
                      }
                    }}
                    className="w-full bg-gray-900 border border-gray-700 rounded p-2 font-mono text-[10px] h-20"
                    placeholder='{ "query": "{{context.input}}" }'
                  />
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={addStep}
            className="w-full py-3 border-2 border-dashed border-gray-800 rounded text-gray-500 hover:border-blue-500 hover:text-blue-500 transition-all flex items-center justify-center gap-2 font-bold uppercase tracking-wider"
          >
            <Plus size={16} /> Add Step
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrchestrationCreatorPanel;
