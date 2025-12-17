import { useState, useCallback } from 'react';
import { SuperAiButton } from '@/components/ui/SuperAiButton.js';
import { SwappableCard } from '@/components/work-order/SwappableCard.js';
import { Mic, MicOff, Maximize2, X, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils.js';

interface CardStackItem {
  id: string;
  roleId?: string;
  title: string;
}

export const FocusWorkspace = () => {
  // Stack of active cards - index 0 is Stage, index 1 is Context, 2+ are in Ticker
  const [activeCards, setActiveCards] = useState<CardStackItem[]>([
    { id: 'card-1', title: 'Main Workspace', roleId: undefined },
    { id: 'card-2', title: 'Reference Context', roleId: undefined },
    { id: 'card-3', title: 'Background Task', roleId: undefined },
  ]);

  const [isVoiceActive, setIsVoiceActive] = useState(false);

  // Move a card to the Stage (index 0)
  const promoteToStage = useCallback((cardId: string) => {
    setActiveCards(prev => {
      const cardIndex = prev.findIndex(c => c.id === cardId);
      if (cardIndex === -1 || cardIndex === 0) return prev;
      
      const newStack = [...prev];
      const [card] = newStack.splice(cardIndex, 1);
      newStack.unshift(card);
      return newStack;
    });
  }, []);

  // Remove a card from the stack
  const removeCard = useCallback((cardId: string) => {
    setActiveCards(prev => prev.filter(c => c.id !== cardId));
  }, []);

  // Toggle voice input
  const toggleVoice = useCallback(() => {
    setIsVoiceActive(prev => !prev);
    // TODO: Connect to apps/voice-input service via WebSocket
    console.log('[Voice]', isVoiceActive ? 'Stopping...' : 'Starting...');
  }, [isVoiceActive]);

  const stageCard = activeCards[0];
  const contextCard = activeCards[1];
  const tickerCards = activeCards.slice(2);

  return (
    <div className="h-screen w-screen bg-[var(--color-background)] flex flex-col overflow-hidden text-[var(--color-text)] font-sans">
      
      {/* ZONE C: THE TICKER (Top Bar) */}
      <div className="h-12 bg-[var(--color-background-secondary)] border-b border-[var(--color-border)] flex items-center px-4 justify-between shrink-0 select-none z-20">
        <div className="flex items-center gap-4">
          <span className="text-xs font-bold text-[var(--color-primary)] tracking-[0.2em]">FOCUS.MODE</span>
          <div className="h-4 w-[1px] bg-[var(--color-border)]" />
          
          {/* Ticker - Scrolling chips for cards 2+ */}
          {tickerCards.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto max-w-[600px] scrollbar-hide">
              {tickerCards.map((card) => (
                <button
                  key={card.id}
                  onClick={() => promoteToStage(card.id)}
                  className="flex items-center gap-2 px-3 py-1 bg-[var(--color-background)] border border-[var(--color-border)] rounded-full hover:border-[var(--color-primary)] transition-all text-[10px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] whitespace-nowrap shrink-0 group"
                >
                  <ChevronRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  {card.title}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeCard(card.id);
                    }}
                    className="ml-1 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all"
                  >
                    <X size={12} />
                  </button>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 text-[10px] text-[var(--color-text-secondary)] font-mono">
          <span>Stack: {activeCards.length}</span>
        </div>
      </div>

      {/* WORKSPACE - Zone A (Stage) + Zone B (Context) */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* ZONE A: THE STAGE (2/3 width) */}
        <div className="w-2/3 h-full border-r border-[var(--color-border)] relative flex flex-col bg-[var(--color-background)]">
          {/* Stage Header */}
          <div className="h-10 bg-[var(--color-background-secondary)]/30 border-b border-[var(--color-border)] flex items-center justify-between px-4 shrink-0">
            <span className="text-[10px] uppercase text-[var(--color-text-secondary)] tracking-wider flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-pulse" />
              STAGE: {stageCard?.title || 'Empty'}
            </span>
            <div className="flex items-center gap-2">
              {/* Voice Toggle */}
              <button
                onClick={toggleVoice}
                className={cn(
                  "p-1.5 rounded transition-all",
                  isVoiceActive
                    ? "bg-red-500/20 text-red-500 hover:bg-red-500/30"
                    : "text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-background-secondary)]"
                )}
                title={isVoiceActive ? "Stop Voice Input" : "Start Voice Input"}
              >
                {isVoiceActive ? <MicOff size={14} /> : <Mic size={14} />}
              </button>
            </div>
          </div>

          {/* Stage Content - Full Card */}
          <div className="flex-1 relative overflow-hidden">
            {stageCard ? (
              <div className="h-full w-full">
                <SwappableCard id={stageCard.id} roleId={stageCard.roleId} />
              </div>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div className="p-6 rounded-full mb-6 border border-[var(--color-border)] bg-[var(--color-background-secondary)] text-[var(--color-text-secondary)]">
                  <Maximize2 size={48} strokeWidth={1} />
                </div>
                <h3 className="text-sm font-medium text-[var(--color-text)] tracking-widest opacity-80">NO ACTIVE CARD</h3>
              </div>
            )}

            {/* SuperAiButton - Fixed in top-right corner of Zone A */}
            <div className="absolute top-4 right-4 z-50">
              <SuperAiButton 
                contextId="global"
                expandUp={false}
                onGenerate={(prompt: string) => console.log(`[Global AI]: ${prompt}`)} 
              />
            </div>
          </div>
        </div>

        {/* ZONE B: THE CONTEXT (1/3 width) - Reference Mode */}
        <div className="w-1/3 h-full relative bg-[var(--color-background-secondary)]/5 flex flex-col border-l border-[var(--color-border)]">
          {/* Context Header */}
          <div className="h-10 bg-[var(--color-background-secondary)]/30 border-b border-[var(--color-border)] flex items-center justify-between px-4 shrink-0">
            <span className="text-[10px] uppercase text-[var(--color-text-secondary)] tracking-wider">
              CONTEXT: {contextCard?.title || 'Empty'}
            </span>
            {contextCard && (
              <button
                onClick={() => promoteToStage(contextCard.id)}
                className="text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]"
                title="Promote to Stage"
              >
                <Maximize2 size={14} />
              </button>
            )}
          </div>

          {/* Context Content - Reference Mode (Scaled Down) */}
          <div className="flex-1 relative overflow-hidden p-2">
            {contextCard ? (
              <div 
                className="h-full w-full origin-top-left pointer-events-auto"
                style={{
                  transform: 'scale(0.95)',
                  transformOrigin: 'top left'
                }}
              >
                <SwappableCard id={contextCard.id} roleId={contextCard.roleId} />
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-[var(--color-text-secondary)] text-xs italic">
                No context card
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default FocusWorkspace;
