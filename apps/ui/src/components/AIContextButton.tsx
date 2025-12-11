import React, { useState } from 'react';
import { Sparkles, X } from 'lucide-react';

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
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={`
          ${sizeClasses[size]} 
          rounded-full 
          bg-gradient-to-br from-purple-600 to-blue-600 
          hover:from-purple-500 hover:to-blue-500 
          text-white 
          shadow-[0_0_10px_rgba(139,92,246,0.5)] 
          hover:shadow-[0_0_15px_rgba(139,92,246,0.8)] 
          transition-all duration-300 
          border border-white/10
          group
        `}
        title={`AI Context: ${context}`}
      >
        <Sparkles 
          size={iconSizes[size]} 
          className={`
            ${isOpen ? 'animate-spin-slow' : 'group-hover:animate-pulse'}
          `} 
        />
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-zinc-900/95 backdrop-blur-xl border border-zinc-700 rounded-xl shadow-2xl overflow-hidden z-[100] animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800 bg-zinc-800/50">
            <div className="flex items-center gap-2">
              <Sparkles size={12} className="text-purple-400" />
              <span className="text-xs font-bold text-zinc-200">Context Limiter</span>
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
              className="text-zinc-500 hover:text-zinc-300"
            >
              <X size={12} />
            </button>
          </div>
          <div className="p-3">
            <div className="text-[10px] text-zinc-400 mb-2 uppercase tracking-wider font-bold">Current Scope</div>
            <div className="bg-black/50 rounded p-2 text-xs text-zinc-300 font-mono border border-zinc-800 mb-3">
              {context}
            </div>
            
            <div className="space-y-2">
              <button className="w-full text-left text-[10px] text-zinc-400 hover:text-purple-400 hover:bg-purple-900/20 px-2 py-1 rounded transition-colors">
                Limit AI visibility to this component
              </button>
              <button className="w-full text-left text-[10px] text-zinc-400 hover:text-blue-400 hover:bg-blue-900/20 px-2 py-1 rounded transition-colors">
                Inject local state as context
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
