import { useState } from 'react';
import { SwappableCard } from '../components/work-order/SwappableCard.js';
import { Plus } from 'lucide-react';
import { useColumnFocus } from '../hooks/useColumnFocus.js';

export default function WorkSpace() {
  const [columns, setColumns] = useState(3);
  const [cards, setCards] = useState([
    { id: '1', roleId: '', column: 0 },
    { id: '2', roleId: '', column: 0 },
    { id: '3', roleId: '', column: 1 },
    { id: '4', roleId: '', column: 1 },
    { id: '5', roleId: '', column: 2 },
    { id: '6', roleId: '', column: 2 },
  ]);

  const [focusedCardIndex, setFocusedCardIndex] = useState<{ [key: number]: number }>({});

  const { setColumnFocus, getColumnFocus } = useColumnFocus(columns);

  // Redistribute cards when columns change
  const handleSetColumns = (newColumnCount: number) => {
    setColumns(newColumnCount);
    setCards(prevCards => 
      prevCards.map((card, index) => ({
        ...card,
        column: index % newColumnCount
      }))
    );
  };

  // Group cards by column
  const cardsByColumn: { [key: number]: typeof cards } = {};
  for (let i = 0; i < columns; i++) {
    cardsByColumn[i] = cards.filter(card => card.column === i);
  }

  const handleSpawnCard = (columnIndex: number) => {
    const newId = String(Date.now());
    setCards(prev => [...prev, { id: newId, roleId: '', column: columnIndex }]);
  };

  const scrollToCardIndex = (columnIndex: number, cardIndex: number) => {
    setFocusedCardIndex(prev => ({ ...prev, [columnIndex]: cardIndex }));
    const columnCards = cardsByColumn[columnIndex];
    if (columnCards && columnCards[cardIndex]) {
      const element = document.getElementById(`card-${columnCards[cardIndex].id}`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-black text-zinc-200 overflow-hidden font-mono">
      {/* Column Controls */}
      <div className="flex-none h-7 bg-zinc-950 border-b border-zinc-900 flex items-center justify-end px-3">
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-zinc-600 uppercase tracking-wider">Columns:</span>
          <div className="flex items-center bg-black rounded border border-zinc-800 h-5">
            <button
              onClick={() => handleSetColumns(Math.max(1, columns - 1))}
              className="px-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-l text-xs"
            >
              -
            </button>
            <span className="px-2 text-[10px] font-bold text-cyan-400 w-6 text-center">{columns}</span>
            <button
              onClick={() => handleSetColumns(Math.min(6, columns + 1))}
              className="px-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-r text-xs"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid - Columns */}
      <div className="flex-1 flex gap-0 overflow-hidden">
        {Array.from({ length: columns }).map((_, columnIndex) => {
          const columnCards = cardsByColumn[columnIndex] || [];
          const currentFocusIndex = focusedCardIndex[columnIndex] || 0;
          const currentCard = columnCards[currentFocusIndex];
          
          return (
            <div
              key={columnIndex}
              className="flex-1 flex flex-col overflow-hidden bg-zinc-900 border-r border-zinc-800 last:border-r-0"
            >
              {/* Single Header Bar - Only if there are cards above current */}
              {currentFocusIndex > 0 && (
                <div className="flex-none bg-zinc-950 border-b border-zinc-800 flex items-center justify-center gap-1 px-2 h-8">
                  <div className="flex items-center gap-0.5 flex-wrap justify-center">
                    {columnCards.slice(0, currentFocusIndex).map((c, idx) => (
                      <button
                        key={c.id}
                        onClick={() => scrollToCardIndex(columnIndex, idx)}
                        className="w-6 h-6 flex items-center justify-center text-[10px] font-bold bg-zinc-900 hover:bg-cyan-600 text-zinc-500 hover:text-white border border-zinc-800 hover:border-cyan-500 rounded transition-all"
                        title={`Go to card ${idx + 1}`}
                      >
                        {idx + 1}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Current Focused Card */}
              <div className="flex-1 min-h-0 overflow-hidden">
                {currentCard ? (
                  <div
                    id={`card-${currentCard.id}`}
                    className="h-full"
                    onMouseEnter={() => setColumnFocus(columnIndex, currentCard.id)}
                  >
                    <SwappableCard id={currentCard.id} roleId={currentCard.roleId} />
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-zinc-600">
                    No cards in this column
                  </div>
                )}
              </div>

              {/* Single Footer Bar */}
              <div className="flex-none bg-zinc-950 border-t border-zinc-800 h-8">
                {columnCards.length > 0 ? (
                  <div className="h-full flex items-center justify-between px-3">
                    <button
                      onClick={() => scrollToCardIndex(columnIndex, Math.max(0, currentFocusIndex - 1))}
                      disabled={currentFocusIndex === 0}
                      className="text-xs text-zinc-500 hover:text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      ↑ Prev
                    </button>
                    
                    <span className="text-[10px] text-zinc-600 uppercase tracking-wider">
                      {currentFocusIndex + 1}/{columnCards.length}
                    </span>
                    
                    <button
                      onClick={() => scrollToCardIndex(columnIndex, Math.min(columnCards.length - 1, currentFocusIndex + 1))}
                      disabled={currentFocusIndex === columnCards.length - 1}
                      className="text-xs text-zinc-500 hover:text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      Next ↓
                    </button>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <button
                      onClick={() => handleSpawnCard(columnIndex)}
                      className="flex items-center gap-1 px-3 py-1 bg-cyan-600/20 border border-cyan-500 text-cyan-400 hover:bg-cyan-600/30 rounded text-[10px] font-bold uppercase tracking-wider transition-all"
                    >
                      <Plus size={12} />
                      Spawn Card
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}