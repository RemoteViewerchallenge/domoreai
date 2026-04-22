import { useWorkspaceStore } from '../stores/workspace.store.js';
import { SwappableCard } from '../components/work-order/SwappableCard.js';
import { Button } from '../components/ui/button.js';
import { Plus, ShieldCheck, ExternalLink } from 'lucide-react';
import { useColumnFocus } from '../hooks/useColumnFocus.js';
import { useHotkeys } from '../hooks/useHotkeys.js';
import { trpc } from '../utils/trpc.js';
import { useState, useRef, useMemo, useEffect } from 'react';
import { cn } from '../lib/utils.js';
import { AddProviderForm } from '../components/AddProviderForm.js';
import { ProviderHealth } from '../components/ProviderHealth.js';
import { Link } from 'react-router-dom';



// Suggested Edit: Headless Scaffold Pattern
export const AgentWorkbenchScaffold = ({ 
  header, 
  sidebar, 
  content 
}: { 
  header?: React.ReactNode, 
  sidebar?: React.ReactNode, 
  content?: React.ReactNode 
}) => {
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-zinc-950">
      {header && <div className="h-16 border-b border-zinc-800 shrink-0">{header}</div>}
      <div className="flex flex-1 overflow-hidden">
        {sidebar && <div className="w-72 border-r border-zinc-800 shrink-0">{sidebar}</div>}
        <main className="flex-1 overflow-auto">
          {content}
        </main>
      </div>
    </div>
  );
};

export default function AgentWorkbench({ className }: { className?: string }) {
  const { 
    columns, cards, setCards, addCard, loadWorkspace, 
    activeWorkspace, activeScreenspaceId, showControlPlane 
  } = useWorkspaceStore();
  const { data: roles } = trpc.roles.list.useQuery(); 
  const availableRoles = Array.isArray(roles) ? roles : [];

  useEffect(() => {
    if (!activeWorkspace) loadWorkspace('default');
  }, [activeWorkspace, loadWorkspace]);

  const [focusedCardIndex, setFocusedCardIndex] = useState<{ [key: number]: number }>({});
  const { setColumnFocus } = useColumnFocus(columns);
  const prevColumnsRef = useRef(columns);
  
  useEffect(() => {
    if (prevColumnsRef.current !== columns && Array.isArray(cards)) {
      const newCards = cards.map((card, index) => ({
          ...card,
          column: index % columns
      }));
      setCards(newCards);
      prevColumnsRef.current = columns;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columns, cards]);


  const filteredCards = useMemo(() => {
    const spaceId = activeScreenspaceId || 1;
    return cards.filter(c => (c.screenspaceId || 1) === spaceId);
  }, [cards, activeScreenspaceId]);

  const cardsByColumn = useMemo(() => {
    const buckets: { [key: number]: typeof cards } = {};
    for (let i = 0; i < columns; i++) {
      buckets[i] = [];
    }
    filteredCards.forEach(card => {
      if (buckets[card.column]) {
        buckets[card.column].push(card);
      }
    });
    return buckets;
  }, [filteredCards, columns]);

  const handleSpawnCard = (columnIndex: number) => {
    if (availableRoles.length === 0) {
      alert('Please create at least one role in Creator Studio before spawning a card.');
      return;
    }
    const newId = String(Date.now());
    const newRoleId = availableRoles[0].id;
    addCard({ id: newId, roleId: newRoleId, column: columnIndex, screenspaceId: activeScreenspaceId });
  };

  const scrollToCardIndex = (columnIndex: number, cardIndex: number) => {
    setFocusedCardIndex(prev => ({ ...prev, [columnIndex]: cardIndex }));
    const columnCards = cardsByColumn[columnIndex];
    if (columnCards && columnCards[cardIndex]) {
      const element = document.getElementById(`card-${columnCards[cardIndex].id}`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // 🟢 GOOD: Hotkeys now respect input fields
  useHotkeys(
    Array.from({ length: 9 }).map((_, i) => ({
      id: `select-card-${i + 1}`,
      action: `Select Card ${i + 1}`,
      keys: `${i + 1}`
    })),
    Array.from({ length: 9 }).reduce<Record<string, () => void>>((acc, _, i) => {
      acc[`Select Card ${i + 1}`] = () => {
        // Prevent hotkey if user is typing in an input
        const activeElement = document.activeElement as HTMLElement;
        const activeTag = activeElement?.tagName;
        const isEditable = activeElement?.contentEditable === 'true' || 
                          activeElement?.isContentEditable ||
                          activeElement?.closest('.ProseMirror') !== null ||
                          activeElement?.closest('.monaco-editor') !== null;
        
        if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || isEditable) {
            return;
        }

        let count = 0;
        for (let col = 0; col < columns; col++) {
          const colCards = cardsByColumn[col] || [];
          if (count + colCards.length > i) {
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

  const [activeTab, setActiveTab] = useState<'cards' | 'health'>('cards');

  return (
    <AgentWorkbenchScaffold
      header={null}
      sidebar={showControlPlane ? (
        <div className="flex flex-col h-full p-4 space-y-6 overflow-y-auto bg-zinc-950 border-r border-zinc-800 animate-in slide-in-from-left duration-300">
          
          <div className="flex bg-zinc-900 rounded-lg p-0.5 border border-zinc-800 mb-2">
              <button 
                  onClick={() => setActiveTab('cards')}
                  className={cn(
                      "flex-1 px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all",
                      activeTab === 'cards' ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"
                  )}
              >
                  Workspace
              </button>
              <button 
                  onClick={() => setActiveTab('health')}
                  className={cn(
                      "flex-1 px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all",
                      activeTab === 'health' ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"
                  )}
              >
                  Health
              </button>
              <div className="w-px h-3 bg-zinc-800 mx-1 self-center" />
              <Link 
                  to="/control-plane" 
                  className="px-2 py-1 text-zinc-500 hover:text-emerald-400 transition-colors flex items-center justify-center"
                  title="Open Full Page"
              >
                  <ExternalLink size={10} />
              </Link>
          </div>

          <div className="space-y-4">
            <h4 className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest px-2 flex items-center gap-2">
                <ShieldCheck size={12} className="text-emerald-500" /> Control Plane
            </h4>
            <AddProviderForm onSuccess={() => console.log('Provider added')} />
          </div>

          <div className="divider opacity-20"></div>

          <div className="space-y-2">
            <h4 className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest px-2">Live Insights</h4>
            <div className="space-y-1">
                <div className="text-[9px] p-2 bg-emerald-500/10 text-emerald-400 rounded border border-emerald-500/20">
                    [16:34] Scouted 12 new models.
                </div>
                <div className="text-[9px] p-2 bg-indigo-500/10 text-indigo-400 rounded border border-indigo-500/20">
                    [16:35] MAB Preference: DeepSeek-V3.
                </div>
            </div>
          </div>
        </div>
      ) : null}
      content={
        <div className={cn("h-full w-full flex flex-col overflow-hidden relative", className)}>
          {activeTab === 'health' && showControlPlane ? (
            <div className="p-6 h-full overflow-hidden bg-zinc-950">
                <ProviderHealth />
            </div>
          ) : (
            <div className="flex-1 flex overflow-hidden">
                <div className="flex-1 flex gap-0 overflow-hidden bg-zinc-950">
                  {Array.from({ length: columns }).map((_, columnIndex) => {
                    const columnCards = cardsByColumn[columnIndex] || [];
                    const currentFocusIndex = focusedCardIndex[columnIndex] || 0;
                    const currentCard = columnCards[currentFocusIndex];
                    
                    return (
                      <div
                        key={columnIndex}
                        className="flex-1 flex flex-col overflow-hidden bg-[var(--color-background-secondary)] border-r border-[var(--color-border)] last:border-r-0"
                      >
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
                              />
                            </div>
                          ) : (
                            <div className="h-full flex items-center justify-center text-[var(--color-text-muted)]">
                              No cards in this column
                            </div>
                          )}
                        </div>

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
            </div>
          )}
        </div>
      }
    />
  );
}
