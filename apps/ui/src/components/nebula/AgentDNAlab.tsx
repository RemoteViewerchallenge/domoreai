import React, { useState, useMemo } from 'react';
import { trpc } from '../../utils/trpc.js';
import type { RoleFormState, Model } from '../../types/role.js';
import { DEFAULT_ROLE_FORM_DATA } from '../../constants.js';
import { 
  Save, Trash2, Sparkles,
  Fingerprint, Cpu, Shield, Globe, Wrench
} from 'lucide-react';
import { toast } from 'sonner';
import { CompactCategorizer } from './primitives/CompactCategorizer.js';
import { ModelFilter } from './primitives/ModelFilter.js';
import { NaturalParameterTuner } from './primitives/NaturalParameterTuner.js';
import { RoleToolSelector } from '../role/RoleToolSelector.js';
import { cn } from '../../lib/utils.js';

type LabTab = 'identity' | 'cortex' | 'governance' | 'context' | 'tuning' | 'tools';

export const AgentDNAlab: React.FC = () => {
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [formData, setFormData] = useState<RoleFormState>(DEFAULT_ROLE_FORM_DATA);
  const [activeTab, setActiveTab] = useState<LabTab>('identity');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const utils = trpc.useContext();
  const { data: roles, isLoading: rolesLoading } = trpc.role.list.useQuery();
  const { data: categories } = trpc.role.listCategories.useQuery();
  const { data: registry } = trpc.orchestrator.getActiveRegistryData.useQuery();

  const models = useMemo(() => {
    if (!registry) return [] as Model[];
    if (Array.isArray(registry)) return registry as Model[];
    return ((registry as any).rows || (registry as any).models || []) as Model[];
  }, [registry]);

  const updateRoleMutation = trpc.role.update.useMutation({
    onSuccess: () => {
      void utils.role.list.invalidate();
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
      toast.success('DNA Synchronized');
    },
    onError: (e) => {
      setSaveStatus('error');
      toast.error(`Sync Failed: ${e.message}`);
    }
  });

  const createRoleMutation = trpc.role.create.useMutation({
    onSuccess: (newRole) => {
      void utils.role.list.invalidate();
      setSelectedRoleId(newRole.id);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
      toast.success('New Lifeform Created');
    }
  });

  const deleteRoleMutation = trpc.role.delete.useMutation({
    onSuccess: () => {
      void utils.role.list.invalidate();
      setSelectedRoleId(null);
      setFormData(DEFAULT_ROLE_FORM_DATA);
      toast.success('Subject Terminated');
    }
  });

  const handleSelectRole = (id: string) => {
    const role = roles?.find(r => r.id === id) as any;
    if (role) {
      setSelectedRoleId(id);
      setFormData({
        name: role.name,
        basePrompt: role.basePrompt,
        category: role.category?.name || 'Uncategorized',
        minContext: role.minContext || 0,
        maxContext: role.maxContext || 128000,
        needsVision: role.needsVision || false,
        needsReasoning: role.needsReasoning || false,
        needsCoding: role.needsCoding || false,
        needsTools: role.needsTools || false,
        needsJson: role.needsJson || false,
        needsUncensored: role.needsUncensored || false,
        needsImageGeneration: role.needsImageGeneration || false,
        tools: (role.tools as unknown as string[]) || [], // Backend might return names
        defaultTemperature: role.defaultTemperature || 0.7,
        defaultMaxTokens: role.defaultMaxTokens || 2048,
        defaultTopP: role.defaultTopP || 1.0,
        defaultFrequencyPenalty: role.defaultFrequencyPenalty || 0.0,
        defaultPresencePenalty: role.defaultPresencePenalty || 0.0,
        defaultStop: role.defaultStop || [],
        defaultSeed: role.defaultSeed,
        defaultResponseFormat: role.defaultResponseFormat || 'text',
        terminalRestrictions: role.terminalRestrictions || { mode: 'blacklist', commands: [] },
        criteria: role.criteria || {},
        orchestrationConfig: role.orchestrationConfig || { requiresCheck: false, minPassScore: 80 },
        memoryConfig: role.memoryConfig || { useProjectMemory: false, readOnly: false }
      });
    }
  };

  const handleSave = () => {
    setSaveStatus('saving');
    if (selectedRoleId) {
      updateRoleMutation.mutate({ id: selectedRoleId, ...formData });
    } else {
      createRoleMutation.mutate(formData);
    }
  };

  const categorizerItems = useMemo(() => {
    return (roles || []).map((r: any) => ({
      id: r.id,
      label: r.name,
      categoryId: r.category?.name || r.categoryString || 'Uncategorized',
      icon: <Fingerprint size={12} className="text-[var(--color-primary)]" />
    }));
  }, [roles]);

  const categoryNames = useMemo(() => {
    const names = new Set<string>();
    (categories || []).forEach(c => names.add(c.name));
    return Array.from(names);
  }, [categories]);

  if (rolesLoading) return <div className="p-8 animate-pulse text-[var(--text-muted)]">Initializing DNA Sequencing...</div>;

  return (
    <div className="flex h-full w-full bg-[var(--bg-background)] overflow-hidden">
      
      {/* 1. LIBRARY SIDEBAR */}
      <CompactCategorizer 
        title="Agent Registry"
        items={categorizerItems}
        categories={categoryNames}
        selectedId={selectedRoleId}
        onSelect={handleSelectRole}
        onAddItem={() => {
            setSelectedRoleId(null);
            setFormData(DEFAULT_ROLE_FORM_DATA);
            setActiveTab('identity');
        }}
        className="w-64 border-r border-[var(--border-color)]"
      />

      {/* 2. MAIN WORKSPACE */}
      <div className="flex-1 flex flex-col min-w-0">
         
         {/* DNA Header */}
         <div className="h-16 flex items-center justify-between px-6 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]/30">
            <div className="flex flex-col">
                <input 
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="bg-transparent text-xl font-bold text-[var(--text-primary)] outline-none border-b border-transparent focus:border-[var(--color-primary)] transition-colors"
                    placeholder="Subject Name..."
                />
                <span className="text-[10px] text-[var(--text-muted)] font-mono uppercase tracking-widest">
                    {selectedRoleId ? `ID: ${selectedRoleId}` : 'NEW LIFEFORM DETECTED'}
                </span>
            </div>

            <div className="flex gap-2">
                {selectedRoleId && (
                    <button 
                        onClick={() => { if(confirm('Terminate Subject?')) deleteRoleMutation.mutate({ id: selectedRoleId }) }}
                        className="p-2 text-[var(--color-error)] hover:bg-[var(--color-error)]/10 rounded"
                    >
                        <Trash2 size={16} />
                    </button>
                )}
                <button 
                    onClick={handleSave}
                    disabled={saveStatus === 'saving'}
                    className={cn(
                        "flex items-center gap-2 px-6 py-2 rounded font-bold text-xs transition-all",
                        saveStatus === 'saved' ? 'bg-[var(--color-success)] text-white' : 'bg-[var(--color-primary)] text-white hover:opacity-90'
                    )}
                >
                    {saveStatus === 'saving' ? <Sparkles size={14} className="animate-spin" /> : <Save size={14} />}
                    {saveStatus === 'saving' ? 'SYNCING...' : saveStatus === 'saved' ? 'SYNCED' : 'SYNCHRONIZE DNA'}
                </button>
            </div>
         </div>

         {/* DNA Tabs */}
         <div className="flex px-6 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]/10">
            <DNATab active={activeTab === 'identity'} onClick={() => setActiveTab('identity')} icon={Fingerprint} label="Identity" color="blue" />
            <DNATab active={activeTab === 'cortex'} onClick={() => setActiveTab('cortex')} icon={Cpu} label="Cortex" color="purple" />
            <DNATab active={activeTab === 'tools'} onClick={() => setActiveTab('tools')} icon={Wrench} label="Tools" color="orange" />
            <DNATab active={activeTab === 'tuning'} onClick={() => setActiveTab('tuning')} icon={Sparkles} label="Neural Tuning" color="cyan" />
            <DNATab active={activeTab === 'governance'} onClick={() => setActiveTab('governance')} icon={Shield} label="Governance" color="red" />
            <DNATab active={activeTab === 'context'} onClick={() => setActiveTab('context')} icon={Globe} label="Environment" color="green" />
         </div>

         {/* Lab Content */}
         <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            <div className="max-w-4xl mx-auto">
                
                {activeTab === 'identity' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <section className="space-y-2">
                            <label className="text-[10px] font-bold uppercase text-[var(--text-muted)] tracking-widest">System Prompt (The Soul)</label>
                            <textarea 
                                value={formData.basePrompt}
                                onChange={e => setFormData({ ...formData, basePrompt: e.target.value })}
                                className="w-full h-[400px] bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg p-4 font-mono text-sm leading-relaxed focus:border-[var(--color-primary)] outline-none"
                                placeholder="Define the personality, rules, and core logic..."
                            />
                        </section>
                    </div>
                )}

                {activeTab === 'cortex' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                         <ModelFilter 
                            allModels={models}
                            mode="HARD_SELECTION"
                            criteria={{
                                minContext: formData.minContext,
                                maxContext: formData.maxContext,
                                capabilities: {
                                    vision: formData.needsVision,
                                    reasoning: formData.needsReasoning,
                                    imageGen: formData.needsImageGeneration,
                                    tts: false,
                                    uncensored: formData.needsUncensored,
                                    coding: formData.needsCoding
                                }
                            }}
                            onChange={(crit) => {
                                setFormData({
                                    ...formData,
                                    minContext: crit.minContext,
                                    maxContext: crit.maxContext,
                                    needsVision: crit.capabilities.vision,
                                    needsReasoning: crit.capabilities.reasoning,
                                    needsImageGeneration: crit.capabilities.imageGen,
                                    needsUncensored: crit.capabilities.uncensored,
                                    needsCoding: crit.capabilities.coding
                                });
                            }}
                         />
                    </div>
                )}

                {activeTab === 'tuning' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
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
                    </div>
                )}

                {activeTab === 'tools' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                         <RoleToolSelector 
                            selectedTools={formData.tools}
                            onChange={(tools) => setFormData(prev => ({ ...prev, tools }))}
                         />
                         <div className="p-4 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded">
                            <span className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Active Tools ({formData.tools.length})</span>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {formData.tools.map(t => (
                                    <div key={t} className="px-2 py-1 bg-[var(--bg-primary)] border border-[var(--color-primary)]/50 text-[var(--color-primary)] text-[10px] font-bold rounded flex items-center gap-2">
                                        {t}
                                        <button onClick={() => setFormData(prev => ({ ...prev, tools: prev.tools.filter(x => x !== t) }))}>×</button>
                                    </div>
                                ))}
                            </div>
                         </div>
                    </div>
                )}

                {/* governance and context can be similar sections */}

            </div>
         </div>
      </div>
    </div>
  );
};

const DNATab = ({ active, onClick, icon: Icon, label, color }: { active: boolean, onClick: () => void, icon: React.ElementType, label: string, color: string }) => (
    <button 
        type="button"
        onClick={onClick}
        className={cn(
            "flex items-center gap-2 px-4 py-3 text-[10px] font-bold uppercase tracking-widest transition-all border-b-2",
            active 
                ? `border-[var(--color-${color},var(--color-primary))] text-[var(--color-${color},var(--color-primary))] bg-[var(--bg-primary)]/50` 
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        )}
    >
        <Icon size={14} />
        {label}
    </button>
);
