import React, { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { trpc } from '../../utils/trpc.js';
import { 
  Brain, Sparkles, Dna, Save, 
  Briefcase, X, ChevronDown, Wrench
} from 'lucide-react';
import CompactRoleSelector from '../CompactRoleSelector.js';
import { ModelFilter } from '../nebula/primitives/ModelFilter.js';
import { NaturalParameterTuner } from '../nebula/primitives/NaturalParameterTuner.js';
import { RoleToolSelector } from '../role/RoleToolSelector.js';
import type { Model } from '../../types/role.js';
import { cn } from '../../lib/utils.js';
import type { LucideIcon } from 'lucide-react';

type EditorTab = 'tuning' | 'brain' | 'dna';

interface RoleEditorCardProps {
    id: string; // Card ID
    initialRoleId?: string;
    onUpdateConfig?: (config: { roleId: string; modelId: string | null; temperature: number; maxTokens: number; }) => void;
    onClose?: () => void;
}

export const RoleEditorCard: React.FC<RoleEditorCardProps> = ({ initialRoleId, onUpdateConfig }) => {
    const [activeTab, setActiveTab] = useState<EditorTab>('tuning');
    const [roleId, setRoleId] = useState<string>(initialRoleId || '');
    const [showRolePicker, setShowRolePicker] = useState(false);
    
    const { data: roles } = trpc.role.list.useQuery();
    const { data: models } = trpc.providers.listAllAvailableModels.useQuery();
    const { data: toolsList } = trpc.tool.list.useQuery();

    const [dna, setDna] = useState({
        temperature: 0.7,
        topP: 1.0,
        frequencyPenalty: 0.0,
        presencePenalty: 0.0,
        maxTokens: 2048,
        minContext: 0,
        maxContext: 128000,
        modelId: null as string | null,
        needsVision: false,
        needsReasoning: false,
        tools: [] as string[]
    });

    const currentRole = roles?.find(r => r.id === roleId);

    const handleApplyChanges = () => {
         if (onUpdateConfig) {
             onUpdateConfig({ 
                 roleId: roleId,
                 modelId: dna.modelId,
                 temperature: dna.temperature,
                 maxTokens: dna.maxTokens
             });
             toast.success("DNA Synchronized to Card");
         }
    };

    return (
        <div className="flex flex-col h-full w-full bg-[var(--bg-secondary)] text-[var(--text-secondary)] font-sans relative overflow-hidden">
            
            {/* Role Picker Overlay */}
            {showRolePicker && (
                <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-10 px-4">
                    <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg shadow-2xl w-full max-w-sm flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-3 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]/50">
                            <span className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                                <Briefcase size={14} className="text-[var(--color-primary)]"/> Select Role
                            </span>
                            <button onClick={() => setShowRolePicker(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                                <X size={14} />
                            </button>
                        </div>
                        <div className="max-h-80 overflow-y-auto">
                            <CompactRoleSelector 
                                onSelect={(id) => { setRoleId(id); setShowRolePicker(false); }} 
                                selectedRoleId={roleId}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex-none border-b border-[var(--border-color)] bg-[var(--bg-primary)]/50 flex items-center justify-between px-4 h-12">
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => setShowRolePicker(true)}
                        className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[var(--text-primary)] hover:text-[var(--color-primary)] transition-colors px-2 py-1.5 rounded bg-[var(--bg-secondary)] border border-[var(--border-color)]"
                    >
                        <Briefcase size={12} />
                        <span className="truncate max-w-[80px]">{currentRole?.name || 'Select Role'}</span>
                        <ChevronDown size={10} className="opacity-50"/>
                    </button>

                    <nav className="flex bg-[var(--bg-background)] rounded p-0.5 ml-2 border border-[var(--border-color)]">
                        <MiniTab active={activeTab === 'tuning'} onClick={() => setActiveTab('tuning')} icon={Sparkles} />
                        <MiniTab active={activeTab === 'brain'} onClick={() => setActiveTab('brain')} icon={Brain} />
                        <MiniTab active={activeTab === 'dna'} onClick={() => setActiveTab('dna')} icon={Dna} />
                    </nav>
                </div>

                <button 
                    onClick={handleApplyChanges}
                    className="flex items-center gap-2 bg-[var(--color-primary)] text-white px-3 py-1.5 rounded hover:opacity-90 transition-all text-[10px] font-bold uppercase tracking-wider"
                >
                    <Save size={12} /> Sync
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                
                {activeTab === 'tuning' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                        <NaturalParameterTuner 
                            config={{
                                temperature: dna.temperature,
                                topP: dna.topP,
                                frequencyPenalty: dna.frequencyPenalty,
                                presencePenalty: dna.presencePenalty
                            }}
                            onChange={(cfg) => setDna(prev => ({ ...prev, ...cfg }))}
                        />
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Response Length</label>
                            <input 
                                type="range" 
                                min="256" max="32000" step="256"
                                value={dna.maxTokens}
                                onChange={e => setDna(p => ({ ...p, maxTokens: parseInt(e.target.value) }))}
                                className="w-full accent-[var(--color-primary)] h-1.5 bg-[var(--bg-primary)] rounded-lg appearance-none cursor-pointer"
                            />
                            <div className="text-[10px] font-mono text-right text-[var(--color-primary)]">{dna.maxTokens} tokens</div>
                        </div>
                    </div>
                )}

                {activeTab === 'brain' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 h-full">
                        <ModelFilter 
                            allModels={models as Model[] || []}
                            mode="HARD_SELECTION"
                            criteria={{
                                minContext: dna.minContext,
                                maxContext: dna.maxContext,
                                capabilities: {
                                    vision: dna.needsVision,
                                    reasoning: dna.needsReasoning,
                                    imageGen: false,
                                    tts: false,
                                    uncensored: false,
                                    coding: false
                                },
                                hardCodedModelId: dna.modelId
                            }}
                            onChange={(crit) => setDna(prev => ({
                                ...prev,
                                minContext: crit.minContext,
                                maxContext: crit.maxContext,
                                needsVision: crit.capabilities.vision,
                                needsReasoning: crit.capabilities.reasoning,
                                modelId: crit.hardCodedModelId
                            }))}
                        />
                    </div>
                )}

                {activeTab === 'dna' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 h-full">
                         <RoleToolSelector 
                            selectedTools={dna.tools}
                            onChange={(tools) => setDna(prev => ({ ...prev, tools }))}
                         />
                    </div>
                )}
            </div>
        </div>
    );
};

const MiniTab = ({ active, onClick, icon: Icon }: { active: boolean, onClick: () => void, icon: LucideIcon }) => (
    <button 
        onClick={onClick}
        className={cn(
            "p-1.5 rounded transition-all",
            active 
            ? 'bg-[var(--color-primary)] text-white shadow-smScale' 
            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
        )}
    >
        <Icon size={12} />
    </button>
);
