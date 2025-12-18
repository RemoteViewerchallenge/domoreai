import React, { useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { useWorkspaceStore } from '../stores/workspace.store.js';

// ...

interface AIContextButtonProps {
  context?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const AIContextButton: React.FC<AIContextButtonProps> = ({ 
  context = "Global", 
  className = "",
  size = 'sm'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { aiContext, setAiContext } = useWorkspaceStore();

  const sizeClasses = {
    sm: 'p-1',
    md: 'p-2',
    lg: 'p-3'
  };

  const iconSizes = {
    sm: 12,
    md: 16,
    lg: 20
  };

  return (
    <div className={`relative inline-block ${className}`}>
      {/* ... Button ... */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={`
          ${sizeClasses[size]}
          rounded-full 
          ${aiContext.isLimiting ? 'bg-zinc-700 text-zinc-300 border-zinc-600' : 'bg-gradient-to-br from-purple-600 to-blue-600 text-white shadow-[0_0_10px_rgba(139,92,246,0.5)] border-white/10'}
          hover:shadow-lg
          transition-all duration-300 
          border 
          group
        `}
        title={`AI Context: ${context}`}
      >
        <Sparkles 
          size={iconSizes[size]} 
          className={`
            ${isOpen ? 'animate-spin-slow' : 'group-hover:animate-pulse'}
            ${aiContext.isLimiting ? 'opacity-50' : 'opacity-100'}
          `} 
        />
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-zinc-900/95 backdrop-blur-xl border border-zinc-700 rounded-xl shadow-2xl overflow-hidden z-[100] animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800 bg-zinc-800/50">
            <div className="flex items-center gap-2">
              <Sparkles size={12} className="text-purple-400" />
              <span className="text-xs font-bold text-zinc-200">Context Control</span>
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
              className="text-zinc-500 hover:text-zinc-300"
            >
              <X size={12} />
            </button>
          </div>
          <div className="p-3">
            <div className="text-[10px] text-zinc-400 mb-2 uppercase tracking-wider font-bold">Scope</div>
            <div className="bg-black/50 rounded p-2 text-xs text-zinc-300 font-mono border border-zinc-800 mb-3">
              {context}
            </div>
            
            <div className="space-y-2">
              <button 
                onClick={() => setAiContext({ isLimiting: !aiContext.isLimiting })}
                className={`w-full text-left text-[10px] px-2 py-1 rounded transition-colors flex items-center justify-between ${aiContext.isLimiting ? 'bg-purple-900/40 text-purple-300' : 'text-zinc-400 hover:bg-zinc-800'}`}
              >
                <span>Limit AI visibility</span>
                {aiContext.isLimiting && <span className="text-[8px] uppercase font-bold bg-purple-500/20 px-1 rounded">ON</span>}
              </button>
              
              <button 
                onClick={() => setAiContext({ injectedState: !aiContext.injectedState })}
                className={`w-full text-left text-[10px] px-2 py-1 rounded transition-colors flex items-center justify-between ${aiContext.injectedState ? 'bg-blue-900/40 text-blue-300' : 'text-zinc-400 hover:bg-zinc-800'}`}
              >
                 <span>Inject local state</span>
                 {aiContext.injectedState && <span className="text-[8px] uppercase font-bold bg-blue-500/20 px-1 rounded">ON</span>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
