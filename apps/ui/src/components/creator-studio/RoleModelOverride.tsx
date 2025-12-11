import { useState, useMemo, FC } from 'react';
import { trpc } from '../../utils/trpc.js';
import { callVoid } from '../../lib/callVoid.js';
import { Cpu, Save, X } from 'lucide-react';
import type { Role } from '@prisma/client';

interface RoleModelOverrideProps {
  role: Role & {
    hardcodedModelId?: string | null;
    hardcodedProviderId?: string | null;
  };
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

  // 4. tRPC mutation to update the role
  const utils = trpc.useContext();
  const updateRoleMutation = trpc.role.update.useMutation({
    onSuccess: () => {
      utils.role.list.invalidate();
      alert('Model override updated!');
    },
    onError: (error) => {
      alert(`Failed to update override: ${error.message}`);
    },
  });

  // 5. Group models by provider for a clean, organized dropdown
  const groupedModels = useMemo(() => {
    if (!availableModels) return {};
    return availableModels.reduce((acc: Record<string, typeof availableModels>, model) => {
      const providerLabel = model.providerLabel || 'Unknown Provider';
      if (!acc[providerLabel]) {
        acc[providerLabel] = [];
      }
      acc[providerLabel].push(model);
      return acc;
    }, {} as Record<string, typeof availableModels>);
  }, [availableModels]);

  // 6. Handler to save the override
  const handleSaveOverride = () => {
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

  return (
    <div className="space-y-3">
      <h3 className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase mb-2 flex items-center gap-2">
        <Cpu size={12} /> Direct Model Assignment
      </h3>
      <p className="text-[10px] text-[var(--color-text-muted)] mb-3">
        Override dynamic model selection by assigning a specific model to this role. Leave as "Dynamic Selection" to use the registry filtering system.
      </p>
      
      <div className="border border-[var(--color-border)] rounded p-3 bg-[var(--color-background-secondary)]/50 space-y-3">
        <select
          value={selectedOverride}
          onChange={(e) => setSelectedOverride(e.target.value)}
          disabled={isLoadingModels || updateRoleMutation.isLoading}
          className="w-full px-3 py-2 bg-[var(--color-background)] border border-[var(--color-border)] text-[var(--color-text)] text-xs rounded focus:outline-none focus:border-[var(--color-primary)] transition-colors"
        >
          {/* eslint-disable-next-line react/no-unescaped-entities */}
          <option value="">-- Dynamic Selection (Default) --</option>
          {Object.entries(groupedModels).map(([providerLabel, models]) => (
            <optgroup label={providerLabel} key={providerLabel}>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {models.map((model: any) => (
                <option key={model.id as string} value={`${model.providerId as string}/${model.id as string}`}>
                  {model.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        
        <div className="flex gap-2">
          <button 
            onClick={() => callVoid(handleSaveOverride)} 
            disabled={!isChanged || updateRoleMutation.isLoading}
            className="flex items-center gap-2 px-3 py-1.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/80 disabled:bg-[var(--color-border)] disabled:text-[var(--color-text-muted)] text-[var(--color-background)] rounded text-[10px] font-bold uppercase tracking-wider transition-all"
          >
            <Save size={12} />
            Save Override
          </button>
          <button 
            onClick={() => callVoid(handleClearOverride)} 
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