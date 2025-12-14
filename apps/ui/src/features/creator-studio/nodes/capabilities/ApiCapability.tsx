import React from 'react';
import { Send, Plus } from 'lucide-react';

export const ApiCapability = ({ error }: { error?: string }) => {
  return (
    <div className="flex flex-col h-full w-full font-mono text-[10px]">
      
      {/* 1. Request Bar */}
      <div className="flex items-center border-b border-zinc-800 h-8 px-1 gap-1">
        <select className="bg-zinc-900 text-[var(--color-secondary)] font-bold px-1 py-0.5 rounded border border-zinc-800 focus:outline-none">
            <option>GET</option>
            <option>POST</option>
        </select>
        <input 
            className="flex-1 bg-transparent text-zinc-300 px-2 placeholder:text-zinc-700 focus:outline-none"
            defaultValue="https://api.openai.com/v1/models"
        />
        <button className="px-3 py-1 bg-[var(--color-secondary)]/20 text-[var(--color-secondary)] hover:bg-[var(--color-secondary)]/30 rounded flex items-center gap-1 transition-colors">
            <Send size={10} /> SEND
        </button>
      </div>

      {/* 2. Content Area */}
      <div className="flex-1 flex flex-col bg-zinc-950 overflow-hidden">
         {/* Tabs */}
         <div className="flex border-b border-zinc-800 text-zinc-500">
            <div className="px-3 py-1 border-b-2 border-[var(--color-secondary)] text-zinc-200 bg-zinc-900/50">Response</div>
            <div className="px-3 py-1 hover:text-zinc-300 cursor-pointer">Headers</div>
            <div className="px-3 py-1 hover:text-zinc-300 cursor-pointer">Body</div>
         </div>

         {/* JSON View */}
         <div className="flex-1 p-2 overflow-auto custom-scrollbar">
            <pre className="text-[var(--color-text)] opacity-80">
{`{
  "object": "list",
  "data": [
    {
      "id": "model-1",
      "object": "model",
      "owned_by": "system",
      "permission": []
    }
  ]
}`}
            </pre>
         </div>
      </div>
    </div>
  );
};
