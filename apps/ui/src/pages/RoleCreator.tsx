import React, { useState } from 'react';
import { trpc } from '../utils/trpc.js';
import { Save, ChevronUp, ChevronDown } from 'lucide-react';

const CompactNumber = ({ value, onChange, min, max, step, label }: { value: number, onChange: (val: number) => void, min: number, max: number, step: number, label: string }) => (
  <div className="flex flex-col gap-0.5">
    <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">{label}</label>
    <div className="flex items-center bg-black border border-zinc-800 rounded h-6 w-24 overflow-hidden group hover:border-zinc-700 transition-colors">
       <input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full bg-transparent text-xs text-cyan-400 px-2 outline-none appearance-none font-mono" min={min} max={max} step={step} />
       <div className="flex flex-col h-full border-l border-zinc-800 bg-zinc-900 w-5">
          <button onClick={() => onChange(Math.min(max, value + step))} className="h-3 flex items-center justify-center hover:bg-zinc-700 text-zinc-500"><ChevronUp size={8}/></button>
          <button onClick={() => onChange(Math.max(min, value - step))} className="h-3 flex items-center justify-center hover:bg-zinc-700 text-zinc-500"><ChevronDown size={8}/></button>
       </div>
    </div>
  </div>
);

export default function RoleCreator({ mode = 'full' }: { mode?: 'full' | 'compact' }) {
  const [formData, setFormData] = useState({ name: '', basePrompt: '', minContext: 0, maxContext: 128000, temperature: 0.7 });

  // Currently fetches raw table. Once merged, can switch to trpc.model.list.useQuery()
  const { data: openRouterModels } = trpc.model.listOpenRouterModels.useQuery();

  const availableModelsCount = openRouterModels?.filter(m => m.contextLength >= formData.minContext && m.contextLength <= formData.maxContext).length || 0;

  return (
    <div className={`bg-black text-gray-100 font-mono text-xs ${mode === 'compact' ? 'p-3' : 'p-6 h-full'}`}>
       <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
             <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="NEW ROLE NAME" className="bg-transparent text-sm font-bold text-white placeholder-zinc-700 outline-none uppercase tracking-widest w-64 border-b border-transparent focus:border-cyan-500/50 transition-colors" />
             <div className="flex items-center gap-2 text-[10px] bg-zinc-900 px-2 py-1 rounded border border-zinc-800">
                <span className={`w-1.5 h-1.5 rounded-full ${availableModelsCount > 0 ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-red-500'}`}></span>
                <span className="text-cyan-400 font-bold">{availableModelsCount}</span>
                <span className="text-zinc-500 uppercase font-bold">Models Available</span>
             </div>
          </div>
          <button className="flex items-center gap-1 px-3 py-1 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded hover:bg-purple-500/20 hover:border-purple-500/50 transition-all uppercase font-bold text-[10px]">
             <Save size={12}/> Save Role
          </button>
       </div>
       <div className="flex gap-4 items-start">
          <div className="flex-1 relative group">
             <textarea value={formData.basePrompt} onChange={(e) => setFormData({...formData, basePrompt: e.target.value})} placeholder="System Instructions..." className={`w-full bg-zinc-900/30 border border-zinc-800 rounded p-3 text-xs font-mono text-zinc-300 outline-none focus:border-zinc-600 resize-none ${mode === 'compact' ? 'h-24' : 'h-64'}`} />
          </div>
          <div className="flex flex-col gap-3 w-auto min-w-[120px]">
              <CompactNumber label="Temperature" value={formData.temperature} onChange={(v: number) => setFormData({...formData, temperature: v})} step={0.1} min={0} max={2} />
              <div className="h-px bg-zinc-900 my-1" />
              <CompactNumber label="Min Context" value={formData.minContext} onChange={(v: number) => setFormData({...formData, minContext: v})} step={1000} min={0} max={200000} />
              <CompactNumber label="Max Context" value={formData.maxContext} onChange={(v: number) => setFormData({...formData, maxContext: v})} step={1000} min={0} max={200000} />
          </div>
       </div>
    </div>
  );
}
