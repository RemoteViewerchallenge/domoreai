import React, { useState } from 'react';
import { trpc } from '../utils/trpc.js';
import { Save, Trash2, Play, Plus } from 'lucide-react';

interface Step {
  name: string;
  description?: string;
  order: number;
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
    <div className={`flex bg-[var(--color-background)] text-[var(--color-text)] font-mono text-xs h-full ${className}`}>
      {/* Sidebar */}
      <div className="w-64 bg-[var(--color-background-secondary)] border-r border-[var(--color-primary)]/50 flex flex-col flex-shrink-0">
        <div className="p-2 border-b border-[var(--color-primary)]/50 flex justify-between items-center">
          <span className="font-bold text-[var(--color-primary)] uppercase tracking-wider">Orchestrations</span>
          <button
            onClick={() => {
              setSelectedId(null);
              setFormData({ name: '', description: '', tags: [], steps: [] });
            }}
            className="px-2 py-0.5 bg-[var(--color-primary)]/30 border border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary)]/50 hover:text-[var(--color-text)] transition-all uppercase text-[10px] font-bold"
          >
            + New
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {orchestrations?.map((orch) => (
            <div
              key={orch.id}
              onClick={() => handleSelect(orch)}
              className={`p-2 cursor-pointer border-b border-[var(--color-border)] hover:bg-[var(--color-background)] transition-colors ${
                selectedId === orch.id ? 'bg-[var(--color-primary)]/20 border-l-2 border-l-[var(--color-primary)]' : 'border-l-2 border-l-transparent'
              }`}
            >
              <div className="font-bold text-[var(--color-text)] truncate">{orch.name}</div>
              <div className="text-[10px] text-[var(--color-text-secondary)] truncate">{orch.steps.length} steps</div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Editor */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b border-[var(--color-border)] p-4 flex justify-between items-start bg-[var(--color-background-secondary)]/30">
          <div className="flex-1 mr-4">
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-transparent text-xl font-bold text-white focus:outline-none border-b border-[var(--color-border)] focus:border-[var(--color-primary)] placeholder-[var(--color-text-secondary)] mb-2"
              placeholder="ORCHESTRATION NAME"
            />
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-transparent text-sm text-[var(--color-text-secondary)] focus:outline-none border-b border-[var(--color-border)] focus:border-[var(--color-primary)] placeholder-[var(--color-text-secondary)]"
              placeholder="Description..."
            />
          </div>
          <div className="flex gap-2">
            {selectedId && (
              <>
                <button
                  onClick={() => executeMutation.mutate({ orchestrationId: selectedId, input: {} })}
                  className="p-2 text-[var(--color-success)] hover:bg-[var(--color-success)]/20 rounded transition-all"
                  title="Execute"
                >
                  <Play size={16} />
                </button>
                <button
                  onClick={() => deleteMutation.mutate({ id: selectedId })}
                  className="p-2 text-[var(--color-error)] hover:bg-[var(--color-error)]/20 rounded transition-all"
                >
                  <Trash2 size={16} />
                </button>
              </>
            )}
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/80 text-white font-bold rounded shadow-lg shadow-[var(--glow-primary)] transition-all"
            >
              <Save size={16} />
              SAVE
            </button>
          </div>
        </div>

        {/* Steps Editor */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[var(--color-background)]">
          {formData.steps.map((step, index) => (
            <div key={index} className="border border-[var(--color-border)] rounded bg-[var(--color-background-secondary)]/50 p-3 relative group">
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => removeStep(index)} className="text-[var(--color-error)] hover:text-[var(--color-error)]">
                  <Trash2 size={14} />
                </button>
              </div>
              
              <div className="flex items-center gap-4 mb-3">
                <div className="w-6 h-6 rounded-full bg-blue-900/50 text-[var(--color-primary)] flex items-center justify-center font-bold border border-[var(--color-primary)]/30">
                  {index + 1}
                </div>
                <input
                  type="text"
                  value={step.name}
                  onChange={(e) => updateStep(index, { name: e.target.value })}
                  className="bg-transparent font-bold text-[var(--color-text)] focus:outline-none border-b border-transparent focus:border-[var(--color-primary)]"
                  placeholder="Step Name"
                />
                <select
                  value={step.stepType}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  onChange={(e) => updateStep(index, { stepType: e.target.value as any })}
                  className="bg-[var(--color-background-secondary)] border border-[var(--color-border)] rounded px-2 py-1 text-[10px] uppercase"
                >
                  <option value="sequential">Sequential</option>
                  <option value="parallel">Parallel</option>
                  <option value="conditional">Conditional</option>
                  <option value="loop">Loop</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4 pl-10">
                {/* Parallel Group */}
                {step.stepType === 'parallel' && (
                  <div>
                    <label className="block text-[10px] uppercase text-[var(--color-text-secondary)] mb-1">Parallel Group</label>
                    <input
                      type="text"
                      value={step.parallelGroup || ''}
                      onChange={(e) => updateStep(index, { parallelGroup: e.target.value })}
                      className="w-full bg-[var(--color-background-secondary)] border border-[var(--color-border)] rounded px-2 py-1 text-xs"
                      placeholder="e.g. 'search'"
                    />
                  </div>
                )}

                {/* Input Mapping */}
                <div className="col-span-2">
                  <label className="block text-[10px] uppercase text-[var(--color-text-secondary)] mb-1">Input Mapping (JSON)</label>
                  <textarea
                    value={JSON.stringify(step.inputMapping || {}, null, 2)}
                    onChange={(e) => {
                      try {
                        updateStep(index, { inputMapping: JSON.parse(e.target.value) });
                      } catch (err) {
                        // Allow typing invalid JSON temporarily
                      }
                    }}
                    className="w-full bg-[var(--color-background-secondary)] border border-[var(--color-border)] rounded p-2 font-mono text-[10px] h-20"
                    placeholder='{ "query": "{{context.input}}" }'
                  />
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={addStep}
            className="w-full py-3 border-2 border-dashed border-[var(--color-border)] rounded text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-all flex items-center justify-center gap-2 font-bold uppercase tracking-wider"
          >
            <Plus size={16} /> Add Step
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrchestrationCreatorPanel;
