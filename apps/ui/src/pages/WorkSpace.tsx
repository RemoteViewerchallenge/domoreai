import React, { useState } from 'react';
import WorkOrderCard from '../components/work-order/WorkOrderCard.js';
import { Monitor, Plus, Trash2 } from 'lucide-react';

interface CardData {
  id: string;
  prompt: string;
  gen: string;
}

const WorkSpace: React.FC = () => {
  const [cards, setCards] = useState<CardData[]>([
    { id: '1', prompt: '', gen: '' },
    { id: '2', prompt: '', gen: '' },
    { id: '3', prompt: '', gen: '' },
  ]);

  const [cols, setCols] = useState(3);

  const handleAddCard = () => {
    const newCard = { id: String(Date.now()), prompt: '', gen: '' };
    setCards([...cards, newCard]);
  };

  const handleDeleteCard = (id: string) => {
    setCards(cards.filter(card => card.id !== id));
  };

  return (
    <div className="h-screen flex flex-col bg-black overflow-hidden font-mono text-xs">
      {/* Global Header */}
      <div className="flex-none h-8 bg-gray-950 flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <Monitor className="text-blue-500" size={14} />
          <span className="font-bold text-blue-400 uppercase tracking-wider">C.O.R.E. Workspace</span>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={handleAddCard}
            className="flex items-center gap-1 px-2 py-1 bg-blue-900/20 text-blue-500 hover:bg-blue-900/40 transition-colors"
          >
            <Plus size={12} />
            <span className="text-[10px] font-bold uppercase">Add Card</span>
          </button>
          <div className="flex items-center gap-2 text-[10px] text-gray-500">
            <span className="uppercase">Cols: {cols}</span>
            <input
              type="range"
              min="1"
              max="6"
              value={cols}
              onChange={(e) => setCols(Number(e.target.value))}
              className="w-16 h-1 bg-gray-800 appearance-none cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Grid Layout - Simple CSS Grid */}
      <div 
        className="flex-1 bg-black overflow-hidden grid"
        style={{
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridAutoRows: `minmax(0, 1fr)`,
          gap: '1px',
          backgroundColor: '#00ffff',
        }}
      >
        {cards.map((card) => (
          <div key={card.id} className="relative w-full h-full bg-black">
            <button
              onClick={() => handleDeleteCard(card.id)}
              className="absolute top-1 right-1 z-20 p-1 bg-red-900/50 text-red-400 hover:bg-red-900 transition-colors opacity-0 hover:opacity-100"
            >
              <Trash2 size={10} />
            </button>
            <WorkOrderCard
              id={card.id}
              promptValue={card.prompt}
              genValue={card.gen}
              onPromptChange={(val) => {
                const newCards = [...cards];
                const index = cards.findIndex(c => c.id === card.id);
                newCards[index].prompt = val;
                setCards(newCards);
              }}
              onGenChange={(val) => {
                const newCards = [...cards];
                const index = cards.findIndex(c => c.id === card.id);
                newCards[index].gen = val;
                setCards(newCards);
              }}
              isActive={true}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default WorkSpace;
