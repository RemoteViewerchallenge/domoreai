import { useState } from 'react';
import { Plus, ChevronUp } from 'lucide-react';

interface BottomSummaryBarProps {
  cardCount: number;
  onSpawnCard: () => void;
}

export const BottomSummaryBar = ({ cardCount, onSpawnCard }: BottomSummaryBarProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      className={`flex-none bg-zinc-950 border-t border-zinc-900 transition-all duration-200 overflow-hidden ${
        isExpanded ? 'h-16' : 'h-6'
      }`}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      {/* Expanded View */}
      <div className={`flex flex-col gap-2 p-2 ${isExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'} transition-opacity`}>
        <div className="h-6 border-2 border-dashed border-zinc-800 rounded flex items-center justify-center text-[9px] text-zinc-700 uppercase">
          Drop Zone
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--color-text-secondary)] font-mono">Cards Below: {cardCount}</span>
          <button
            onClick={onSpawnCard}
            className="flex items-center gap-1 px-2 py-1 bg-cyan-600/20 border border-cyan-500 text-cyan-400 hover:bg-cyan-600/30 rounded text-[10px] font-bold uppercase tracking-wider transition-all"
          >
            <Plus size={12} />
            Spawn Card
          </button>
        </div>
      </div>

      {/* Collapsed View */}
      <div className={`flex items-center justify-between px-3 h-6 ${isExpanded ? 'opacity-0' : 'opacity-100'} transition-opacity`}>
        <span className="text-[9px] text-zinc-600 font-mono uppercase tracking-wider">
          Cards Below: {cardCount}
        </span>
        <ChevronUp size={10} className="text-zinc-700" />
      </div>
    </div>
  );
};