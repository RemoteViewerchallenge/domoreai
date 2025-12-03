import { useState } from 'react';
import { SwappableCard } from '../components/work-order/SwappableCard.js';
import { Plus } from 'lucide-react';
import { useColumnFocus } from '../hooks/useColumnFocus.js';
import { useHotkeys } from '../hooks/useHotkeys.js';

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

  const { setColumnFocus } = useColumnFocus(columns);

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

  // Hotkeys for card selection (1-9)
  useHotkeys(
    Array.from({ length: 9 }).map((_, i) => ({
      id: `select-card-${i + 1}`,
      action: `Select Card ${i + 1}`,
      keys: `${i + 1}`
    })),
    Array.from({ length: 9 }).reduce<Record<string, () => void>>((acc, _, i) => {
      acc[`Select Card ${i + 1}`] = () => {
        // Find the card with this "visual index" (1-based flat index)
        // We iterate columns and cards to find the Nth card
        let count = 0;
        for (let col = 0; col < columns; col++) {
          const colCards = cardsByColumn[col] || [];
          if (count + colCards.length > i) {
            // Found the column
            const cardIdx = i - count;
            scrollToCardIndex(col, cardIdx);
            return;
          }
          count += colCards.length;
        }
      };
      return acc;
    }, {})
  );

  return (
    <div className="flex flex-col flex-1 w-full bg-[var(--color-background)] text-[var(--color-text)] overflow-hidden font-mono">
      {/* Column Controls */}
      <div className="flex-none h-7 bg-[var(--color-background-secondary)] border-b border-[var(--color-border)] flex items-center justify-end px-3">
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-[var(--color-text-muted)] uppercase tracking-wider">Columns:</span>
          <div className="flex items-center bg-[var(--color-background)] rounded border border-[var(--color-border)] h-5">
            <button
              onClick={() => handleSetColumns(Math.max(1, columns - 1))}
              className="px-2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-background-secondary)] rounded-l text-xs"
            >
              -
            </button>
            <span className="px-2 text-[10px] font-bold text-[var(--color-primary)] w-6 text-center">{columns}</span>
            <button
              onClick={() => handleSetColumns(Math.min(6, columns + 1))}
              className="px-2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-background-secondary)] rounded-r text-xs"
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
              className="flex-1 flex flex-col overflow-hidden bg-[var(--color-background-secondary)] border-r border-[var(--color-border)] last:border-r-0"
            >
              {/* Single Header Bar - Only if there are cards above current */}
              {currentFocusIndex > 0 && (
                <div className="flex-none bg-[var(--color-background)] border-b border-[var(--color-border)] flex items-center justify-center gap-1 px-2 h-8">
                  <div className="flex items-center gap-0.5 flex-wrap justify-center">
                    {columnCards.slice(0, currentFocusIndex).map((c, idx) => (
                      <button
                        key={c.id}
                        onClick={() => scrollToCardIndex(columnIndex, idx)}
                        className="w-6 h-6 flex items-center justify-center text-[10px] font-bold bg-[var(--color-background-secondary)] hover:bg-[var(--color-primary)] text-[var(--color-text-muted)] hover:text-black border border-[var(--color-border)] hover:border-[var(--color-primary)] rounded transition-all"
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
                  <div className="h-full flex items-center justify-center text-[var(--color-text-muted)]">
                    No cards in this column
                  </div>
                )}
              </div>

              {/* Single Footer Bar */}
              <div className="flex-none bg-[var(--color-background)] border-t border-[var(--color-border)] h-8">
                {columnCards.length > 0 ? (
                  <div className="h-full flex items-center justify-between px-3">
                    <button
                      onClick={() => scrollToCardIndex(columnIndex, Math.max(0, currentFocusIndex - 1))}
                      disabled={currentFocusIndex === 0}
                      className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      ↑ Prev
                    </button>
                    
                    <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">
                      {currentFocusIndex + 1}/{columnCards.length}
                    </span>
                    
                    <button
                      onClick={() => scrollToCardIndex(columnIndex, Math.min(columnCards.length - 1, currentFocusIndex + 1))}
                      disabled={currentFocusIndex === columnCards.length - 1}
                      className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      Next ↓
                    </button>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <button
                      onClick={() => handleSpawnCard(columnIndex)}
                      className="flex items-center gap-1 px-3 py-1 bg-[var(--color-primary)]/20 border border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary)]/30 rounded text-[10px] font-bold uppercase tracking-wider transition-all"
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