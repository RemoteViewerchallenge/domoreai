import { useState, useEffect, useRef, useMemo } from 'react';
import { SwappableCard } from '../components/work-order/SwappableCard.js';
import { Button } from '../components/ui/button.js';
import { Plus } from 'lucide-react';
import { useColumnFocus } from '../hooks/useColumnFocus.js';
import { useHotkeys } from '../hooks/useHotkeys.js';
import { ThemeEditorSidebar } from '../components/appearance/ThemeEditorSidebar.js';
import { useTheme } from '../hooks/useTheme.js';
import { useWorkspaceStore } from '../stores/workspace.store.js';
import { trpc } from '../utils/trpc.js'; // Import trpc

export default function AgentWorkbench() {
  const { theme, setTheme } = useTheme();
  const { columns, showSidebar, setSidebarOpen, cards, setCards, addCard } = useWorkspaceStore();
  const { data: roles } = trpc.role.list.useQuery(); // Fetch roles
  const availableRoles = roles || [];
  
  // No local cards state anymore!
  // const [cards, setCards] = useState(...) -> Removed

  const [focusedCardIndex, setFocusedCardIndex] = useState<{ [key: number]: number }>({});

  const { setColumnFocus } = useColumnFocus(columns);

  const prevColumnsRef = useRef(columns);
  
  // Redistribute cards when columns change - Done in store or effect?
  // Let's keep this effect but update store
  useEffect(() => {
    // Only redistribute if columns actually changed
    if (prevColumnsRef.current !== columns) {
      const newCards = cards.map((card, index) => ({
          ...card,
          column: index % columns
      }));
      setCards(newCards);
      prevColumnsRef.current = columns;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columns]); // Only run when columns changes, not when cards changes

  // Group cards by column
  const cardsByColumn = useMemo(() => {
    const buckets: { [key: number]: typeof cards } = {};
    for (let i = 0; i < columns; i++) {
      buckets[i] = [];
    }
    cards.forEach(card => {
      if (buckets[card.column]) {
        buckets[card.column].push(card);
      }
    });
    return buckets;
  }, [cards, columns]);

  const handleSpawnCard = (columnIndex: number) => {
    if (availableRoles.length === 0) {
      alert('Please create at least one role in Creator Studio before spawning a card.');
      return;
    }
    const newId = String(Date.now());
    const newRoleId = availableRoles[0].id; // Assign the ID of the first available role
    addCard({ id: newId, roleId: newRoleId, column: columnIndex });
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
    <div className="flex flex-col flex-1 h-full w-full bg-[var(--color-background)] text-[var(--color-text)] overflow-hidden font-mono">
      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
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
                      <Button
                        key={c.id}
                        onClick={() => scrollToCardIndex(columnIndex, idx)}
                        variant="outline"
                        size="icon"
                        className="w-6 h-6 text-[10px] font-bold hover:bg-[var(--color-primary)] hover:text-black hover:border-[var(--color-primary)]"
                        title={`Go to card ${idx + 1}`}
                      >
                        {idx + 1}
                      </Button>
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
                    <SwappableCard
                      key={currentCard.id}
                      id={currentCard.id}
                      roleId={currentCard.roleId}
                    />
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
                    <Button
                      onClick={() => scrollToCardIndex(columnIndex, Math.max(0, currentFocusIndex - 1))}
                      disabled={currentFocusIndex === 0}
                      variant="ghost"
                      size="sm"
                      className="h-auto px-2 py-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                    >
                      ↑ Prev
                    </Button>
                    
                    <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">
                      {currentFocusIndex + 1}/{columnCards.length}
                    </span>
                    
                    <Button
                      onClick={() => scrollToCardIndex(columnIndex, Math.min(columnCards.length - 1, currentFocusIndex + 1))}
                      disabled={currentFocusIndex === columnCards.length - 1}
                      variant="ghost"
                      size="sm"
                      className="h-auto px-2 py-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                    >
                      Next ↓
                    </Button>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <Button
                      onClick={() => handleSpawnCard(columnIndex)}
                      variant="outline"
                      size="sm"
                      className="h-7 bg-[var(--color-primary)]/20 border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary)]/30 text-[10px] font-bold uppercase tracking-wider"
                    >
                      <Plus size={12} className="mr-1" />
                      Spawn Card
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showSidebar && (
        <ThemeEditorSidebar
          theme={theme}
          onUpdateTheme={setTheme}
          onClose={() => setSidebarOpen(false)}
        />
      )}
      </div>
    </div>
  );
}