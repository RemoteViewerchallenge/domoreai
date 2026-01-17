import { useState, useMemo } from 'react';
import type { FC } from 'react';
import { trpc } from '../utils/trpc.js';
import { Cpu, Save, X, Filter } from 'lucide-react';
import type { Role } from '../types/role.js';
import DualRangeSlider from './ui/DualRangeSlider.js';

interface RoleModelOverrideProps {
  role: Role & {
    hardcodedModelId?: string | null;
    hardcodedProviderId?: string | null;
  };
}

interface AvailableModel {
  id: string;
  name: string;
  providerId: string;
  providerLabel: string;
  contextWindow: number;
  specs: {
    contextWindow: number;
    maxOutput: number;
    hasVision: boolean;
    hasReasoning: boolean;
    hasEmbedding: boolean;
    hasImageGen: boolean;
    hasOCR: boolean;
    uncensored?: boolean;
    coding?: boolean;
    hasTTS?: boolean;
  };
  primaryTask: string;
  isMultimodal: boolean;
  capabilities: string[];
}

/**
 * A UI component to set or clear a hardcoded model override for a specific role.
 * It's designed to be placed within a role editor form.
 */
export const RoleModelOverride: FC<RoleModelOverrideProps> = ({ role }) => {
  // 1. Fetch all available models from the endpoint we created
  const { data: availableModels, isLoading: isLoadingModels } =
    trpc.providers.listAllAvailableModels.useQuery();

  // 2. State for the dropdown. We use a composite key "providerId/modelId"
  const [selectedOverride, setSelectedOverride] = useState(
    role.hardcodedProviderId && role.hardcodedModelId
      ? `${role.hardcodedProviderId}/${role.hardcodedModelId}`
      : ''
  );

  // Filter States
  const [minContext, setMinContext] = useState(0);
  const [maxContext, setMaxContext] = useState(200000);
  const [needsVision, setNeedsVision] = useState(false);
  const [needsReasoning, setNeedsReasoning] = useState(false);
  const [needsTTS, setNeedsTTS] = useState(false);
  const [needsEmbedding, setNeedsEmbedding] = useState(false);


  // 4. tRPC mutation to update the role
  const utils = trpc.useContext();
  const updateRoleMutation = trpc.role.update.useMutation({
    onSuccess: () => {
      void utils.role.list.invalidate();
      alert('Model override updated!');
    },
    onError: (error) => {
      alert(`Failed to update override: ${error.message}`);
    },
  });

  // 5. Group models by datacenter AND FILTER them
  const groupedModels = useMemo(() => {
    if (!availableModels) return {};
    
    // Filter first
    const filtered = (availableModels as AvailableModel[] | undefined)?.filter((model) => {
        // Context Window
        const ctx = model.contextWindow || model.specs?.contextWindow || 0;
        if (ctx < minContext || ctx > maxContext) return false;

        // Capabilities & Task
        const caps = model.specs || {};
        const isMultimodal = model.isMultimodal || caps.hasVision;

        // Vision Requirement
        if (needsVision && !caps.hasVision && !isMultimodal) return false;
        
        // Reasoning Requirement
        if (needsReasoning && !caps.hasReasoning) return false;

        // TTS Requirement
        if (needsTTS && !(model.capabilities || []).includes('tts') && !caps.hasTTS) return false;

        // Embedding Requirement
        if (needsEmbedding && !(model.capabilities || []).includes('embedding') && !caps.hasEmbedding) return false;

        return true;
    });

    return (filtered || []).reduce((acc: Record<string, AvailableModel[]>, model) => {
      const datacenterLabel = model.providerLabel || 'Unknown Datacenter';
      if (!acc[datacenterLabel]) {
        acc[datacenterLabel] = [];
      }
      acc[datacenterLabel].push(model);
      return acc;
    }, {} as Record<string, AvailableModel[]>);
  }, [availableModels, minContext, maxContext, needsVision, needsReasoning, needsTTS, needsEmbedding]);

  // 6. Handler to save the override
  const handleSaveOverride = () => {
    if (!selectedOverride) {
        handleClearOverride();
        return;
    }
    const [providerId, modelId] = selectedOverride.split('/');
    updateRoleMutation.mutate({
      id: role.id,
      hardcodedModelId: modelId,
      hardcodedProviderId: providerId,
    });
  };

  // 7. Handler to clear the override
  const handleClearOverride = () => {
    setSelectedOverride('');
    updateRoleMutation.mutate({
      id: role.id,
      hardcodedModelId: null,
      hardcodedProviderId: null,
    });
  };

  const isChanged = selectedOverride !== (role.hardcodedProviderId && role.hardcodedModelId 
    ? `${role.hardcodedProviderId}/${role.hardcodedModelId}` 
    : '');

  const escapeQuotes = (text: string) => text.replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  const totalModels = Object.values(groupedModels).reduce((sum, list) => sum + list.length, 0);

  return (
    <div className="space-y-3">
      <h3 className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase mb-2 flex items-center gap-2">
        <Cpu size={12} /> Direct Model Assignment
      </h3>
      
      {/* FILTER UI */}
      <div className="p-3 border border-[var(--color-border)] rounded bg-[var(--color-background-secondary)]/30 space-y-3">
        <div className="flex items-center gap-2 text-[10px] font-bold text-[var(--color-text-muted)] uppercase mb-2">
            <Filter size={10} /> Filter Available Models
        </div>
        
        <DualRangeSlider 
            min={0} max={200000} step={1000}
            value={[minContext, maxContext]}
            onChange={([min, max]) => { setMinContext(min); setMaxContext(max); }}
            label="Context Range"
            unit="tk"
        />

        <div className="grid grid-cols-2 gap-2">
             <label className="flex items-center gap-2 text-[10px] cursor-pointer"><input type="checkbox" checked={needsVision} onChange={e => setNeedsVision(e.target.checked)} className="accent-[var(--color-primary)]"/> Vision</label>
             <label className="flex items-center gap-2 text-[10px] cursor-pointer"><input type="checkbox" checked={needsReasoning} onChange={e => setNeedsReasoning(e.target.checked)} className="accent-[var(--color-primary)]"/> Reasoning</label>
             <label className="flex items-center gap-2 text-[10px] cursor-pointer"><input type="checkbox" checked={needsTTS} onChange={e => setNeedsTTS(e.target.checked)} className="accent-[var(--color-primary)]"/> TTS</label>
             <label className="flex items-center gap-2 text-[10px] cursor-pointer"><input type="checkbox" checked={needsEmbedding} onChange={e => setNeedsEmbedding(e.target.checked)} className="accent-[var(--color-primary)]"/> Embedding</label>
        </div>
      </div>
      
      <div className="border border-[var(--color-border)] rounded p-3 bg-[var(--color-background-secondary)]/50 space-y-3">
        <div className="flex justify-between items-center text-[10px] text-[var(--color-text-muted)] uppercase font-bold mb-1">
            <span>Select Model</span>
            <span className={totalModels === 0 ? "text-[var(--color-error)]" : "text-[var(--color-success)]"}>{totalModels} Available</span>
        </div>
        <select
          value={selectedOverride}
          onChange={(e) => setSelectedOverride(e.target.value)}
          disabled={isLoadingModels || updateRoleMutation.isLoading || totalModels === 0}
          className="w-full px-3 py-2 bg-[var(--color-background)] border border-[var(--color-border)] text-[var(--color-text)] text-xs rounded focus:outline-none focus:border-[var(--color-primary)] transition-colors"
        >
          <option value="" className="bg-[var(--color-background)] text-[var(--color-text)]">-- Dynamic Selection (No Override) --</option>
          {Object.entries(groupedModels).map(([datacenterLabel, models]) => (
            <optgroup label={datacenterLabel} key={datacenterLabel} className="bg-[var(--color-background)] text-[var(--color-text)]">
              {models.map((model) => (
                  <option key={model.id} value={`${model.providerId}/${model.id}`} className="bg-[var(--color-background)] text-[var(--color-text)]">
                    {escapeQuotes(model.name)} 
                    {model.contextWindow ? ` (${Math.round(model.contextWindow/1000)}k)` : ''}
                    {model.isMultimodal ? ' 👁️' : ''}
                    {model.specs?.hasReasoning ? ' 🧠' : ''}
                  </option>
              ))}
            </optgroup>
          ))}
        </select>
        
        <div className="flex gap-2">
          <button 
            onClick={handleSaveOverride} 
            disabled={updateRoleMutation.isLoading || !isChanged}
            className="flex items-center gap-2 px-3 py-1.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/80 disabled:bg-[var(--color-border)] disabled:text-[var(--color-text-muted)] text-[var(--color-background)] rounded text-[10px] font-bold uppercase tracking-wider transition-all"
          >
            <Save size={12} />
            Save Override
          </button>
          <button 
            onClick={handleClearOverride} 
            disabled={updateRoleMutation.isLoading || !selectedOverride}
            className="flex items-center gap-2 px-3 py-1.5 bg-[var(--color-error)]/20 hover:bg-[var(--color-error)]/30 disabled:bg-transparent disabled:text-[var(--color-text-muted)] text-[var(--color-error)] border border-[var(--color-error)]/50 rounded text-[10px] font-bold uppercase tracking-wider transition-all"
          >
            <X size={12} />
            Clear
          </button>
        </div>
      </div>
    </div>
  );
};