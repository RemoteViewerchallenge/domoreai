
import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Send, Bot } from 'lucide-react';

export const AgentCapability: React.FC = () => {
  const [systemPromptOpen, setSystemPromptOpen] = useState(true);
  const [input, setInput] = useState('');

  return (
    <div className="flex flex-col h-full w-full bg-zinc-950 text-zinc-300 font-mono text-sm">
      {/* Top: Collapsible System Prompt */}
      <div className="border-b border-zinc-800">
        <button 
          onClick={() => setSystemPromptOpen(!systemPromptOpen)}
          className="flex items-center gap-2 w-full p-2 bg-zinc-900 hover:bg-zinc-800 transition-colors text-xs uppercase tracking-wider font-bold text-zinc-500"
        >
          {systemPromptOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          System Configuration
        </button>
        
        {systemPromptOpen && (
          <div className="p-2 bg-[#1e1e1e]">
             <textarea 
               className="w-full h-24 bg-transparent resize-none text-zinc-400 focus:outline-none text-xs"
               defaultValue="You are a helpful assistant capable of executing SQL queries and analyzing data provided in the context."
             />
          </div>
        )}
      </div>

      {/* Middle: Chat/Log Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-zinc-950">
        <div className="flex gap-3">
           <div className="w-6 h-6 rounded bg-blue-900/30 flex items-center justify-center text-blue-400 shrink-0">
             <Bot size={14} />
           </div>
           <div className="space-y-1">
             <div className="text-xs text-blue-400 font-bold">Agent</div>
             <p className="text-zinc-400 leading-relaxed">
               Ready to process commands. I have read access to the `users` table.
             </p>
           </div>
        </div>
        
        <div className="flex gap-3">
           <div className="w-6 h-6 rounded bg-zinc-800 flex items-center justify-center text-zinc-400 shrink-0">
             U
           </div>
           <div className="space-y-1">
             <div className="text-xs text-zinc-500 font-bold">User</div>
             <p className="text-zinc-300">
               Find all admin users created last week.
             </p>
           </div>
        </div>

        <div className="flex gap-3">
           <div className="w-6 h-6 rounded bg-blue-900/30 flex items-center justify-center text-blue-400 shrink-0">
             <Bot size={14} />
           </div>
           <div className="space-y-1">
             <div className="text-xs text-blue-400 font-bold">Agent</div>
             <p className="text-zinc-400 leading-relaxed">
               Running query: <span className="text-green-400 font-mono bg-green-400/10 px-1 rounded">SELECT * FROM users WHERE role = &apos;Admin&apos;</span>
             </p>
           </div>
        </div>
      </div>

      {/* Bottom: Command Input */}
      <div className="p-2 border-t border-zinc-800 bg-zinc-900 flex gap-2">
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Send a command..."
          className="flex-1 bg-black border border-zinc-700 rounded px-3 py-2 text-white focus:border-blue-500 focus:outline-none transition-colors"
        />
        <button className="bg-blue-600 hover:bg-blue-500 text-white rounded px-3 flex items-center justify-center transition-colors">
          <Send size={14} fill="currentColor" />
        </button>
      </div>
    </div>
  );
};
