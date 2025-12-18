import React, { useState, useEffect } from 'react';
import { 
  Plus, Minus, Terminal, FileText, Code, Globe, 
  MoreHorizontal, ChevronUp, ChevronDown, Play, Maximize2 
} from 'lucide-react';
import { trpc } from '../utils/trpc.js';
import { useWorkspaceStore } from '../stores/workspace.store.js';
import { NewUIThemeProvider } from '../components/appearance/NewUIThemeProvider.js';
import { SwappableCard } from '../components/work-order/SwappableCard.js';
import { AIContextButton } from '../components/AIContextButton.js';
import { cn } from '@/lib/utils.js';

// --- TYPE DEFINITIONS ---
interface CardData {
    id: string;
    roleId: string;
    column: number;
    type: 'terminal' | 'editor' | 'browser' | 'preview';
    title: string;
}

// --- SUB-COMPONENTS ---

// 1. Column Header (Dense)
const ColumnHeader = ({ index, onAdd, onRemove, canRemove }: { index: number, onAdd: () => void, onRemove: () => void, canRemove: boolean }) => (
    <div className="flex items-center justify-between px-2 py-1 bg-zinc-900 border-b border-zinc-800">
        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Col {index + 1}</span>
        <div className="flex items-center gap-0.5">
            {canRemove && (
                <button onClick={onRemove} className="p-0.5 text-zinc-600 hover:text-red-400 rounded transition-colors" title="Remove Column">
                    <Minus size={10} />
                </button>
            )}
            <button onClick={onAdd} className="p-0.5 text-zinc-600 hover:text-blue-400 rounded transition-colors" title="Add Column">
                <Plus size={10} />
            </button>
        </div>
    </div>
);

// 2. Mini Card (Stack View)
const MiniCard = ({ title, active, onClick }: { title: string, active?: boolean, onClick: () => void }) => (
    <div 
        onClick={onClick}
        className={cn(
            "h-6 flex items-center px-2 border-b border-zinc-800 cursor-pointer transition-all hover:bg-zinc-800/50",
            active ? "bg-zinc-800 text-zinc-300" : "bg-zinc-900 text-zinc-600 hover:text-zinc-400"
        )}
    >
        <div className={cn("w-1.5 h-1.5 rounded-full mr-2", active ? "bg-blue-500" : "bg-zinc-700")} />
        <span className="text-[9px] font-medium truncate">{title}</span>
    </div>
);

// --- MAIN PAGE ---

export default function AdaptiveWorkspace() {
    // START: Use store for columns and cards
    const { columns, setColumns, cards, addCard } = useWorkspaceStore();
    
    // FETCH REAL DATA
    const { data: roles } = trpc.role.list.useQuery();
    
    // Track focused card index per column
    const [columnFocus, setColumnFocus] = useState<Record<number, number>>({ 0: 0, 1: 0, 2: 0 });

    // Track focused card index per column


    // --- LOGIC ---

    const getColumnCards = (colIndex: number) => cards.filter(c => c.column === colIndex);

    const handleAddColumn = () => setColumns(Math.min(columns + 1, 5));
    const handleRemoveColumn = () => setColumns(Math.max(columns - 1, 1));
    
    const setFocus = (colIndex: number, cardIndex: number) => {
        setColumnFocus(prev => ({ ...prev, [colIndex]: cardIndex }));
    };

    return (
        <NewUIThemeProvider>
            <div className="flex flex-col h-full w-full bg-zinc-950 font-sans overflow-hidden">
                
                {/* 1. COMPACT TOOLBAR */}
                <div className="h-8 flex-none border-b border-zinc-900 bg-zinc-950 flex items-center justify-between px-2 z-10">
                     <div className="flex items-center gap-2">
                        <div className="p-1 bg-zinc-900 rounded border border-zinc-800">
                             <span className="text-[10px] font-bold text-zinc-400 px-1">ADAPTIVE WS</span>
                        </div>
                        <div className="h-4 w-px bg-zinc-900" />
                        
                        {/* Square Play Button */}
                        <button className="flex items-center justify-center w-6 h-6 bg-green-900/20 hover:bg-green-600 text-green-500 hover:text-white border border-green-900/50 rounded transition-all">
                            <Play size={10} fill="currentColor" />
                        </button>
                     </div>

                     <div className="flex items-center gap-2">
                         <AIContextButton context="Workspace (Adaptive)" size="sm" />
                         <div className="flex bg-zinc-900 rounded p-0.5 border border-zinc-800">
                            <button onClick={() => setColumns(1)} className={cn("w-5 h-5 flex items-center justify-center rounded text-[10px]", columns === 1 && "bg-zinc-700 text-white")}>1</button>
                            <button onClick={() => setColumns(2)} className={cn("w-5 h-5 flex items-center justify-center rounded text-[10px]", columns === 2 && "bg-zinc-700 text-white")}>2</button>
                            <button onClick={() => setColumns(3)} className={cn("w-5 h-5 flex items-center justify-center rounded text-[10px]", columns === 3 && "bg-zinc-700 text-white")}>3</button>
                         </div>
                     </div>
                </div>

                {/* 2. MAIN GRID */}
                <div className="flex-1 flex overflow-hidden p-0.5 gap-0.5 bg-zinc-950">
                    {Array.from({ length: columns }).map((_, colIndex) => {
                        const colCards = getColumnCards(colIndex);
                        const focusIndex = columnFocus[colIndex] || 0;
                        const mainCard = colCards[focusIndex];
                        
                        return (
                            <div key={colIndex} className="flex-1 flex flex-col min-w-[200px] border border-zinc-900 bg-zinc-950 rounded-sm overflow-hidden relative">
                                <ColumnHeader 
                                    index={colIndex} 
                                    onAdd={handleAddColumn} 
                                    onRemove={handleRemoveColumn} 
                                    canRemove={columns > 1} 
                                />
                                
                                {/* STACK VIEW: Top Minis (Immediate Previous) */}
                                {focusIndex > 0 && (
                                     <div className="bg-zinc-950 border-b border-zinc-900">
                                         {colCards.slice(0, focusIndex).map((card, i) => (
                                             <MiniCard 
                                                key={card.id} 
                                                title={card.title || 'Agent Card'} 
                                                onClick={() => setFocus(colIndex, i)} 
                                             />
                                         ))}
                                     </div>
                                )}

                                {/* MAIN CARD */}
                                <div className="flex-1 relative bg-zinc-900 overflow-hidden">
                                    {mainCard ? (
                                        <SwappableCard 
                                            id={mainCard.id}
                                            roleId={mainCard.roleId || (roles?.[0]?.id ?? '')}
                                        />
                                    ) : (
                                        <div className="absolute inset-0 flex items-center justify-center text-zinc-700">
                                            <div className="text-center">
                                                <MoreHorizontal size={24} className="mx-auto mb-2 opacity-50" />
                                                <span className="text-[10px] uppercase font-bold tracking-widest">Empty Slot</span>
                                                <button 
                                                    onClick={() => addCard({ id: Date.now().toString(), roleId: roles?.[0]?.id || '', column: colIndex })}
                                                    className="mt-2 text-[10px] text-blue-500 hover:text-blue-400 block mx-auto"
                                                >
                                                    + Spawn Agent
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                 {/* STACK VIEW: Bottom Minis (Immediate Next) */}
                                 {focusIndex < colCards.length - 1 && (
                                     <div className="bg-zinc-950 border-t border-zinc-900">
                                         {colCards.slice(focusIndex + 1).map((card, i) => (
                                             <MiniCard 
                                                key={card.id} 
                                                title={card.title || 'Agent Card'} 
                                                onClick={() => setFocus(colIndex, focusIndex + 1 + i)} 
                                            />
                                         ))}
                                     </div>
                                )}

                            </div>
                        );
                    })}
                </div>
            </div>
        </NewUIThemeProvider>
    );
}
