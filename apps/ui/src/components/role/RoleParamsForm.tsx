import React from 'react';
import type { RoleFormState } from '../../types/role.js';
import DualRangeSlider from '../DualRangeSlider.js';
import { Sparkles } from 'lucide-react';

interface RoleParamsFormProps {
  formData: RoleFormState;
  setFormData: React.Dispatch<React.SetStateAction<RoleFormState>>;
  className?: string;
}

export const RoleParamsForm: React.FC<RoleParamsFormProps> = ({
  formData,
  setFormData,
  className
}) => {
  return (
    <div className={`p-4 space-y-6 ${className}`}>
        {/* Context Window */}
        <div>
            <div className="flex justify-between items-baseline mb-2">
                <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase">Context Window</label>
            </div>
            <DualRangeSlider 
                min={0} 
                max={200000} 
                step={1024}
                value={[formData.minContext, formData.maxContext]}
                onChange={([min, max]) => setFormData(prev => ({ ...prev, minContext: min, maxContext: max }))}
                label=""
                unit=" tokens"
            />
            <div className="flex justify-between text-[10px] text-[var(--color-text-muted)] mt-1">
                <span>{formData.minContext.toLocaleString()} (Min)</span>
                <span>{formData.maxContext.toLocaleString()} (Max)</span>
            </div>
        </div>

        {/* Capabilities - Grid */}
        <div>
            <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase mb-2 block">Capabilities</label>
            <div className="grid grid-cols-2 gap-2">
                 <label className="flex items-center gap-2 p-2 border border-[var(--color-border)] rounded hover:bg-[var(--color-background-secondary)] transition-colors cursor-pointer">
                    <input 
                        type="checkbox"
                        checked={formData.needsVision}
                        onChange={(e) => setFormData(prev => ({ ...prev, needsVision: e.target.checked }))}
                        className="accent-[var(--color-primary)]"
                    />
                    <span className="text-[10px] font-medium">Vision</span>
                 </label>
                 <label className="flex items-center gap-2 p-2 border border-[var(--color-border)] rounded hover:bg-[var(--color-background-secondary)] transition-colors cursor-pointer">
                    <input 
                        type="checkbox"
                        checked={formData.needsReasoning}
                        onChange={(e) => setFormData(prev => ({ ...prev, needsReasoning: e.target.checked }))}
                        className="accent-[var(--color-primary)]"
                    />
                    <span className="text-[10px] font-medium">Reasoning</span>
                 </label>
                 <label className="flex items-center gap-2 p-2 border border-[var(--color-border)] rounded hover:bg-[var(--color-background-secondary)] transition-colors cursor-pointer">
                    <input 
                        type="checkbox"
                        checked={formData.needsCoding}
                        onChange={(e) => setFormData(prev => ({ ...prev, needsCoding: e.target.checked }))}
                        className="accent-[var(--color-primary)]"
                    />
                    <span className="text-[10px] font-medium">Coding</span>
                 </label>
                 <label className="flex items-center gap-2 p-2 border border-[var(--color-border)] rounded hover:bg-[var(--color-background-secondary)] transition-colors cursor-pointer">
                    <input 
                        type="checkbox"
                        checked={formData.needsImageGeneration}
                        onChange={(e) => setFormData(prev => ({ ...prev, needsImageGeneration: e.target.checked }))}
                        className="accent-[var(--color-primary)]"
                    />
                    <span className="text-[10px] font-medium">Image Gen</span>
                 </label>
                 {/** Add more as needed */}
            </div>
        </div>

        {/* Advanced Defaults (Temperature etc) */}
        <div className="pt-4 border-t border-[var(--color-border)]">
            <h4 className="text-xs font-bold text-[var(--color-text-muted)] uppercase mb-4 flex items-center gap-2">
                <Sparkles size={12} /> Tuning Defaults
            </h4>
            
            <div className="space-y-4">
                <div>
                     <div className="flex justify-between text-[10px] mb-1">
                        <span>Temperature</span>
                        <span className="font-mono text-[var(--color-primary)]">{formData.defaultTemperature}</span>
                     </div>
                     <input 
                        type="range"
                        min={0} max={2} step={0.1}
                        value={formData.defaultTemperature}
                        onChange={(e) => setFormData(prev => ({ ...prev, defaultTemperature: parseFloat(e.target.value) }))}
                        className="w-full h-1 bg-[var(--color-border)] rounded-full appearance-none cursor-pointer accent-[var(--color-primary)]"
                     />
                </div>
                 
                <div>
                     <div className="flex justify-between text-[10px] mb-1">
                        <span>Max Response Tokens</span>
                        <span className="font-mono text-[var(--color-primary)]">{formData.defaultMaxTokens}</span>
                     </div>
                     <input 
                        type="range"
                        min={256} max={32000} step={256}
                        value={formData.defaultMaxTokens}
                        onChange={(e) => setFormData(prev => ({ ...prev, defaultMaxTokens: parseInt(e.target.value) }))}
                        className="w-full h-1 bg-[var(--color-border)] rounded-full appearance-none cursor-pointer accent-[var(--color-primary)]"
                     />
                </div>
            </div>
        </div>
    </div>
  );
};
