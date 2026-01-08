
import React, { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { trpc } from '../../utils/trpc.js';
import { 
  Brain, Sparkles, Dna, Save, 
  Settings as SettingsIcon,
  CheckCircle, Briefcase, X, ChevronDown
} from 'lucide-react';
import DualRangeSlider from '../DualRangeSlider.js';
import CompactRoleSelector from '../CompactRoleSelector.js';
import { RoleToolSelector } from '../role/RoleToolSelector.js'; // NEW
import { useModelFilter } from '../../hooks/useModelFilter.js'; // NEW
import type { Model } from '@/types/role.js'; // NEW

// Tabs
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
    
    // Fetch Roles for Display Name
    const { data: roles } = trpc.role.list.useQuery();
    
    const [dna, setDna] = useState({
        temperature: 0.7,   
        topP: 1.0,          
        contextWindow: 4096, 
        modelId: null as string | null,
        providerId: null as string | null,
        genes: {} as Record<string, string>,
        tools: [] as string[] // NEW
    });

    const handleRoleSelect = (newRoleId: string) => {
        setRoleId(newRoleId);
        setShowRolePicker(false);
        if (onUpdateConfig) {
             onUpdateConfig({ 
                 roleId: newRoleId,
                 modelId: dna.modelId,
                 temperature: dna.temperature,
                 maxTokens: dna.contextWindow
             });
        }
    };
    
    const handleApplyChanges = () => {
         if (onUpdateConfig) {
             onUpdateConfig({ 
                 roleId: roleId,
                 modelId: dna.modelId,
                 temperature: dna.temperature,
                 maxTokens: dna.contextWindow
             });
             toast.success("Configuration Applied");
         }
    };

    // --- Tuning Logic ---
    const creativity = Math.round((dna.temperature / 1.5) * 100);
    const setCreativity = (val: number) => {
        setDna(prev => ({ ...prev, temperature: (val / 100) * 1.5 }));
    };

    // --- Brain Logic ---
    const [minCtx, setMinCtx] = useState(0);
    const [maxCtx, setMaxCtx] = useState(200000);
    const [reqVision, setReqVision] = useState(false);
    const [reqReasoning, setReqReasoning] = useState(false);

    const { data: models } = trpc.providers.listAllAvailableModels.useQuery();
    const { data: toolsList } = trpc.tool.list.useQuery(); // NEW

    // Use shared hook
    const { filteredModels, groupedModels } = useModelFilter(models as Model[], {
        minContext: minCtx,
        maxContext: maxCtx,
        needsVision: reqVision,
        needsReasoning: reqReasoning
    });
    
    // Legacy mapping for UI if needed, but hook provides groupedModels directly
    // const filteredModels = useMemo(...) -> replaced by hook
    // const groupedModels = useMemo(...) -> replaced by hook

    const currentRoleName = useMemo(() => {
        return roles?.find(r => r.id === roleId)?.name || 'Select Role...';
    }, [roles, roleId]);

    return (
        <div className="flex flex-col h-full w-full bg-zinc-950 text-zinc-300 font-mono text-xs relative">
            
            {/* Role Picker Modal Overlay */}
            {showRolePicker && (
                <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center pt-20 animate-in fade-in duration-200">
                    <div className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl w-[400px] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-3 border-b border-zinc-800 bg-zinc-950">
                            <span className="font-bold text-zinc-100 flex items-center gap-2">
                                <Briefcase size={14} className="text-blue-400"/> Select Role
                            </span>
                            <button onClick={() => setShowRolePicker(false)} className="text-zinc-500 hover:text-white">
                                <X size={14} />
                            </button>
                        </div>
                        <div className="h-[400px] overflow-hidden">
                            <CompactRoleSelector 
                                onSelect={handleRoleSelect} 
                                selectedRoleId={roleId}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex-none border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between px-4 h-12">
                <div className="flex items-center gap-4">
                    {/* Role Trigger Button */}
                    <button 
                        onClick={() => setShowRolePicker(true)}
                        className="flex items-center gap-2 font-bold text-zinc-100 hover:text-blue-400 transition-colors bg-white/5 px-3 py-1.5 rounded border border-white/10 hover:border-blue-500/50"
                    >
                        <Briefcase size={14} className="text-blue-400"/>
                        <span className="truncate max-w-[120px]">{currentRoleName}</span>
                        <ChevronDown size={12} className="opacity-50"/>
                    </button>

                    <div className="h-4 w-[1px] bg-zinc-800" />

                    {/* Tabs */}
                    <div className="flex bg-black/40 rounded p-1 gap-1">
                        <TabButton active={activeTab === 'tuning'} onClick={() => setActiveTab('tuning')} icon={<Sparkles size={14}/>} label="Tuning" />
                        <TabButton active={activeTab === 'brain'} onClick={() => setActiveTab('brain')} icon={<Brain size={14}/>} label="Brain" />
                        <TabButton active={activeTab === 'dna'} onClick={() => setActiveTab('dna')} icon={<Dna size={14}/>} label="DNA" />
                    </div>
                </div>

                <div className="flex gap-2">
                     <button 
                        onClick={handleApplyChanges}
                        className="flex items-center gap-2 bg-blue-600/20 text-blue-400 px-3 py-1.5 rounded hover:bg-blue-600/30 transition-colors font-bold uppercase tracking-wider"
                    >
                        <Save size={14} /> Apply
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden relative">
                
                {/* 1. Tuning (Natural Language) */}
                {activeTab === 'tuning' && (
                    <div className="p-8 max-w-2xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-2">
                        {/* Creativity Slider */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-baseline">
                                <label className="text-sm font-bold text-zinc-100">Creativity</label>
                                <span className="text-xs text-cyan-400 font-mono">{creativity}%</span>
                            </div>
                            <p className="text-[10px] text-zinc-500">
                                Controls randomness and temperature.
                            </p>
                            <input 
                                type="range" 
                                min="0" max="100" 
                                value={creativity}
                                onChange={e => setCreativity(parseInt(e.target.value))}
                                className="w-full accent-cyan-500 h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                            />
                            <div className="flex justify-between text-[9px] uppercase text-zinc-600 font-bold tracking-widest">
                                <span>Robot</span>
                                <span>Balanced</span>
                                <span>Artist</span>
                            </div>
                        </div>

                        {/* Max Output Tokens */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-baseline">
                                <label className="text-sm font-bold text-zinc-100">Max Response Length</label>
                                <span className="text-xs text-purple-400 font-mono">{dna.contextWindow} Tokens</span>
                            </div>
                            <input 
                                type="range" 
                                min="256" max="32000" step="256"
                                value={dna.contextWindow}
                                onChange={e => setDna(p => ({ ...p, contextWindow: parseInt(e.target.value) }))}
                                className="w-full accent-purple-500 h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>
                    </div>
                )}

                {/* 2. Brain (Model Selector) */}
                {activeTab === 'brain' && (
                    <div className="h-full flex flex-col p-6 max-w-4xl mx-auto gap-6 animate-in fade-in slide-in-from-bottom-2">
                        {/* Filters */}
                        <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg space-y-4">
                            <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase">
                                <SettingsIcon size={14}/> Capability Requirements
                            </div>
                            
                            <DualRangeSlider 
                                min={0} max={200000} step={1000}
                                value={[minCtx, maxCtx]}
                                onChange={([min, max]) => { setMinCtx(min); setMaxCtx(max); }}
                                label="Context Window Range"
                                unit="tk"
                            />

                            <div className="flex gap-6">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={reqVision} onChange={e => setReqVision(e.target.checked)} className="accent-blue-500" />
                                    <span className="text-[10px]">Requires Vision</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={reqReasoning} onChange={e => setReqReasoning(e.target.checked)} className="accent-blue-500" />
                                    <span className="text-[10px]">Requires Reasoning</span>
                                </label>
                            </div>
                        </div>

                        {/* Results */}
                        <div className="flex-1 overflow-y-auto border border-zinc-800 rounded-lg bg-black/20">
                            <div className="p-3 bg-zinc-900 border-b border-zinc-800 text-[10px] font-bold uppercase text-zinc-500 sticky top-0">
                                Available Models ({filteredModels.length})
                            </div>
                            {Object.entries(groupedModels).map(([provider, list]) => (
                                <div key={provider}>
                                    <div className="bg-zinc-900/30 px-3 py-1 text-[9px] font-bold text-zinc-600 uppercase tracking-widest sticky top-10">
                                        {provider}
                                    </div>
                                    {list.map((m: any) => (
                                        <div 
                                            key={m.id} 
                                            onClick={() => setDna(prev => ({ ...prev, modelId: m.id, providerId: m.providerId }))}
                                            className={`px-4 py-2 border-b border-zinc-800/50 cursor-pointer hover:bg-zinc-800/50 flex justify-between items-center ${dna.modelId === m.id ? 'bg-blue-900/20 border-l-2 border-l-blue-500' : ''}`}
                                        >
                                            <div>
                                                <div className={`font-mono text-xs ${dna.modelId === m.id ? 'text-blue-400 font-bold' : 'text-zinc-300'}`}>
                                                    {m.name}
                                                </div>
                                                <div className="text-[9px] text-zinc-500 mt-0.5">{m.id}</div>
                                            </div>
                                            <div className="flex gap-4 text-[10px] font-mono text-zinc-500">
                                                <span>{(m.contextWindow || m.specs?.contextWindow || 0) / 1000}k ctx</span>
                                                {dna.modelId === m.id && <CheckCircle size={12} className="text-blue-500" />}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 3. DNA Editor (Raw) */}
                {activeTab === 'dna' && (
                    <div className="h-full flex flex-col p-4 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-2 overflow-y-auto">
                         <h4 className="text-xs font-bold text-zinc-400 uppercase mb-4">Capabilities & Tools</h4>
                         <RoleToolSelector 
                            availableTools={toolsList as any[] || []}
                            selectedTools={dna.tools}
                            onChange={(tools) => setDna(prev => ({ ...prev, tools }))}
                         />
                    </div>
                )}
            </div>
        </div>
    );
};

// Subcomponent
const TabButton = ({ active, onClick, icon, label }: any) => (
    <button 
        onClick={onClick}
        className={`flex items-center gap-2 px-3 py-1.5 rounded text-[10px] font-medium transition-all ${
            active 
            ? 'bg-zinc-800 text-white shadow-sm' 
            : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
        }`}
    >
        {icon}
        {label}
    </button>
);
