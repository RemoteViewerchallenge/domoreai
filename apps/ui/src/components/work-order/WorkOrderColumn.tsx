import React, { useState } from 'react';
import WorkOrderCard from './WorkOrderCard.js'; // Keeping .js for consistency with previous fixes
import { ChevronLeft, ChevronRight, Plus, MoreHorizontal } from 'lucide-react';

interface CardData {
  id: string;
  prompt: string;
  gen: string;
}

interface WorkOrderColumnProps {
  columnId: string;
  index: number;
}

const WorkOrderColumn: React.FC<WorkOrderColumnProps> = ({ columnId, index }) => {
  const [cards, setCards] = useState<CardData[]>([
    { id: `${columnId}-1`, prompt: '// Input Prompt...', gen: '// Output Generation...' },
  ]);
  const [activeIndex, setActiveIndex] = useState(0);

  const activeCard = cards[activeIndex];
  const totalCards = cards.length;

  const handleAddPage = () => {
    const newCard = { id: `${columnId}-${Date.now()}`, prompt: '', gen: '' };
    setCards([...cards, newCard]);
    setActiveIndex(cards.length);
  };

  const handlePrev = () => activeIndex > 0 && setActiveIndex(activeIndex - 1);
  const handleNext = () => activeIndex < totalCards - 1 && setActiveIndex(activeIndex + 1);

  return (
    <div className="flex flex-col h-full w-full bg-zinc-950 border-r border-zinc-800 last:border-r-0">
      
      {/* Header - Fixed Height */}
      <div className="flex-none h-8 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-3 select-none">
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${index % 2 === 0 ? 'bg-cyan-500' : 'bg-purple-500'}`}></div>
          <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider">Lane {index + 1}</span>
        </div>
        <MoreHorizontal size={14} className="text-zinc-600 hover:text-white cursor-pointer" />
      </div>

      {/* Viewport - THE CRITICAL FIX */}
      {/* flex-1: Grow to fill ALL available space */}
      {/* min-h-0: Allow shrinking if needed (stops overflow) */}
      {/* relative: Acts as the anchor for the Card */}
      <div className="flex-1 w-full relative min-h-0 bg-black">
        <WorkOrderCard
          id={activeCard.id}
          promptValue={activeCard.prompt}
          genValue={activeCard.gen}
          onPromptChange={(val: string) => {
            const newCards = [...cards];
            newCards[activeIndex].prompt = val;
            setCards(newCards);
          }}
          onGenChange={(val: string) => {
            const newCards = [...cards];
            newCards[activeIndex].gen = val;
            setCards(newCards);
          }}
          isActive={true}
        />
      </div>

      {/* Footer - Fixed Height */}
      <div className="flex-none h-8 bg-zinc-950 border-t border-zinc-800 flex items-center justify-between px-2 select-none z-50">
        <button onClick={handlePrev} disabled={activeIndex === 0} className="p-1 text-zinc-500 hover:text-white disabled:opacity-20">
          <ChevronLeft size={14} />
        </button>
        <span className="text-[9px] font-bold text-zinc-500">
          PAGE {activeIndex + 1} / {totalCards}
        </span>
        <div className="flex items-center gap-1">
          <button onClick={handleAddPage} className="p-1 text-zinc-500 hover:text-green-400" title="Add Page">
            <Plus size={14} />
          </button>
          <button onClick={handleNext} disabled={activeIndex === totalCards - 1} className="p-1 text-zinc-500 hover:text-white disabled:opacity-20">
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default WorkOrderColumn;
