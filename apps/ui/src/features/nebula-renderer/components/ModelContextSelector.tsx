import React, { useMemo, useState, useEffect } from 'react';
import { trpc } from '../../../utils/trpc.js';
import DualRangeSlider from '../../../components/ui/DualRangeSlider.js';
import { Brain, CheckCircle, XCircle } from 'lucide-react';

interface SelectorValue {
    minContext: number;
    maxContext: number;
    needsVision?: boolean;
    needsReasoning?: boolean;
}

interface ModelContextSelectorProps {
  value?: SelectorValue;
  onChange?: (value: SelectorValue) => void;
  className?: string;
  // Nebula generic props
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any; 
}

export const ModelContextSelector: React.FC<ModelContextSelectorProps> = ({ 
  value, 
  onChange,
  className = ''
}) => {
  // Default values
  const [minContext, setMinContext] = useState(value?.minContext || 0);
  const [maxContext, setMaxContext] = useState(value?.maxContext || 128000);
  const [needsVision, setNeedsVision] = useState(value?.needsVision || false);
  const [needsReasoning, setNeedsReasoning] = useState(value?.needsReasoning || false);

  // Sync state with props if they change externally (e.g. from parent binding)
  useEffect(() => {
    if (value) {
        setMinContext(value.minContext ?? 0);
        setMaxContext(value.maxContext ?? 128000);
        setNeedsVision(value.needsVision ?? false);
        setNeedsReasoning(value.needsReasoning ?? false);
    }
  }, [value]);

  const notifyChange = (newValues: Partial<SelectorValue>) => {
      if (onChange) {
        onChange({
            minContext: newValues.minContext ?? minContext,
            maxContext: newValues.maxContext ?? maxContext,
            needsVision: newValues.needsVision ?? needsVision,
            needsReasoning: newValues.needsReasoning ?? needsReasoning
        });
      }
  };

  // Fetch Capabilities (Use same endpoint as RoleModelOverride for consistency)
  const { data: registryData } = trpc.providers.listAllAvailableModels.useQuery();

  const filteredModels = useMemo(() => {
    if (!registryData) return [];
    return registryData;
  }, [registryData]);

  const datacenterBreakdown = useMemo(() => {
    const stats: Record<string, { matched: number; total: number }> = {};
    if (!filteredModels.length) return stats;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    filteredModels.forEach((model: any) => {
        const provider = model.provider_label || model.provider_id || 'Unknown';
        if (!stats[provider]) stats[provider] = { matched: 0, total: 0 };
        
        stats[provider].total += 1;

        let isMatch = true;
        const context = model.specs?.contextWindow || 0;
        if (context < minContext) isMatch = false;
        if (context > maxContext) isMatch = false;
        if (needsVision && !model.specs?.hasVision) isMatch = false;
        if (needsReasoning && !model.specs?.hasReasoning) isMatch = false;

        if (isMatch) stats[provider].matched += 1;
    });

    return stats;
  }, [filteredModels, minContext, maxContext, needsVision, needsReasoning]);

  return (
    <div className={`p-4 border border-[var(--color-border)] rounded bg-[var(--color-background-secondary)]/30 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <Brain className="text-[var(--color-primary)]" size={16} />
        <span className="text-xs font-bold uppercase text-[var(--color-text-muted)]">Cortex Capability Matrix</span>
      </div>

      {/* 1. Context Slider */}
      <div className="mb-6">
        <DualRangeSlider 
           min={0}
           max={200000}
           step={1000}
           value={[minContext, maxContext]}
           label="Context Window"
           unit="tk"
           onChange={([min, max]) => {
               setMinContext(min);
               setMaxContext(max);
               notifyChange({ minContext: min, maxContext: max });
           }}
        />
      </div>

      {/* 2. Feature Toggles */}
      <div className="flex gap-4 mb-6">
         <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
            <input 
                type="checkbox" 
                checked={needsVision}
                onChange={(e) => {
                    setNeedsVision(e.target.checked);
                    notifyChange({ needsVision: e.target.checked });
                }}
                className="accent-[var(--color-primary)] bg-transparent"
            />
            <span className={needsVision ? "text-[var(--color-text)] font-bold" : "text-[var(--color-text-muted)]"}>Requires Vision</span>
         </label>
         <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
            <input 
                type="checkbox" 
                checked={needsReasoning}
                onChange={(e) => {
                    setNeedsReasoning(e.target.checked);
                    notifyChange({ needsReasoning: e.target.checked });
                }}
                className="accent-[var(--color-primary)] bg-transparent"
            />
            <span className={needsReasoning ? "text-[var(--color-text)] font-bold" : "text-[var(--color-text-muted)]"}>Requires Reasoning</span>
         </label>
      </div>

      {/* 3. Breakdown Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
         {Object.entries(datacenterBreakdown).map(([provider, stats]) => (
             <div 
                 key={provider} 
                 className={`p-2 rounded border text-xs flex flex-col items-center justify-center transition-all ${
                     stats.matched > 0 
                     ? 'bg-[var(--color-success)]/10 border-[var(--color-success)]/30 text-[var(--color-text)]' 
                     : 'bg-[var(--color-background-primary)] border-[var(--color-border)] text-[var(--color-text-muted)] opacity-60'
                 }`}
             >
                 <span className="uppercase font-bold text-[9px] mb-1 tracking-wider">{provider}</span>
                 <div className="flex items-center gap-1">
                     {stats.matched > 0 ? <CheckCircle size={10} className="text-[var(--color-success)]"/> : <XCircle size={10}/>}
                     <span className="font-mono">{stats.matched} / {stats.total}</span>
                 </div>
             </div>
         ))}
      </div>
    </div>
  );
};
