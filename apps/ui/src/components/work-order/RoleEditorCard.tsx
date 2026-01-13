import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { trpc } from '../../utils/trpc.js';
import { 
  Cpu, Sparkles, 
  Briefcase, X, ChevronDown, Wrench,
  Fingerprint, Shield, Globe,
  Bot, Zap, Wand2, Loader2
} from 'lucide-react';
import CompactRoleSelector from '../CompactRoleSelector.js';
import { ModelFilter } from '../nebula/primitives/ModelFilter.js';
import { NaturalParameterTuner } from '../nebula/primitives/NaturalParameterTuner.js';
import { RoleToolSelector } from '../role/RoleToolSelector.js';
import type { Model, RoleDNA, Role } from '../../types/role.js';
import { DEFAULT_ROLE_FORM_DATA } from '../../constants.js';
import { cn } from '../../lib/utils.js';
import type { LucideIcon } from 'lucide-react';

type DNAModule = 'identity' | 'cortex' | 'governance' | 'context' | 'tools' | 'tuning';

// Variant Config Types
interface VariantConfig {
  identityConfig?: unknown;
  cortexConfig?: unknown;
  governanceConfig?: unknown;
  contextConfig?: unknown;
  toolsConfig?: unknown;
}

interface ExtendedRole extends Role {
  variants?: VariantConfig[];
  hardcodedModelId?: string | null;
}

interface RoleEditorCardProps {
    id: string; // Card ID
    initialRoleId?: string;
    onUpdateConfig?: (config: { roleId: string; modelId: string | null; temperature: number; maxTokens: number; }) => void;
    onClose?: () => void;
}

export const RoleEditorCard: React.FC<RoleEditorCardProps> = ({ initialRoleId, onUpdateConfig }) => {
    const [activeTab, setActiveTab] = useState<DNAModule>('identity');
    const [roleId, setRoleId] = useState<string>(initialRoleId || '');
    const [showRolePicker, setShowRolePicker] = useState(false);
    
    // AI DNA Prompting State
    const [aiPrompt, setAiPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    const { data: roles } = trpc.role.list.useQuery();
    const { data: models } = trpc.providers.listAllAvailableModels.useQuery();
    const utils = trpc.useUtils();

    const [dna, setDna] = useState<RoleDNA>(DEFAULT_ROLE_FORM_DATA.dna);
    const [legacyParams, setLegacyParams] = useState<{
        temperature: number;
        maxTokens: number;
        modelId: string | null;
    }>({
        temperature: 0.7,
        maxTokens: 2048,
        modelId: null
    });

    const currentRole = roles?.find(r => r.id === roleId) as ExtendedRole | undefined;

    // Sync from role if it changes
    useEffect(() => {
        if (currentRole) {
            // If the role has a variant with DNA, use it
            const variant = currentRole.variants?.[0];
            if (variant) {
                setDna({
                    identity: (variant.identityConfig as typeof dna.identity) || DEFAULT_ROLE_FORM_DATA.dna.identity,
                    cortex: (variant.cortexConfig as typeof dna.cortex) || DEFAULT_ROLE_FORM_DATA.dna.cortex,
                    governance: (variant.governanceConfig as typeof dna.governance) || DEFAULT_ROLE_FORM_DATA.dna.governance,
                    context: (variant.contextConfig as typeof dna.context) || DEFAULT_ROLE_FORM_DATA.dna.context,
                    tools: (variant.toolsConfig as typeof dna.tools) || { customTools: currentRole.tools || [] }
                });
            }
            setLegacyParams({
                temperature: currentRole.defaultTemperature || 0.7,
                maxTokens: currentRole.defaultMaxTokens || 2048,
                modelId: currentRole.hardcodedModelId || null
            });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentRole]);

    const updateVariantMutation = trpc.role.updateVariantConfig.useMutation();

    const handleApplyChanges = async () => {
         if (!roleId) return;

         const loadingToastId = toast.loading("Stabilizing Lifeform...");
         try {
             // 1. Sync legacy params (for the card itself)
             if (onUpdateConfig) {
                 onUpdateConfig({ 
                     roleId: roleId,
                     modelId: legacyParams.modelId,
                     temperature: legacyParams.temperature,
                     maxTokens: legacyParams.maxTokens
                 });
             }

             // 2. Persist DNA modules to backend
             const modules: Array<'identity' | 'cortex' | 'governance' | 'context' | 'tools'> = ['identity', 'cortex', 'governance', 'context', 'tools'];
             for (const mod of modules) {
                 await updateVariantMutation.mutateAsync({
                     roleId,
                     configType: mod,
                     data: dna[mod] as Record<string, unknown>
                 });
             }
             
             toast.success("Lifeform Stabilized", { id: loadingToastId });
             void utils.role.list.invalidate();
         } catch (e) {
             console.error(e);
             toast.error("DNA Corruption Detected", { id: loadingToastId });
         }
    };

    const handleAIGenerate = async () => {
        if (!aiPrompt.trim()) return;
        setIsGenerating(true);
        try {
            // We use the 'createVariant' endpoint which act as the architect
            const result = await utils.client.role.createVariant.mutate({
                roleId: roleId || 'default',
                intent: {
                    name: currentRole?.name || 'New Lifeform',
                    description: aiPrompt,
                    domain: 'General',
                    complexity: 'HIGH'
                }
            });
            
            const identityConfig = result.identityConfig as typeof dna.identity;
            const cortexConfig = result.cortexConfig as typeof dna.cortex & { tools?: string[] };
            const governanceConfig = result.governanceConfig as typeof dna.governance;
            const contextConfig = result.contextConfig as typeof dna.context;
            
            setDna({
                identity: identityConfig,
                cortex: cortexConfig,
                governance: governanceConfig,
                context: contextConfig,
                tools: { customTools: cortexConfig.tools || [] }
            });
            toast.success("DNA Successfully Sequenced via AI");
            setAiPrompt('');
        } catch (e) {
            console.error(e);
            toast.error("Architectural Failure");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="flex flex-col h-full w-full bg-[var(--bg-secondary)] text-[var(--text-secondary)] font-sans relative overflow-hidden">
            
            {/* Role Picker Overlay */}
            {showRolePicker && (
                <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-10 px-4">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl w-full max-w-sm flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-3 border-b border-zinc-800 bg-zinc-950/50">
                            <span className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 text-zinc-200">
                                <Briefcase size={14} className="text-zinc-400"/> Select Role Template
                            </span>
                            <button onClick={() => setShowRolePicker(false)} className="text-zinc-500 hover:text-white">
                                <X size={14} />
                            </button>
                        </div>
                        <div className="max-h-80 overflow-y-auto bg-zinc-900">
                            <CompactRoleSelector 
                                onSelect={(id) => { setRoleId(id); setShowRolePicker(false); }} 
                                selectedRoleId={roleId}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Header: Identity & Tabs */}
            <div className="flex-none border-b border-zinc-800 bg-zinc-950/50 flex flex-col">
                <div className="h-12 flex items-center justify-between px-4">
                    <div className="flex items-center gap-3">
                        <button 
                            type="button"
                            onClick={() => setShowRolePicker(true)}
                            className="group flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-300 hover:text-white transition-colors px-2.5 py-1.5 rounded bg-zinc-900 border border-zinc-800 shadow-inner"
                        >
                            <Fingerprint size={12} className="text-blue-500 group-hover:scale-110 transition-transform" />
                            <span className="truncate max-w-[100px]">{currentRole?.name || 'GENERIC_ENTITY'}</span>
                            <ChevronDown size={10} className="text-zinc-600"/>
                        </button>

                        <div className="h-4 w-px bg-zinc-800 mx-1" />

                        <nav className="flex bg-zinc-900 rounded-md p-0.5 border border-zinc-800 shadow-inner">
                            <DNATab active={activeTab === 'identity'} onClick={() => setActiveTab('identity')} icon={Fingerprint} color="blue" />
                            <DNATab active={activeTab === 'cortex'} onClick={() => setActiveTab('cortex')} icon={Cpu} color="purple" />
                            <DNATab active={activeTab === 'tools'} onClick={() => setActiveTab('tools')} icon={Wrench} color="orange" />
                            <DNATab active={activeTab === 'tuning'} onClick={() => setActiveTab('tuning')} icon={Sparkles} color="cyan" />
                            <DNATab active={activeTab === 'governance'} onClick={() => setActiveTab('governance')} icon={Shield} color="red" />
                            <DNATab active={activeTab === 'context'} onClick={() => setActiveTab('context')} icon={Globe} color="emerald" />
                        </nav>
                    </div>

                    <button 
                        type="button"
                    onClick={() => void handleApplyChanges()}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-full shadow-lg shadow-blue-900/20 transition-all text-[10px] font-bold uppercase tracking-wider group active:scale-95"
                    >
                        <Zap size={12} className="group-hover:animate-pulse" /> 
                        Sequence DNA
                    </button>
                </div>
            </div>

            {/* AI Architect Bar */}
            <div className="flex-none border-b border-zinc-800 bg-zinc-900 px-4 py-2">
                <div className="relative flex items-center">
                    <Wand2 size={12} className="absolute left-3 text-purple-400 pointer-events-none" />
                    <input 
                        value={aiPrompt}
                        onChange={e => setAiPrompt(e.target.value)}
                        onKeyDown={e => { if(e.key === 'Enter') void handleAIGenerate() }}
                        placeholder="Prompter: 'Redefine this role as a cynical Senior Rust Architect...'"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-full py-1.5 pl-8 pr-24 text-[10px] text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-purple-600/50 transition-all"
                    />
                    <button 
                        type="button"
                        onClick={() => void handleAIGenerate()}
                        disabled={isGenerating || !aiPrompt.trim()}
                        className="absolute right-1 px-3 py-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-full text-[9px] font-black uppercase tracking-tighter transition-all flex items-center gap-1.5"
                    >
                        {isGenerating ? <Loader2 size={10} className="animate-spin" /> : <Bot size={10} />}
                        {isGenerating ? 'Evolving...' : 'Architect'}
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-gradient-to-b from-zinc-950 to-zinc-900">
                
                {activeTab === 'tuning' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <section className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-lg space-y-4">
                            <h3 className="text-[10px] font-black text-cyan-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Sparkles size={12} /> Neural Tuning
                            </h3>
                            <NaturalParameterTuner 
                                config={{
                                    temperature: legacyParams.temperature,
                                    topP: 1.0,
                                    frequencyPenalty: 0.0,
                                    presencePenalty: 0.0
                                }}
                                onChange={(cfg) => setLegacyParams(prev => ({ ...prev, temperature: cfg.temperature }))}
                            />
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase text-zinc-500 tracking-wider">Output Entropy (Max Tokens)</label>
                                <input 
                                    type="range" 
                                    min="256" max="32000" step="256"
                                    value={legacyParams.maxTokens}
                                    onChange={e => setLegacyParams(p => ({ ...p, maxTokens: parseInt(e.target.value) }))}
                                    className="w-full accent-cyan-500 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                                />
                                <div className="text-[10px] font-mono text-right text-cyan-400">{legacyParams.maxTokens} tokens</div>
                            </div>
                        </section>
                    </div>
                )}

                {activeTab === 'identity' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <section className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-lg space-y-4">
                             <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Fingerprint size={12} /> Persona Module
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-bold uppercase text-zinc-500">Codename</label>
                                    <input 
                                        value={dna.identity.personaName}
                                        onChange={e => setDna(prev => ({ ...prev, identity: { ...prev.identity, personaName: e.target.value } }))}
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-xs outline-none focus:border-blue-600"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-bold uppercase text-zinc-500">Communication Style</label>
                                    <select 
                                         value={dna.identity.style}
                                         onChange={e => setDna(prev => ({ ...prev, identity: { ...prev.identity, style: e.target.value as typeof dna.identity.style } }))}
                                         className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-xs outline-none focus:border-blue-600 text-zinc-300"
                                    >
                                        <option value="PROFESSIONAL_CONCISE">Professional & Concise</option>
                                        <option value="SOCRATIC">Socratic (Questioning)</option>
                                        <option value="AGGRESSIVE_AUDITOR">Aggressive Auditor</option>
                                        <option value="CREATIVE_EXPLORER">Creative Explorer</option>
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold uppercase text-zinc-500">System DNA String (Prompt)</label>
                                <textarea 
                                    value={dna.identity.systemPromptDraft}
                                    onChange={e => setDna(prev => ({ ...prev, identity: { ...prev.identity, systemPromptDraft: e.target.value } }))}
                                    className="w-full h-48 bg-zinc-950 border border-zinc-800 rounded p-3 text-xs font-mono leading-relaxed outline-none focus:border-blue-600 custom-scrollbar"
                                />
                            </div>
                        </section>
                    </div>
                )}

                {activeTab === 'cortex' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                         <section className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-lg space-y-4">
                            <h3 className="text-[10px] font-black text-purple-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Cpu size={12} /> Cognitive Module
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-bold uppercase text-zinc-500">Orchestration</label>
                                    <select 
                                         value={dna.cortex.orchestration}
                                         onChange={e => setDna(prev => ({ ...prev, cortex: { ...prev.cortex, orchestration: e.target.value as typeof dna.cortex.orchestration } }))}
                                         className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-xs outline-none focus:border-purple-600 text-zinc-300"
                                    >
                                        <option value="SOLO">Solo (Single-Shot)</option>
                                        <option value="CHAIN_OF_THOUGHT">Chain of Thought</option>
                                        <option value="MULTI_STEP_PLANNING">Multi-Step Planning</option>
                                    </select>
                                </div>
                                <div className="flex items-center gap-4 pt-5">
                                    <label className="flex items-center gap-2 cursor-pointer group">
                                        <input 
                                            type="checkbox"
                                            checked={dna.cortex.reflectionEnabled}
                                            onChange={e => setDna(prev => ({ ...prev, cortex: { ...prev.cortex, reflectionEnabled: e.target.checked } }))}
                                            className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-purple-600 focus:ring-purple-600 focus:ring-offset-zinc-900"
                                        />
                                        <span className="text-[10px] font-bold uppercase text-zinc-400 group-hover:text-zinc-200 transition-colors">Self-Reflection</span>
                                    </label>
                                </div>
                            </div>
                         </section>

                         <ModelFilter 
                            allModels={(models as Model[]) || []}
                            mode="HARD_SELECTION"
                            criteria={{
                                minContext: dna.cortex.contextRange.min,
                                maxContext: dna.cortex.contextRange.max,
                                capabilities: {
                                    vision: dna.cortex.capabilities.includes('vision'),
                                    reasoning: dna.cortex.capabilities.includes('reasoning'),
                                    imageGen: false,
                                    tts: false,
                                    uncensored: false,
                                    coding: dna.cortex.capabilities.includes('coding')
                                },
                                hardCodedModelId: legacyParams.modelId
                            }}
                            onChange={(crit) => {
                                const newCaps: string[] = [];
                                if (crit.capabilities.vision) newCaps.push('vision');
                                if (crit.capabilities.reasoning) newCaps.push('reasoning');
                                if (crit.capabilities.coding) newCaps.push('coding');

                                setDna(prev => ({
                                    ...prev,
                                    cortex: {
                                        ...prev.cortex,
                                        contextRange: { min: crit.minContext, max: crit.maxContext },
                                        capabilities: newCaps
                                    }
                                }));
                                setLegacyParams(p => ({ ...p, modelId: crit.hardCodedModelId || null }));
                            }}
                        />
                    </div>
                )}

                {activeTab === 'governance' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                         <section className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-lg space-y-4">
                            <h3 className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Shield size={12} /> Governance Module
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-bold uppercase text-zinc-500">Assessment Strategy</label>
                                    <select 
                                         value={dna.governance.assessmentStrategy}
                                         onChange={e => setDna(prev => ({ ...prev, governance: { ...prev.governance, assessmentStrategy: e.target.value as typeof dna.governance.assessmentStrategy } }))}
                                         className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-xs outline-none focus:border-red-600 text-zinc-300"
                                    >
                                        <option value="LINT_ONLY">Fast (Lint Only)</option>
                                        <option value="VISUAL_CHECK">Manual (Visual Check)</option>
                                        <option value="STRICT_TEST_PASS">Strict (npm test)</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-bold uppercase text-zinc-500">Enforcement</label>
                                    <select 
                                         value={dna.governance.enforcementLevel}
                                         onChange={e => setDna(prev => ({ ...prev, governance: { ...prev.governance, enforcementLevel: e.target.value as typeof dna.governance.enforcementLevel } }))}
                                         className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-xs outline-none focus:border-red-600 text-zinc-300"
                                    >
                                        <option value="BLOCK_ON_FAIL">Block on Fail</option>
                                        <option value="WARN_ONLY">Warn Only</option>
                                    </select>
                                </div>
                            </div>
                         </section>
                    </div>
                )}

                {activeTab === 'context' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                         <section className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-lg space-y-4">
                            <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Globe size={12} /> Context Module
                            </h3>
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold uppercase text-zinc-500">Memory Strategy</label>
                                <select 
                                        value={dna.context.strategy}
                                        onChange={e => setDna(prev => ({ ...prev, context: { ...prev.context, strategy: e.target.value as typeof dna.context.strategy } }))}
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-xs outline-none focus:border-emerald-600 text-zinc-300"
                                >
                                    <option value="STANDARD">Standard (File Read)</option>
                                    <option value="VECTOR_SEARCH">Vector Search (RAG)</option>
                                    <option value="LOCUS_FOCUS">Locus (Active File Only)</option>
                                </select>
                            </div>
                         </section>
                    </div>
                )}

                {activeTab === 'tools' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 h-full">
                         <RoleToolSelector 
                            selectedTools={dna.tools.customTools}
                            onChange={(tools) => setDna(prev => ({ ...prev, tools: { ...prev.tools, customTools: tools } }))}
                         />
                    </div>
                )}
            </div>
        </div>
    );
};

interface DNATabProps {
    active: boolean;
    onClick: () => void;
    icon: LucideIcon;
    color: string;
}

const DNATab: React.FC<DNATabProps> = ({ active, onClick, icon: Icon, color }) => {
    const colorMap: Record<string, string> = {
        blue: 'text-blue-500 border-blue-600 bg-blue-500/10',
        purple: 'text-purple-500 border-purple-600 bg-purple-500/10',
        orange: 'text-orange-500 border-orange-600 bg-orange-500/10',
        cyan: 'text-cyan-500 border-cyan-600 bg-cyan-500/10',
        red: 'text-red-500 border-red-600 bg-red-500/10',
        emerald: 'text-emerald-500 border-emerald-600 bg-emerald-500/10',
    };

    return (
        <button 
            type="button"
            onClick={onClick}
            className={cn(
                "p-2 rounded-md transition-all border-b-2 border-transparent",
                active 
                ? colorMap[color] 
                : 'text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800'
            )}
        >
            <Icon size={14} />
        </button>
    );
};
