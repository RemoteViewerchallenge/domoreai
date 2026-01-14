import React, { useMemo } from 'react';
import type { Model } from '../../../types/role.js';
import DualRangeSlider from '../../ui/DualRangeSlider.js';
import { Check, Cpu, Eye, Image, Mic, Zap } from 'lucide-react';
import { cn } from '../../../lib/utils.js';

export interface FilterCriteria {
    minContext: number;
    maxContext: number;
    capabilities: {
        vision: boolean;
        reasoning: boolean;
        imageGen: boolean;
        tts: boolean;
        uncensored: boolean; // Custom tag usually
    };
    hardCodedModelId?: string | null;
}

interface ModelFilterProps {
    allModels: Model[];
    criteria: FilterCriteria;
    onChange: (newCriteria: FilterCriteria) => void;
    mode: 'DNA_ONLY' | 'HARD_SELECTION'; // Role Creation vs Hard Override
    className?: string;
}

export const ModelFilter: React.FC<ModelFilterProps> = ({ 
    allModels, criteria, onChange, mode, className 
}) => {
    
    // 1. Filter Logic
    const stats = useMemo(() => {
        const providerMap: Record<string, { total: number; matching: Model[] }> = {};
        let totalMatching = 0;

        allModels.forEach(m => {
            const pName = m.providerId || 'Unknown';
            if (!providerMap[pName]) providerMap[pName] = { total: 0, matching: [] };
            
            providerMap[pName].total++;

            // Check Capabilities
            const caps = m.specs || {};
            let matches = true;

            // Context Check (Basic) - Filter models OUTSIDE the range
            const context = caps.contextWindow || 0;
            if (context < criteria.minContext) matches = false;
            if (context > criteria.maxContext) matches = false;
            
            // Capability Checks
            if (criteria.capabilities.vision && !caps.hasVision) matches = false;
            if (criteria.capabilities.reasoning && !caps.hasReasoning) matches = false;
            if (criteria.capabilities.imageGen && !caps.hasImageGen) matches = false;
            // Add other checks if they exist in schema - assuming they don't for now based on snippet
            // If they are missing from specs, we could either fail or ignore.

            if (matches) {
                providerMap[pName].matching.push(m);
                totalMatching++;
            }
        });

        return { providerMap, totalMatching };
    }, [allModels, criteria]);

    // Handlers
    const toggleCap = (key: keyof typeof criteria.capabilities) => {
        onChange({
            ...criteria,
            capabilities: { ...criteria.capabilities, [key]: !criteria.capabilities[key] }
        });
    };

    return (
        <div className={cn("flex flex-col gap-4 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg p-4", className)}>
            
            {/* A. Context Slider */}
            <div className="space-y-2">
                <div className="flex justify-between items-center">
                     <label className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Context Range</label>
                     <span className="text-[10px] font-mono text-[var(--color-primary)]">
                        {criteria.minContext.toLocaleString()} - {criteria.maxContext.toLocaleString()} tokens
                     </span>
                </div>
                <DualRangeSlider 
                    min={2048} 
                    max={128000} // Dynamic max?
                    step={1024}
                    value={[criteria.minContext, criteria.maxContext]}
                    onChange={([min, max]: [number, number]) => onChange({ ...criteria, minContext: min, maxContext: max })}
                />
            </div>

            {/* B. Capabilities Grid */}
            <div className="grid grid-cols-3 gap-2">
                <CapToggle label="Vision" icon={Eye} active={criteria.capabilities.vision} onClick={() => toggleCap('vision')} />
                <CapToggle label="Thinking" icon={Cpu} active={criteria.capabilities.reasoning} onClick={() => toggleCap('reasoning')} />
                <CapToggle label="Image Gen" icon={Image} active={criteria.capabilities.imageGen} onClick={() => toggleCap('imageGen')} />
                <CapToggle label="Audio/TTS" icon={Mic} active={criteria.capabilities.tts} onClick={() => toggleCap('tts')} />
                <CapToggle label="Uncensored" icon={Zap} active={criteria.capabilities.uncensored} onClick={() => toggleCap('uncensored')} />
            </div>

            {/* C. Provider Table */}
            <div className="border rounded border-[var(--border-color)] overflow-hidden">
                <div className="grid grid-cols-12 gap-2 bg-[var(--bg-primary)] px-3 py-2 border-b border-[var(--border-color)] text-[10px] font-bold text-[var(--text-muted)] uppercase">
                    <div className="col-span-4">Provider</div>
                    <div className="col-span-3 text-center">Fit / Total</div>
                    <div className="col-span-5 text-right">{mode === 'HARD_SELECTION' ? 'Selection' : 'Status'}</div>
                </div>
                
                <div className="max-h-48 overflow-y-auto custom-scrollbar">
                    {Object.entries(stats.providerMap).map(([provider, data]) => {
                        const isSelectedProvider = criteria.hardCodedModelId && data.matching.some(m => m.id === criteria.hardCodedModelId);
                        
                        return (
                            <div key={provider} className={cn("grid grid-cols-12 gap-2 px-3 py-2 items-center border-b border-[var(--border-color)] last:border-0 hover:bg-[var(--bg-primary)]/50 transition-colors", isSelectedProvider && "bg-[var(--color-primary)]/5")}>
                                <div className="col-span-4 text-xs font-bold text-[var(--text-secondary)]">{provider}</div>
                                <div className="col-span-3 text-xs font-mono text-center">
                                    <span className={data.matching.length > 0 ? "text-[var(--color-success)]" : "text-[var(--text-muted)]"}>{data.matching.length}</span>
                                    <span className="text-[var(--text-muted)]"> / {data.total}</span>
                                </div>
                                <div className="col-span-5 text-right">
                                    {mode === 'HARD_SELECTION' ? (
                                        <div className="relative group">
                                            <select 
                                                className="w-full bg-[var(--bg-background)] border border-[var(--border-color)] text-[10px] rounded px-1 py-1 outline-none focus:border-[var(--color-primary)]"
                                                value={criteria.hardCodedModelId || ''}
                                                onChange={(e) => onChange({ ...criteria, hardCodedModelId: e.target.value || null })}
                                                disabled={data.matching.length === 0}
                                            >
                                                <option value="">Auto-Detect</option>
                                                <option value="openai">OpenAI</option>
                                                <option value="anthropic">Anthropic</option>
                                                <option value="google">Google</option>
                                                <option value="mistral">Mistral</option>
                                                <option value="groq">Groq</option>
                                                <option value="nvidia">NVIDIA</option>
                                                <option value="cerebras">Cerebras</option>
                                                <option value="openrouter">OpenRouter</option>
                                                <option value="ollama">Ollama (Local)</option>
                                                {data.matching.map(m => (
                                                    <option key={m.id} value={m.id}>{m.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    ) : (
                                        <div className="text-[10px] text-[var(--text-muted)] italic">
                                            {data.matching.length > 0 ? 'Available' : 'None'}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* D. Footer Summary */}
            <div className="flex justify-between items-center text-[10px] text-[var(--text-muted)] px-1">
                <span>Total Registry: {allModels.length} models</span>
                <span className="font-bold text-[var(--color-primary)]">{stats.totalMatching} matches found</span>
            </div>
        </div>
    );
};

const CapToggle = ({ label, icon: Icon, active, onClick }: { label: string, icon: React.ElementType, active: boolean, onClick: () => void }) => (
    <button 
        onClick={onClick}
        type="button"
        className={cn(
            "flex items-center gap-2 px-2 py-2 rounded border transition-all",
            active 
                ? "bg-[var(--color-primary)]/10 border-[var(--color-primary)] text-[var(--color-primary)]" 
                : "bg-[var(--bg-background)] border-[var(--border-color)] text-[var(--text-muted)] hover:border-[var(--text-muted)]"
        )}
    >
        <Icon size={12} />
        <span className="text-[10px] font-bold">{label}</span>
        {active && <Check size={10} className="ml-auto" />}
    </button>
);
