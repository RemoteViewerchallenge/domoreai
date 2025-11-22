import React, { useState } from 'react';
import WorkOrderCard from './WorkOrderCard.js';
import { ChevronUp, ChevronDown, Plus } from 'lucide-react';

interface CardData {
  id: string;
  prompt: string;
  gen: string;
}

const WorkOrderColumn: React.FC = () => {
  const [cards, setCards] = useState<CardData[]>([
    { id: '1', prompt: '# Initial Prompt\nDescribe the architecture...', gen: '// Architecture Overview...' },
    { id: '2', prompt: 'Refine the database schema', gen: 'model User {\n  id String @id\n}' },
  ]);
  const [activeIndex, setActiveIndex] = useState(0);

  const activeCard = cards[activeIndex];
  const totalCards = cards.length;

  const handleAddCard = () => {
    const newCard = { id: String(Date.now()), prompt: '', gen: '' };
    setCards([...cards, newCard]);
    setActiveIndex(cards.length); // Go to new card
  };

  const handlePrev = () => {
    if (activeIndex > 0) setActiveIndex(activeIndex - 1);
  };

  const handleNext = () => {
    if (activeIndex < totalCards - 1) setActiveIndex(activeIndex + 1);
  };

  const handleJump = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const val = parseInt(e.currentTarget.value);
      if (!isNaN(val) && val >= 1 && val <= totalCards) {
        setActiveIndex(val - 1);
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-black font-mono text-xs">
      {/* Active Card Area (Top, Larger) */}
      <div className="flex-[2] min-h-0 flex flex-col">
        <WorkOrderCard
          id={activeCard.id}
          promptValue={activeCard.prompt}
          genValue={activeCard.gen}
          onPromptChange={(val) => {
            const newCards = [...cards];
            newCards[activeIndex].prompt = val;
            setCards(newCards);
          }}
          onGenChange={(val) => {
            const newCards = [...cards];
            newCards[activeIndex].gen = val;
            setCards(newCards);
          }}
          isActive={true}
        />
      </div>

      {/* Next Card Area (Bottom, Smaller) */}
      {activeIndex < totalCards - 1 ? (
        <div 
          className="flex-1 min-h-0 flex flex-col opacity-50 hover:opacity-100 transition-opacity cursor-pointer"
          onClick={handleNext}
        >
          <WorkOrderCard
            id={cards[activeIndex + 1].id}
            promptValue={cards[activeIndex + 1].prompt}
            genValue={cards[activeIndex + 1].gen}
            onPromptChange={(val) => {
              const newCards = [...cards];
              newCards[activeIndex + 1].prompt = val;
              setCards(newCards);
            }}
            onGenChange={(val) => {
              const newCards = [...cards];
              newCards[activeIndex + 1].gen = val;
              setCards(newCards);
            }}
            isActive={false}
          />
        </div>
      ) : (
        <div 
          className="flex-1 min-h-0 flex items-center justify-center bg-gray-950/30 cursor-pointer hover:bg-gray-900/50 transition-colors"
          onClick={handleAddCard}
        >
          <div className="flex flex-col items-center text-gray-700 hover:text-blue-500">
            <Plus size={24} />
            <span className="text-xs font-bold uppercase mt-2">New Card</span>
          </div>
        </div>
      )}

      {/* Pagination / Jump Control */}
      <div className="flex items-center justify-between px-2 py-1 bg-gray-950">
        <button 
          onClick={handlePrev} 
          disabled={activeIndex === 0}
          className="p-0.5 text-gray-600 hover:text-white disabled:opacity-30"
        >
          <ChevronUp size={10} />
        </button>
        
        <div className="flex items-center gap-1 text-[10px] text-gray-500">
          <span>PG</span>
          <input 
            type="text" 
            className="w-6 text-center bg-black border border-gray-800 text-white focus:border-blue-500 focus:outline-none"
            placeholder={String(activeIndex + 1)}
            onKeyDown={handleJump}
          />
          <span>/ {totalCards}</span>
        </div>

        <button 
          onClick={handleNext} 
          disabled={activeIndex === totalCards - 1}
          className="p-0.5 text-gray-600 hover:text-white disabled:opacity-30"
        >
          <ChevronDown size={10} />
        </button>
      </div>
    </div>
  );
};

export default WorkOrderColumn;
