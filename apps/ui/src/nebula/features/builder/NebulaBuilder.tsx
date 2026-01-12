
import React, { useState, useCallback, useEffect } from 'react';
import { useBuilderStore } from '../../../stores/builder.store.js';
import { ComponentManifest, type ComponentCategory } from '../../registry.js';
import { Canvas as BuilderCanvas } from '../../../components/nebula/system/Canvas.js';
import { PropertyPanel } from '../../../components/nebula/system/PropertyPanel.js';
import { BuilderToolbar } from '../../features/navigation/toolbars/BuilderToolbar.js';
import { AstTransformer, CodeGenerator, type NebulaTree } from '@repo/nebula'; 
import { Layers, Plus, Code, Search, X } from 'lucide-react';
import { cn } from '../../../lib/utils.js';

interface NebulaBuilderProps {
  initialTree: NebulaTree; 
  onSave: (newTree: NebulaTree) => void;
}

export const NebulaBuilder = ({ initialTree, onSave }: NebulaBuilderProps) => {
  const [tree, setTree] = useState<NebulaTree>(initialTree);
  const [activeCategory, setActiveCategory] = useState<ComponentCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCodeModal, setShowCodeModal] = useState<'import' | 'export' | null>(null);
  const [codeBuffer, setCodeBuffer] = useState('');

  // Store Sync
  const { 
    setIsDirty, 
    saveTriggered, 
    viewport 
  } = useBuilderStore();

  // --- ACTIONS ---

  const handleSave = useCallback(() => {
    onSave(tree);
    setIsDirty(false);
  }, [tree, onSave, setIsDirty]);

  // Sync save button from toolbar
  useEffect(() => {
    if (saveTriggered > 0) {
      handleSave();
    }
  }, [saveTriggered, handleSave]);

  // Global Hotkey Save Listener
  useEffect(() => {
    const handleGlobalSave = () => {
        console.log("Global Save Triggered via Layout");
        handleSave();
    };

    window.addEventListener('nebula:save', handleGlobalSave);
    return () => window.removeEventListener('nebula:save', handleGlobalSave);
  }, [handleSave]);

  // Handle Drag Start (Palette -> Canvas)
  const handleDragStart = (e: React.DragEvent, componentType: string) => {
    e.dataTransfer.setData('nebula/type', componentType);
    e.dataTransfer.effectAllowed = 'copy';
  };

  // Import TSX Logic
  const handleImport = () => {
    try {
      const transformer = new AstTransformer();
      const newTree = transformer.parse(codeBuffer);
      setTree(newTree);
      setShowCodeModal(null);
      setIsDirty(true);
    } catch (err) {
      alert("Failed to parse TSX: " + (err as Error).message);
    }
  };

  // Export Code Logic
  const getExportedCode = () => {
    const generator = new CodeGenerator();
    return generator.generate(tree);
  };

  // Filter Components
  const componentList = Object.entries(ComponentManifest)
    .filter(([_key, def]) => {
      if (def.meta.hidden) return false;
      const matchesSearch = _key.toLowerCase().includes(searchQuery.toLowerCase()) || def.meta.label.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;
      if (activeCategory === 'all') return def.meta.category !== 'system';
      return def.meta.category === activeCategory;
    });

  return (
    <div className="flex flex-col h-full w-full bg-zinc-950 text-zinc-300 select-none overflow-hidden font-sans">
      
      {/* 1. TOP BAR (Toolbar + Actions) */}
      <div className="h-10 border-b border-zinc-800 flex items-center px-4 bg-zinc-950/50 backdrop-blur shrink-0">
        <BuilderToolbar />
        <div className="ml-auto flex items-center gap-2 border-l border-zinc-800 pl-4 h-full">
           <button 
             onClick={() => { setCodeBuffer(''); setShowCodeModal('import'); }}
             className="flex items-center gap-1.5 px-2 py-1 hover:bg-zinc-800 rounded text-[10px] uppercase font-bold text-zinc-500 hover:text-zinc-100 transition-colors"
           >
              <Plus size={12} /> Import TSX
           </button>
           <button 
             onClick={() => { setCodeBuffer(getExportedCode()); setShowCodeModal('export'); }}
             className="flex items-center gap-1.5 px-2 py-1 hover:bg-zinc-800 rounded text-[10px] uppercase font-bold text-zinc-500 hover:text-zinc-100 transition-colors"
           >
              <Code size={12} /> View Code
           </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        
        {/* 2. LEFT SIDEBAR (Palette) */}
        <div className="w-64 border-r border-zinc-800 flex flex-col bg-zinc-900 shrink-0">
           {/* Search */}
           <div className="p-2 border-b border-zinc-800">
             <div className="relative">
                <Search size={12} className="absolute left-2 top-2 text-zinc-600" />
                <input 
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 pl-7 py-1 text-xs focus:border-indigo-500 focus:outline-none placeholder:text-zinc-700 text-zinc-300" 
                  placeholder="Find component..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
             </div>
           </div>
           
           {/* Categories */}
           <div className="flex gap-1 p-2 border-b border-zinc-800 overflow-x-auto no-scrollbar shrink-0 bg-zinc-950/20">
              {(['all', 'layout', 'atom', 'molecule', 'data'] as const).map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat as unknown as ComponentCategory | 'all')}
                  className={cn(
                    "px-2 py-0.5 rounded text-[10px] uppercase font-bold whitespace-nowrap border transition-all",
                    activeCategory === cat 
                      ? "bg-zinc-800 text-zinc-100 border-zinc-700" 
                      : "border-transparent text-zinc-600 hover:text-zinc-400"
                  )}
                >
                  {cat}
                </button>
              ))}
           </div>

           {/* Draggable List */}
           <div className="flex-1 overflow-y-auto p-2 space-y-1 thin-scrollbar">
              {componentList.map(([type, def]) => (
                <div 
                  key={type}
                  draggable
                  onDragStart={(e) => handleDragStart(e, type)}
                  className="group flex items-center justify-between p-2 rounded hover:bg-zinc-800 border border-transparent hover:border-zinc-700 cursor-grab active:cursor-grabbing transition-all"
                >
                   <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-600 group-hover:text-indigo-400 transition-colors">
                        <Layers size={12} />
                      </div>
                      <span className="text-[11px] font-medium text-zinc-400 group-hover:text-zinc-200">{def.meta.label}</span>
                   </div>
                   <Plus size={10} className="text-zinc-700 opacity-0 group-hover:opacity-100" />
                </div>
              ))}
              {componentList.length === 0 && (
                  <div className="text-center py-12 text-[10px] text-zinc-600 uppercase tracking-widest">No Results</div>
              )}
           </div>
        </div>

        {/* 3. CENTER (Canvas) */}
        <div className="flex-1 bg-zinc-950 flex flex-col relative overflow-hidden">
           {/* Canvas Wrapper for centering/scaling based on viewport */}
           <div className="flex-1 overflow-auto p-12 flex justify-center bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:24px_24px] thin-scrollbar">
              <div 
                className={cn(
                  "transition-all duration-500 shadow-2xl bg-zinc-900 border border-zinc-800 ring-4 ring-zinc-950 rounded-sm origin-top",
                  viewport === 'mobile' ? 'w-[390px]' : viewport === 'tablet' ? 'w-[768px]' : 'w-full max-w-5xl'
                )}
                style={{ minHeight: '800px' }}
              >
                 <BuilderCanvas 
                    tree={tree} 
                    setTree={(t: NebulaTree) => { setTree(t); setIsDirty(true); }}
                 />
              </div>
           </div>
        </div>

        {/* 4. RIGHT SIDEBAR (Properties) */}
        <div className="w-72 border-l border-zinc-800 bg-zinc-900 flex flex-col shrink-0">
           <PropertyPanel 
             tree={tree}
             setTree={(t: NebulaTree) => { setTree(t); setIsDirty(true); }}
           />
        </div>

      </div>

      {/* CODE MODAL */}
      {showCodeModal && (
        <div className="absolute inset-0 z-[9999] bg-black/80 flex items-center justify-center p-12 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-zinc-900 border border-zinc-700 w-full max-w-5xl h-[85vh] flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.5)] rounded-xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-950">
                 <h3 className="text-xs font-bold text-zinc-100 flex items-center gap-2 tracking-widest uppercase">
                    {showCodeModal === 'import' ? <Plus size={14} className="text-emerald-500"/> : <Code size={14} className="text-indigo-500" />}
                    {showCodeModal === 'import' ? 'Import System TSX' : 'Nebula Engine: Generated Code'}
                 </h3>
                 <button onClick={() => setShowCodeModal(null)} className="text-zinc-500 hover:text-white p-2 transition-colors"><X size={18}/></button>
              </div>
              <div className="flex-1 relative bg-zinc-950">
                 <textarea 
                   className="w-full h-full bg-transparent p-6 font-mono text-xs text-zinc-400 focus:text-zinc-200 focus:outline-none resize-none leading-relaxed overflow-auto thin-scrollbar"
                   value={codeBuffer}
                   onChange={e => setCodeBuffer(e.target.value)}
                   readOnly={showCodeModal === 'export'}
                   spellCheck={false}
                   placeholder="// Paste your React component code here...
// Nebula will attempt to transpile it into a visual tree."
                 />
              </div>
              {showCodeModal === 'import' && (
                 <div className="p-4 border-t border-zinc-800 bg-zinc-950 flex justify-end gap-3">
                    <button 
                       onClick={() => setShowCodeModal(null)}
                       className="px-4 py-2 text-zinc-500 hover:text-white text-[10px] font-bold uppercase tracking-widest transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                      onClick={handleImport}
                      className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold rounded-md shadow-lg shadow-indigo-500/20 active:scale-95 transition-all uppercase tracking-widest"
                    >
                      Transpile & Sync
                    </button>
                 </div>
              )}
           </div>
        </div>
      )}
    </div>
  );
};
