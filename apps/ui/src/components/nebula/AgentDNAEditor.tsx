import React, { useState, useMemo } from 'react';
import { 
  Fingerprint, Cpu, Shield, Globe, Wrench, 
  Terminal, Brain, Eye, Lock, Layers,
  CheckCircle2, AlertTriangle, PlayCircle,
  LucideIcon
} from 'lucide-react';
import { cn } from '../../lib/utils.js';
import { CompactCategorizer, type CategorizerItem } from './primitives/CompactCategorizer.js';
import { trpc } from '../../utils/trpc.js';
import { NaturalParameterTuner } from './primitives/NaturalParameterTuner.js';
import type { RoleFormState } from '../../types/role.js';

interface AgentDNAEditorProps {
    formData: RoleFormState;
    setFormData: React.Dispatch<React.SetStateAction<RoleFormState>>;
}

type DNAModule = 'identity' | 'cortex' | 'governance' | 'context' | 'tools';

export const AgentDNAEditor: React.FC<AgentDNAEditorProps> = ({ formData, setFormData }) => {
    const [activeModule, setActiveModule] = useState<DNAModule>('identity');

    // --- DATA FETCHING FOR TOOLS ---
    const { data: tools } = trpc.tool.list.useQuery();

    // Map tools for Categorizer
    const toolData = useMemo(() => {
        if (!tools) return { items: [], categories: [] };
        const cats = new Set<string>();
        const items: CategorizerItem[] = tools.map(t => {
            // Infer category from serverId or naming convention (e.g. 'git_commit' -> 'Git')
            let cat = t.serverId || 'General';
            if (!t.serverId && t.name.includes('_')) {
                 const part = t.name.split('_')[0];
                 cat = part.charAt(0).toUpperCase() + part.slice(1);
            }
            cats.add(cat);
            return {
                id: t.name,
                label: t.name,
                categoryId: cat,
                icon: <Wrench size={10} className={formData.tools.includes(t.name) ? "text-[var(--color-primary)]" : "text-[var(--text-muted)]"} />
            };
        });
        return { items, categories: Array.from(cats).sort() };
    }, [tools, formData.tools]);

    // Handle Tool Selection
    const handleToolSelect = (toolId: string) => {
        setFormData(prev => ({
            ...prev,
            tools: prev.tools.includes(toolId) 
                ? prev.tools.filter(t => t !== toolId)
                : [...prev.tools, toolId]
        }));
    };

    // Handle Category Select (Select All)
    const handleCategorySelect = (_cat: string, allIds: string[]) => {
        setFormData(prev => {
            const allSelected = allIds.every(id => prev.tools.includes(id));
            if (allSelected) {
                // Deselect all
                return { ...prev, tools: prev.tools.filter(id => !allIds.includes(id)) };
            } else {
                // Select all (merge unique)
                return { ...prev, tools: Array.from(new Set([...prev.tools, ...allIds])) };
            }
        });
    };

    return (
        <div className="flex h-full w-full bg-[var(--bg-background)]">
            
            {/* 1. MODULE SIDEBAR (The Double Helix) */}
            <div className="w-16 border-r border-[var(--border-color)] flex flex-col items-center py-4 gap-4 bg-[var(--bg-secondary)] shrink-0">
                <ModuleButton active={activeModule === 'identity'} onClick={() => setActiveModule('identity')} icon={Fingerprint} color="blue" label="ID" />
                <ModuleButton active={activeModule === 'cortex'} onClick={() => setActiveModule('cortex')} icon={Cpu} color="purple" label="BRAIN" />
                <ModuleButton active={activeModule === 'governance'} onClick={() => setActiveModule('governance')} icon={Shield} color="red" label="LAW" />
                <ModuleButton active={activeModule === 'context'} onClick={() => setActiveModule('context')} icon={Globe} color="green" label="MEM" />
                <div className="h-px w-8 bg-[var(--border-color)] my-2" />
                <ModuleButton active={activeModule === 'tools'} onClick={() => setActiveModule('tools')} icon={Wrench} color="orange" label="TOOL" />
            </div>

            {/* 2. MAIN EDITOR */}
            <div className="flex-1 overflow-hidden flex flex-col">
                <div className="h-12 border-b border-[var(--border-color)] flex items-center px-6 bg-[var(--bg-secondary)]/30 shrink-0">
                    <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--text-primary)] flex items-center gap-2">
                        {activeModule === 'identity' && <><Fingerprint size={14} className="text-blue-400"/> Identity Module</>}
                        {activeModule === 'cortex' && <><Cpu size={14} className="text-purple-400"/> Cortex Configuration</>}
                        {activeModule === 'governance' && <><Shield size={14} className="text-red-400"/> Governance Protocols</>}
                        {activeModule === 'context' && <><Globe size={14} className="text-green-400"/> Context Strategy</>}
                        {activeModule === 'tools' && <><Wrench size={14} className="text-orange-400"/> Tool Registry</>}
                    </h2>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-[var(--bg-background)]">
                    
                    {/* --- IDENTITY MODULE --- */}
                    {activeModule === 'identity' && (
                        <div className="max-w-3xl mx-auto space-y-6 animate-in slide-in-from-right-4 duration-300">
                             <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Codename</label>
                                    <input 
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded p-2 text-sm focus:border-blue-500 outline-none"
                                        placeholder="e.g. Architect-9"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Communication Style</label>
                                    <select 
                                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded p-2 text-sm focus:border-blue-500 outline-none"
                                        value={(formData.criteria?.style as string) || 'PROFESSIONAL'}
                                        onChange={e => setFormData({ ...formData, criteria: { ...formData.criteria, style: e.target.value } })}
                                    >
                                        <option value="PROFESSIONAL">Professional & Concise</option>
                                        <option value="SOCRATIC">Socratic (Questions Only)</option>
                                        <option value="AGGRESSIVE">Aggressive Auditor</option>
                                        <option value="CREATIVE">Creative Explorer</option>
                                        <option value="ELI5">Explain Like I'm 5</option>
                                    </select>
                                </div>
                             </div>
                             
                             <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase text-[var(--text-muted)]">System Prompt (The Soul)</label>
                                <textarea 
                                    value={formData.basePrompt}
                                    onChange={e => setFormData({ ...formData, basePrompt: e.target.value })}
                                    className="w-full h-96 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg p-4 font-mono text-xs leading-relaxed focus:border-blue-500 outline-none resize-none"
                                    placeholder="You are a specialized AI agent..."
                                />
                             </div>
                        </div>
                    )}

                    {/* --- CORTEX MODULE --- */}
                    {activeModule === 'cortex' && (
                        <div className="max-w-3xl mx-auto space-y-8 animate-in slide-in-from-right-4 duration-300">
                            
                            {/* Orchestration Strategy */}
                            <section className="space-y-4">
                                <h3 className="text-[11px] font-bold uppercase text-purple-400 border-b border-purple-500/20 pb-2">Thinking Process</h3>
                                <div className="grid grid-cols-3 gap-3">
                                    <SelectCard 
                                        selected={(formData.criteria?.orchestration as string) === 'SOLO'}
                                        onClick={() => setFormData({ ...formData, criteria: { ...formData.criteria, orchestration: 'SOLO' } })}
                                        icon={PlayCircle} title="Solo Shot" desc="Fast, single response."
                                    />
                                    <SelectCard 
                                        selected={(formData.criteria?.orchestration as string) === 'COT'}
                                        onClick={() => setFormData({ ...formData, criteria: { ...formData.criteria, orchestration: 'COT' } })}
                                        icon={Brain} title="Chain of Thought" desc="Step-by-step reasoning."
                                    />
                                    <SelectCard 
                                        selected={(formData.criteria?.orchestration as string) === 'PLANNER'}
                                        onClick={() => setFormData({ ...formData, criteria: { ...formData.criteria, orchestration: 'PLANNER' } })}
                                        icon={Layers} title="Multi-Step Plan" desc="Architect then build."
                                    />
                                </div>
                            </section>

                            {/* Capabilities */}
                            <section className="space-y-4">
                                <h3 className="text-[11px] font-bold uppercase text-purple-400 border-b border-purple-500/20 pb-2">Hardware Capabilities</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <ToggleRow label="Vision (See Images)" checked={formData.needsVision} onChange={(v: boolean) => setFormData({ ...formData, needsVision: v })} icon={Eye} />
                                    <ToggleRow label="Reasoning (o1/R1)" checked={formData.needsReasoning} onChange={(v: boolean) => setFormData({ ...formData, needsReasoning: v })} icon={Brain} />
                                    <ToggleRow label="Code Execution" checked={formData.needsCoding} onChange={(v: boolean) => setFormData({ ...formData, needsCoding: v })} icon={Terminal} />
                                    <ToggleRow label="Uncensored Model" checked={formData.needsUncensored} onChange={(v: boolean) => setFormData({ ...formData, needsUncensored: v })} icon={Lock} />
                                </div>
                            </section>

                             {/* Tuning */}
                             <section className="space-y-4">
                                <h3 className="text-[11px] font-bold uppercase text-purple-400 border-b border-purple-500/20 pb-2">Parameter Tuning</h3>
                                <NaturalParameterTuner 
                                    config={{
                                        temperature: formData.defaultTemperature,
                                        topP: formData.defaultTopP,
                                        frequencyPenalty: formData.defaultFrequencyPenalty,
                                        presencePenalty: formData.defaultPresencePenalty
                                    }}
                                    onChange={(cfg) => setFormData({
                                        ...formData,
                                        defaultTemperature: cfg.temperature,
                                        defaultTopP: cfg.topP,
                                        defaultFrequencyPenalty: cfg.frequencyPenalty,
                                        defaultPresencePenalty: cfg.presencePenalty
                                    })}
                                />
                             </section>
                        </div>
                    )}

                    {/* --- GOVERNANCE MODULE --- */}
                    {activeModule === 'governance' && (
                        <div className="max-w-3xl mx-auto space-y-8 animate-in slide-in-from-right-4 duration-300">
                            <section className="p-4 bg-red-900/10 border border-red-500/20 rounded-lg">
                                <div className="flex items-start gap-3">
                                    <AlertTriangle className="text-red-400 shrink-0 mt-1" size={16} />
                                    <div>
                                        <h4 className="text-sm font-bold text-red-300">Safety Protocols</h4>
                                        <p className="text-xs text-red-200/60 mt-1 leading-relaxed">
                                            Governance rules define the boundaries of the agent's authority. 
                                            Violations can trigger an automatic rollback or supervisor alert.
                                        </p>
                                    </div>
                                </div>
                            </section>

                            <section className="space-y-4">
                                <h3 className="text-[11px] font-bold uppercase text-red-400 border-b border-red-500/20 pb-2">Assessment Strategy</h3>
                                <div className="grid grid-cols-3 gap-3">
                                    <SelectCard 
                                        selected={(formData.criteria?.assessmentStrategy as string) === 'LINT'}
                                        onClick={() => setFormData({ ...formData, criteria: { ...formData.criteria, assessmentStrategy: 'LINT' } })}
                                        icon={CheckCircle2} title="Lint Only" desc="Fast syntax check."
                                    />
                                    <SelectCard 
                                        selected={(formData.criteria?.assessmentStrategy as string) === 'VISUAL'}
                                        onClick={() => setFormData({ ...formData, criteria: { ...formData.criteria, assessmentStrategy: 'VISUAL' } })}
                                        icon={Eye} title="Visual Confirm" desc="Human must approve."
                                    />
                                    <SelectCard 
                                        selected={(formData.criteria?.assessmentStrategy as string) === 'TEST'}
                                        onClick={() => setFormData({ ...formData, criteria: { ...formData.criteria, assessmentStrategy: 'TEST' } })}
                                        icon={Shield} title="Strict Test" desc="Must pass test suite."
                                    />
                                </div>
                            </section>

                            <section className="space-y-2">
                                <label className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Prohibited Commands (Blacklist)</label>
                                <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded p-2 flex flex-wrap gap-2 min-h-[40px]">
                                    {formData.terminalRestrictions?.commands?.map(cmd => (
                                        <span key={cmd} className="px-2 py-1 bg-red-500/20 text-red-300 text-[10px] rounded flex items-center gap-1">
                                            {cmd} <button onClick={() => {
                                                const newCmds = formData.terminalRestrictions.commands.filter(c => c !== cmd);
                                                setFormData({ ...formData, terminalRestrictions: { ...formData.terminalRestrictions, commands: newCmds }});
                                            }}>×</button>
                                        </span>
                                    ))}
                                    <input 
                                        className="bg-transparent outline-none text-xs min-w-[100px]"
                                        placeholder="+ Add command (Enter)"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                const val = e.currentTarget.value.trim();
                                                if (val) {
                                                    const current = formData.terminalRestrictions?.commands || [];
                                                    setFormData({ ...formData, terminalRestrictions: { ...formData.terminalRestrictions, commands: [...current, val] }});
                                                    e.currentTarget.value = '';
                                                }
                                            }
                                        }}
                                    />
                                </div>
                            </section>
                        </div>
                    )}

                    {/* --- CONTEXT MODULE --- */}
                    {activeModule === 'context' && (
                        <div className="max-w-3xl mx-auto space-y-8 animate-in slide-in-from-right-4 duration-300">
                             <section className="space-y-4">
                                <h3 className="text-[11px] font-bold uppercase text-green-400 border-b border-green-500/20 pb-2">Retrieval Strategy</h3>
                                <div className="grid grid-cols-3 gap-3">
                                    <SelectCard 
                                        selected={!formData.memoryConfig?.useProjectMemory}
                                        onClick={() => setFormData({ ...formData, memoryConfig: { ...formData.memoryConfig, useProjectMemory: false } })}
                                        icon={Terminal} title="Standard" desc="Open files only."
                                    />
                                    <SelectCard 
                                        selected={formData.memoryConfig?.useProjectMemory}
                                        onClick={() => setFormData({ ...formData, memoryConfig: { ...formData.memoryConfig, useProjectMemory: true } })}
                                        icon={Brain} title="Vector Search" desc="Semantic RAG query."
                                    />
                                    <SelectCard 
                                        selected={(formData.criteria?.contextStrategy as string) === 'LOCUS'}
                                        onClick={() => setFormData({ ...formData, criteria: { ...formData.criteria, contextStrategy: 'LOCUS' } })}
                                        icon={Fingerprint} title="Locus Focus" desc="Active file only."
                                    />
                                </div>
                            </section>

                            <section className="space-y-4">
                                <h3 className="text-[11px] font-bold uppercase text-green-400 border-b border-green-500/20 pb-2">Context Window</h3>
                                <div className="bg-[var(--bg-primary)] p-4 rounded-lg border border-[var(--border-color)]">
                                    <div className="flex justify-between text-xs mb-2">
                                        <span>Min: {formData.minContext || 0}</span>
                                        <span className="text-[var(--color-primary)] font-bold">{formData.maxContext} Tokens</span>
                                    </div>
                                    <input 
                                        type="range" min="4096" max="128000" step="4096"
                                        className="w-full accent-green-500"
                                        value={formData.maxContext}
                                        onChange={e => setFormData({ ...formData, maxContext: parseInt(e.target.value) })}
                                    />
                                </div>
                            </section>
                        </div>
                    )}

                    {/* --- TOOLS MODULE --- */}
                    {activeModule === 'tools' && (
                        <div className="h-full flex flex-col animate-in slide-in-from-right-4 duration-300">
                            <div className="mb-4 bg-orange-900/10 border border-orange-500/20 p-4 rounded-lg">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h4 className="text-sm font-bold text-orange-300">Tool Registry</h4>
                                        <p className="text-xs text-orange-200/60">
                                            Select available MCP tools. "Nebula" allows UI manipulation.
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-2xl font-bold text-orange-400">{formData.tools.length}</div>
                                        <div className="text-[10px] uppercase text-orange-300/50">Active Tools</div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex-1 border border-[var(--border-color)] rounded-lg overflow-hidden bg-[var(--bg-secondary)]">
                                <CompactCategorizer 
                                    title="Available Capabilities"
                                    items={toolData.items}
                                    categories={toolData.categories}
                                    selectedIds={formData.tools}
                                    onSelect={handleToolSelect}
                                    onCategorySelect={handleCategorySelect}
                                    accordion={true} // Enforce accordion mode
                                    defaultExpanded={false} // Start condensed
                                    className="w-full h-full border-0"
                                />
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

// --- HELPER COMPONENTS ---

const ModuleButton = ({ active, onClick, icon: Icon, color, label }: { active: boolean, onClick: () => void, icon: LucideIcon, color: string, label: string }) => {
    // Standard tailwind classes for the active state
    const getColorClasses = (clr: string) => {
        switch (clr) {
            case 'blue': return "bg-blue-500/20 text-blue-400 ring-1 ring-blue-500 shadow-lg shadow-blue-500/20";
            case 'purple': return "bg-purple-500/20 text-purple-400 ring-1 ring-purple-500 shadow-lg shadow-purple-500/20";
            case 'red': return "bg-red-500/20 text-red-400 ring-1 ring-red-500 shadow-lg shadow-red-500/20";
            case 'green': return "bg-green-500/20 text-green-400 ring-1 ring-green-500 shadow-lg shadow-green-500/20";
            case 'orange': return "bg-orange-500/20 text-orange-400 ring-1 ring-orange-500 shadow-lg shadow-orange-500/20";
            default: return "";
        }
    };

    const activeClasses = getColorClasses(color);

    return (
        <button
            onClick={onClick}
            className={cn(
                "w-10 h-10 rounded-lg flex flex-col items-center justify-center gap-1 transition-all",
                active 
                    ? activeClasses 
                    : "text-[var(--text-muted)] hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)]"
            )}
            title={label}
        >
            <Icon size={16} />
            <span className="text-[8px] font-bold">{label}</span>
        </button>
    );
};

const SelectCard = ({ selected, onClick, icon: Icon, title, desc }: { selected: boolean, onClick: () => void, icon: LucideIcon, title: string, desc: string }) => (
    <div 
        onClick={onClick}
        className={cn(
            "p-3 rounded-lg border cursor-pointer transition-all hover:bg-[var(--bg-primary)]",
            selected 
                ? "bg-[var(--color-primary)]/10 border-[var(--color-primary)] ring-1 ring-[var(--color-primary)]" 
                : "bg-[var(--bg-secondary)] border-[var(--border-color)] opacity-70 hover:opacity-100"
        )}
    >
        <div className={cn("mb-2", selected ? "text-[var(--color-primary)]" : "text-[var(--text-muted)]")}>
            <Icon size={18} />
        </div>
        <div className="text-xs font-bold text-[var(--text-primary)]">{title}</div>
        <div className="text-[10px] text-[var(--text-muted)] leading-tight mt-1">{desc}</div>
    </div>
);

const ToggleRow = ({ label, checked, onChange, icon: Icon }: { label: string, checked: boolean, onChange: (v: boolean) => void, icon: LucideIcon }) => (
    <div 
        onClick={() => onChange(!checked)}
        className={cn(
            "flex items-center gap-3 p-3 rounded border cursor-pointer select-none transition-all",
            checked 
                ? "bg-[var(--color-primary)]/10 border-[var(--color-primary)] text-[var(--text-primary)]" 
                : "bg-[var(--bg-primary)] border-[var(--border-color)] text-[var(--text-muted)] hover:bg-[var(--bg-secondary)]"
        )}
    >
        <Icon size={14} />
        <span className="text-xs font-bold flex-1">{label}</span>
        <div className={cn(
            "w-8 h-4 rounded-full relative transition-colors",
            checked ? "bg-[var(--color-primary)]" : "bg-zinc-700"
        )}>
            <div className={cn(
                "absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all",
                checked ? "left-4.5" : "left-0.5"
            )} />
        </div>
    </div>
);
