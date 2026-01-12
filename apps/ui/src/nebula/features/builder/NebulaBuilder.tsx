
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { ThemeManager } from '../../../components/nebula/ThemeManager.js';
import { ComponentManifest, type ComponentCategory } from '../../component-map.js';
import { Search, Plus, Trash2, Layers } from 'lucide-react';
import { cn } from '../../../lib/utils.js';
import { useBuilderStore } from '../../../stores/builder.store.js';

interface BuilderNode {
  id: string;
  type: string;
  componentName?: string;
  props: Record<string, any>;
  children: string[];
}

export interface NebulaBuilderProps {
  initialTree: Record<string, BuilderNode>;
  onSave: (newTree: Record<string, BuilderNode>) => void;
}

export const NebulaBuilder = ({ initialTree, onSave }: NebulaBuilderProps) => {
  const [tree, setTree] = useState<Record<string, BuilderNode>>(initialTree);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showThemeManager, setShowThemeManager] = useState(false);
  const [activeCategory, setActiveCategory] = useState<ComponentCategory | 'all'>('atom');
  const [searchQuery, setSearchQuery] = useState('');

  const { saveTriggered, setIsDirty, viewport } = useBuilderStore();

  const handleSave = useCallback(() => {
    onSave(tree);
    setIsDirty(false);
  }, [tree, onSave, setIsDirty]);

  // Notify parent on external save trigger
  useEffect(() => {
    if (saveTriggered > 0) {
      handleSave();
    }
  }, [saveTriggered, handleSave]);

  // Sync with store
  useEffect(() => {
    setIsDirty(JSON.stringify(tree) !== JSON.stringify(initialTree));
  }, [tree, initialTree, setIsDirty]);

  // Filter components based on category and search
  const filteredComponents = useMemo(() => {
    return Object.entries(ComponentManifest)
      .filter(([key, def]) => {
         if (def.meta.hidden) return false;
         const matchesSearch = def.meta.label.toLowerCase().includes(searchQuery.toLowerCase()) || 
                               key.toLowerCase().includes(searchQuery.toLowerCase());
         if (!matchesSearch) return false;
         if (activeCategory === 'all') return def.meta.category !== 'system'; 
         return def.meta.category === activeCategory;
      })
      .map(([key, def]) => ({ 
          id: key, 
          label: def.meta.label,
          category: def.meta.category,
          icon: def.meta.icon,
          propSchema: def.propSchema
      }));
  }, [activeCategory, searchQuery]);

  // --- ACTIONS ---

  const handleDragStart = (e: React.DragEvent, componentType: string) => {
    e.dataTransfer.setData('componentType', componentType);
  };

  const handleDrop = (e: React.DragEvent, targetNodeId: string = 'root') => {
    e.preventDefault();
    const componentType = e.dataTransfer.getData('componentType');
    if (!componentType) return;

    const def = ComponentManifest[componentType];
    const newId = `${componentType.toLowerCase()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Create new node
    const newNode: BuilderNode = {
      id: newId,
      type: componentType === 'Box' ? 'div' : 'Component',
      componentName: componentType !== 'Box' ? componentType : undefined,
      props: Object.entries(def.propSchema).reduce((acc, [key, val]) => {
          acc[key] = val.defaultValue;
          return acc;
      }, {} as any),
      children: []
    };

    // Update tree
    setTree(prev => {
        const next = { ...prev };
        next[newId] = newNode;
        if (next[targetNodeId]) {
            next[targetNodeId] = {
                ...next[targetNodeId],
                children: [...(next[targetNodeId].children || []), newId]
            };
        }
        return next;
    });

    setSelectedNodeId(newId);
  };

  const deleteNode = (id: string) => {
    if (id === 'root') return;
    setTree(prev => {
        const next = { ...prev };
        // Find parent and remove from children
        Object.keys(next).forEach(nodeId => {
          if (next[nodeId].children?.includes(id)) {
            next[nodeId] = {
                ...next[nodeId],
                children: next[nodeId].children.filter(cid => cid !== id)
            };
          }
        });
        delete next[id];
        return next;
    });
    setSelectedNodeId(null);
  };

  const updateNodeProps = (id: string, newProps: Record<string, any>) => {
    setTree(prev => {
        if (!prev[id]) return prev;
        return {
            ...prev,
            [id]: {
                ...prev[id],
                props: { ...prev[id].props, ...newProps }
            }
        };
    });
  };

  const selectedNode = selectedNodeId ? tree[selectedNodeId] : null;
  const selectedDef = selectedNode ? ComponentManifest[selectedNode.componentName || 'Box'] : null;

  // Viewport mapping
  const viewportWidths = {
    desktop: '100%',
    tablet: '768px',
    mobile: '390px'
  };

  return (
    <div className="flex flex-col h-full w-full bg-neutral-950 text-white select-none">
      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* LEFT SIDEBAR: Library & Layers */}
        <div className="w-72 border-r border-neutral-800 flex flex-col bg-neutral-900/40 backdrop-blur-md">
           
           {/* SEARCH & FILTERS */}
           <div className="p-4 border-b border-neutral-800 space-y-4">
               <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-500">Component Library</h2>
                  <Layers size={14} className="text-neutral-600 cursor-pointer hover:text-white transition-colors" />
               </div>
               <div className="relative">
                   <Search size={14} className="absolute left-2.5 top-2.5 text-neutral-500"/>
                   <input 
                    type="text" 
                    placeholder="Search UI Blocks..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-9 pr-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 outline-none transition-all placeholder:text-neutral-700" 
                   />
               </div>
               
               <div className="flex flex-wrap gap-1.5 pt-1">
                   {(['all', 'layout', 'atom', 'molecule', 'data'] as const).map(cat => (
                       <button 
                         key={cat}
                         onClick={() => setActiveCategory(cat as any)} 
                         className={cn(
                           "text-[10px] font-bold uppercase px-2 py-1 rounded-md transition-all border",
                           activeCategory === cat 
                            ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20" 
                            : "bg-neutral-800/50 border-neutral-700 text-neutral-500 hover:text-neutral-300"
                         )}
                       >
                         {cat}
                       </button>
                   ))}
               </div>
           </div>

           {/* COMPONENT LIST */}
           <div className="flex-1 overflow-y-auto p-3 space-y-2 thin-scrollbar">
             {filteredComponents.map(comp => (
                  <div 
                    key={comp.id} 
                    draggable 
                    onDragStart={(e) => handleDragStart(e, comp.id)}
                    className="group p-3 bg-neutral-900/50 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-600 rounded-xl cursor-grab active:cursor-grabbing transition-all duration-200"
                  >
                      <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-neutral-800 rounded flex items-center justify-center text-neutral-400 group-hover:text-indigo-400 transition-colors">
                               <Plus size={12} />
                            </div>
                            <span className="text-sm font-bold text-neutral-300 group-hover:text-white transition-colors">{comp.label}</span>
                          </div>
                          <span className="text-[9px] uppercase font-bold text-neutral-500 bg-neutral-950 px-1.5 py-0.5 rounded border border-neutral-800">{comp.category}</span>
                      </div>
                      <div className="text-[10px] text-neutral-600 leading-relaxed pl-8">
                        {comp.propSchema ? Object.keys(comp.propSchema).length : 0} configurable props
                      </div>
                  </div>
             ))}
             {filteredComponents.length === 0 && (
                  <div className="text-center py-12 text-neutral-600 text-xs">No blocks found matching your search.</div>
             )}
           </div>

           {/* BOTTOM HELP */}
           <div className="p-4 border-t border-neutral-800 bg-neutral-950/20">
              <div className="flex items-center gap-2 text-[10px] text-neutral-500">
                 <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                 <span>Drag and drop to build your UI</span>
              </div>
           </div>
        </div>

        {/* CENTER: THE CANVAS */}
        <div 
          className="flex-1 bg-neutral-950 p-12 overflow-auto flex flex-col items-center"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => handleDrop(e)}
        >
          {/* Viewport Label */}
          <div className="mb-4 text-[10px] font-mono uppercase tracking-[0.2em] text-neutral-600 flex items-center gap-4">
             <div className="h-px w-12 bg-neutral-800" />
             Viewport: {viewport} ({viewportWidths[viewport]})
             <div className="h-px w-12 bg-neutral-800" />
          </div>

          {/* Canvas Wrapper */}
          <div 
            style={{ width: viewportWidths[viewport] }}
            className={cn(
              "min-h-[800px] bg-neutral-900 rounded-2xl border-2 border-dashed border-neutral-800 relative transition-all duration-500 shadow-2xl",
              "bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"
            )}
            onDragOver={(e) => e.preventDefault()}
          >
             {/* The Actual Recursive Renderer would go here */}
             <div className="absolute inset-0 flex flex-col p-8 overflow-auto">
                <RecursiveNode tree={tree} nodeId="root" selectedId={selectedNodeId} onSelect={setSelectedNodeId} onDrop={handleDrop} />
             </div>

             {/* Canvas Empty State */}
             {(!tree.root || !tree.root.children || tree.root.children.length === 0) && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center opacity-30">
                      <div className="w-16 h-16 bg-neutral-800 rounded-full mx-auto mb-4 flex items-center justify-center">
                         <Plus size={32} />
                      </div>
                      <p className="text-lg font-bold">Canvas Ready</p>
                      <p className="text-xs">Drop components here to start designing</p>
                  </div>
              </div>
             )}
          </div>
        </div>
        
        {/* RIGHT SIDEBAR: PROPERTIES */}
        <div className="w-80 border-l border-neutral-800 flex flex-col bg-neutral-900/40 backdrop-blur-md">
            <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
                 <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-500">Properties</h3>
                 {selectedNodeId && (
                    <button 
                      onClick={() => deleteNode(selectedNodeId)}
                      className="p-1.5 hover:bg-red-500/20 text-neutral-600 hover:text-red-400 rounded transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                 )}
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6 thin-scrollbar text-xs">
                {selectedNode ? (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                      {/* NODE HEADER */}
                      <div>
                         <div className="text-[10px] font-bold text-indigo-400 uppercase mb-1">{selectedNode.componentName || 'Layout'}</div>
                         <h4 className="text-lg font-bold text-white capitalize">{selectedNodeId}</h4>
                      </div>

                      <div className="h-px bg-neutral-800" />

                      {/* PROP INPUTS */}
                      <div className="space-y-4">
                         {selectedDef && Object.entries(selectedDef.propSchema).map(([key, schema]: [string, any]) => (
                            <div key={key}>
                               <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-tighter mb-1.5 ml-1">{key}</label>
                               {schema.type === 'string' && (
                                  <input 
                                    type="text" 
                                    value={selectedNode.props[key] || ''} 
                                    onChange={(e) => updateNodeProps(selectedNodeId!, { [key]: e.target.value })}
                                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-200 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                                  />
                               )}
                               {schema.type === 'select' && (
                                  <select 
                                    value={selectedNode.props[key] || ''} 
                                    onChange={(e) => updateNodeProps(selectedNodeId!, { [key]: e.target.value })}
                                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-200 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                                  >
                                    {schema.options?.map((opt: string) => (
                                       <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                  </select>
                               )}
                               {schema.description && <p className="mt-1 text-[9px] text-neutral-600 italic leading-snug">{schema.description}</p>}
                            </div>
                         ))}
                      </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-30 select-none">
                      <Layers size={32} className="mb-4" />
                      <p className="font-bold">No Node Selected</p>
                      <p className="text-[10px] mt-1 max-w-[150px]">Click an element on the canvas to edit its properties.</p>
                  </div>
                )}
            </div>
        </div>

        {/* Theme Manager Overlay */}
        {showThemeManager && (
          <div className="absolute top-4 right-4 bottom-4 w-[500px] shadow-2xl z-50 animate-in slide-in-from-right-10">
             <div className="h-full relative">
                <button 
                  onClick={() => setShowThemeManager(false)}
                  className="absolute top-2 right-2 z-10 p-1 bg-neutral-800 rounded-full text-white hover:bg-neutral-700"
                >
                  ✖
                </button>
                <div className="h-full bg-neutral-900 rounded-xl overflow-hidden border border-neutral-700">
                    <ThemeManager />
                </div>
             </div>
          </div>
        )}

      </div>
    </div>
  );
};

// --- MINI RENDERER FOR BUILDER ---

const RecursiveNode = ({ tree, nodeId, selectedId, onSelect, onDrop }: any) => {
  const node = tree[nodeId];
  if (!node) return null;

  const isSelected = selectedId === nodeId;

  return (
    <div 
      onClick={(e) => { e.stopPropagation(); onSelect(nodeId); }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => { e.stopPropagation(); onDrop(e, nodeId); }}
      className={cn(
        "relative transition-all border-2",
        isSelected 
          ? "border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.3)] z-10" 
          : "border-transparent hover:border-indigo-500/30",
        node.type === 'div' ? "flex flex-col p-4 m-2 rounded-lg bg-white/5 min-h-[50px] overflow-visible" : "m-1"
      )}
    >
       {/* Labels & Overlay */}
       {isSelected && (
          <div className="absolute -top-6 -left-[2px] bg-indigo-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-t-lg flex items-center gap-2 whitespace-nowrap overflow-visible z-20">
             <span className="uppercase tracking-widest">{node.componentName || 'Layout'}</span>
             <span className="opacity-50">#{nodeId}</span>
          </div>
       )}

       {/* Component/Content */}
       {node.type === 'div' ? (
         <>
           {node.children?.map((childId: string) => (
             <RecursiveNode key={childId} tree={tree} nodeId={childId} selectedId={selectedId} onSelect={onSelect} onDrop={onDrop} />
           ))}
           {(!node.children || node.children.length === 0) && (
              <div className="text-[9px] text-neutral-600 italic text-center py-2">Empty Container</div>
           )}
         </>
       ) : (
         <div className="p-3 bg-neutral-800 text-xs rounded border border-neutral-700 flex items-center justify-between pointer-events-none">
            <span className="font-bold">{node.componentName}</span>
            <span className="text-[10px] text-neutral-500 italic truncate overflow-hidden max-w-[100px]">
              {JSON.stringify(node.props).length > 20 ? '...' : JSON.stringify(node.props)}
            </span>
         </div>
       )}
    </div>
  );
};
