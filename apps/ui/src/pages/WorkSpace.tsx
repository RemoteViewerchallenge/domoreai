import React, { useState } from 'react';
import { SwappableCard } from '../components/work-order/SwappableCard.js';
import RoleCreator from './RoleCreator.js';
import { Link } from 'react-router-dom';
import { Database, Settings, ArrowUp, ArrowDown } from 'lucide-react';

export default function WorkSpace() {
  const [columns, setColumns] = useState(3);
  const [inputPosition, setInputPosition] = useState<'top' | 'bottom'>('top');
  const [showRoleCreator, setShowRoleCreator] = useState(false);
  const [cards] = useState([{ id: '1', roleId: '' }, { id: '2', roleId: '' }, { id: '3', roleId: '' }, { id: '4', roleId: '' }, { id: '5', roleId: '' }, { id: '6', roleId: '' }]);

  return (
    <div className="flex flex-col h-screen w-screen bg-black text-zinc-200 overflow-hidden font-mono">
      {/* Header */}
      <div className="flex-none h-10 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between px-4 z-50">
         <div className="flex items-center gap-4">
            <button onClick={() => setShowRoleCreator(!showRoleCreator)} className={`flex items-center gap-2 text-xs font-bold uppercase transition-colors ${showRoleCreator ? 'text-cyan-400' : 'text-zinc-500 hover:text-white'}`}>
              <Settings size={14} /> Roles
            </button>
            <div className="h-4 w-px bg-zinc-800" />
            <Link to="/data" className="flex items-center gap-2 text-xs text-zinc-500 hover:text-green-400 font-bold uppercase transition-colors">
              <Database size={14} /> Providers
            </Link>
         </div>
         <div className="flex items-center gap-4">
            <button onClick={() => setInputPosition(inputPosition === 'top' ? 'bottom' : 'top')} className="flex items-center gap-2 text-[10px] uppercase font-bold text-zinc-400 border border-zinc-800 px-2 py-1 rounded hover:text-white hover:border-zinc-600 transition-all">
                {inputPosition === 'top' ? <ArrowUp size={12}/> : <ArrowDown size={12}/>}
                <span>Input Focus: {inputPosition}</span>
            </button>
            <div className="flex items-center bg-zinc-900 rounded border border-zinc-800 h-6">
               <button onClick={() => setColumns(Math.max(1, columns - 1))} className="px-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-l">-</button>
               <span className="px-2 text-xs font-bold text-cyan-500 w-6 text-center">{columns}</span>
               <button onClick={() => setColumns(Math.min(6, columns + 1))} className="px-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-r">+</button>
            </div>
         </div>
      </div>

      {/* Role Creator Panel */}
      {showRoleCreator && (
          <div className="flex-none bg-zinc-950 border-b border-zinc-800 z-40 animate-in slide-in-from-top-2 fade-in duration-200">
            <RoleCreator mode="compact" />
          </div>
      )}

      {/* Main Split Layout */}
      <div className="flex-1 flex flex-col min-h-0 relative">
          {/* Top Row: Majority (flex-[3]) if Input Top; Minority (flex-1) if Input Bottom */}
          <div className={`w-full overflow-hidden relative transition-all duration-300 ease-in-out ${inputPosition === 'top' ? 'flex-[3]' : 'flex-1'}`}>
             <div className="h-full w-full grid gap-px bg-zinc-900 border-b border-zinc-800" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gridAutoRows: 'minmax(0, 1fr)' }}>
                {cards.slice(0, Math.ceil(cards.length / 2)).map(card => (<SwappableCard key={card.id} id={card.id} roleId={card.roleId} />))}
             </div>
          </div>
          {/* Splitter */}
          <div className="flex-none h-1.5 bg-zinc-950 border-y border-zinc-900 hover:bg-cyan-500/20 cursor-row-resize z-10 flex justify-center items-center">
             <div className="w-8 h-0.5 bg-zinc-800 rounded-full" />
          </div>
          {/* Bottom Row */}
          <div className={`w-full overflow-hidden relative transition-all duration-300 ease-in-out ${inputPosition === 'bottom' ? 'flex-[3]' : 'flex-1'}`}>
             <div className="h-full w-full grid gap-px bg-zinc-900 border-t border-zinc-800" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gridAutoRows: 'minmax(0, 1fr)' }}>
                {cards.slice(Math.ceil(cards.length / 2)).map(card => (<SwappableCard key={card.id} id={card.id} roleId={card.roleId} />))}
             </div>
          </div>
      </div>
    </div>
  );
}
