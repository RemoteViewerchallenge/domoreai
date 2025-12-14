import React, { useState } from 'react';
import { Send, Sparkles } from 'lucide-react';

export const ApiCapability = () => {
  const [url, setUrl] = useState('https://api.openai.com/v1/models');
  
  return (
    <div className="flex flex-col h-full w-full bg-zinc-950 font-mono text-[10px]">
      {/* 1. Address Bar */}
      <div className="flex items-center gap-1 p-1 border-b border-zinc-800 h-9">
         <select className="bg-zinc-900 border border-zinc-700 text-emerald-400 font-bold rounded px-2 h-full focus:outline-none">
            <option>GET</option>
            <option>POST</option>
         </select>
         <div className="flex-1 relative">
            <input 
               list="api-endpoints" 
               className="w-full h-full bg-zinc-900/50 border border-zinc-800 rounded px-2 text-zinc-300 focus:border-emerald-500 focus:outline-none"
               value={url}
               onChange={e => setUrl(e.target.value)}
            />
            <datalist id="api-endpoints">
               <option value="https://api.openai.com/v1/models" />
               <option value="https://api.anthropic.com/v1/messages" />
               <option value="http://localhost:3000/trpc/health" />
            </datalist>
         </div>
         <button className="h-full px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold flex items-center gap-1">
            <Send size={10} /> SEND
         </button>
      </div>

      {/* 2. Response (AI Formatted) */}
      <div className="flex-1 p-2 text-zinc-400 overflow-auto">
         <div className="text-zinc-600 mb-2 italic flex items-center gap-1">
            <Sparkles size={10} className="text-purple-500"/>
            Formatted by AI Agent
         </div>
         {/* Mock Formatted View */}
         <div className="border border-zinc-800 rounded bg-zinc-900/30 p-2 space-y-1">
            <div className="flex justify-between border-b border-zinc-800 pb-1">
               <span className="text-zinc-500 uppercase">Status</span>
               <span className="text-emerald-400 font-bold">200 OK</span>
            </div>
            <div className="flex justify-between pt-1">
               <span className="text-zinc-500 uppercase">Latency</span>
               <span className="text-zinc-300">142ms</span>
            </div>
         </div>
      </div>
    </div>
  );
};
