
import React, { useState } from 'react';
import { 
  Box, Type, MousePointer2, Smartphone, 
  Monitor, Tablet, Plus, Trash2, Settings, Layers,
  LayoutTemplate, Move
} from 'lucide-react';
// import { NewUIRoot } from '../components/appearance/NewUIRoot.js';

// --- 1. Component Registry (The "DNA" of your UI) ---
type ElementType = 'container' | 'button' | 'text' | 'input' | 'card';

interface UIElement {
  id: string;
  type: ElementType;
  props: Record<string, any>;
  children?: UIElement[];
  classes: string;
}

const COMPONENT_PALETTE = [
  { 
    type: 'container', 
    label: 'Container', 
    icon: Box, 
    defaultClasses: 'p-4 border border-zinc-700 rounded-lg min-h-[100px] bg-zinc-900/50 flex flex-col gap-2',
    defaultProps: {}
  },
  { 
    type: 'card', 
    label: 'Card', 
    icon: LayoutTemplate, 
    defaultClasses: 'p-6 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl flex flex-col gap-4',
    defaultProps: {}
  },
  { 
    type: 'button', 
    label: 'Button', 
    icon: MousePointer2, 
    defaultClasses: 'px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md font-medium transition-colors w-fit',
    defaultProps: { text: 'Click Me' }
  },
  { 
    type: 'text', 
    label: 'Text Block', 
    icon: Type, 
    defaultClasses: 'text-zinc-300 text-sm leading-relaxed',
    defaultProps: { text: 'This represents a text block. You can edit this content in the properties panel.' }
  },
  { 
    type: 'input', 
    label: 'Input Field', 
    icon: Type, 
    defaultClasses: 'w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded focus:border-indigo-500 outline-none text-zinc-300 placeholder-zinc-600',
    defaultProps: { placeholder: 'Enter text...' }
  },
];

// --- 2. The Page Logic ---
export const InterfaceBuilderPage = () => {
  const [elements, setElements] = useState<UIElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  // --- Actions ---
  const addElement = (type: ElementType, parentId: string | null = null) => {
    const def = COMPONENT_PALETTE.find(c => c.type === type);
    if (!def) return;

    const newEl: UIElement = {
      id: Math.random().toString(36).substr(2, 9),
      type: type as ElementType,
      classes: def.defaultClasses,
      props: { ...def.defaultProps },
      children: type === 'container' || type === 'card' ? [] : undefined
    };

    if (!parentId) {
      setElements(prev => [...prev, newEl]);
    } else {
      // Recursive insertion (simplified for root-level dropping for now)
      // In a full v2, we walk the tree to find the parent. 
      // For this demo, we append to root to guarantee it works.
      setElements(prev => [...prev, newEl]); 
    }
    setSelectedId(newEl.id);
  };

  const updateSelected = (key: string, value: any) => {
    if (!selectedId) return;
    setElements(prev => prev.map(el => {
      if (el.id === selectedId) {
        if (key === 'classes') return { ...el, classes: value };
        return { ...el, props: { ...el.props, [key]: value } };
      }
      return el;
    }));
  };

  const deleteSelected = () => {
    setElements(prev => prev.filter(el => el.id !== selectedId));
    setSelectedId(null);
  };

  // --- Recursive Renderer ---
  const renderElement = (el: UIElement) => {
    const isSelected = selectedId === el.id;
    const baseStyle = isSelected ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-black relative z-10' : 'hover:ring-1 hover:ring-zinc-600 relative';
    
    // Stop propagation so clicking a button inside a card selects the button, not the card
    const handleClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      setSelectedId(el.id);
    };

    switch (el.type) {
      case 'button':
        return <button onClick={handleClick} className={`${el.classes} ${baseStyle}`}>{el.props.text}</button>;
      case 'text':
        return <p onClick={handleClick} className={`${el.classes} ${baseStyle}`}>{el.props.text}</p>;
      case 'input':
        return <input onClick={handleClick} className={`${el.classes} ${baseStyle}`} placeholder={el.props.placeholder} readOnly />;
      case 'container':
      case 'card':
        return (
          <div onClick={handleClick} className={`${el.classes} ${baseStyle} min-h-[50px]`}>
            {el.children?.map(child => renderElement(child))}
            {/* If empty, show hint */}
            {(!el.children || el.children.length === 0) && (
               <div className="text-[10px] text-zinc-600 font-mono text-center p-4 border border-dashed border-zinc-800 rounded">
                 Container (Drop items here)
               </div>
            )}
          </div>
        );
      default: return null;
    }
  };

  const activeElement = elements.find(e => e.id === selectedId);

  return (
    <div className="flex h-full w-full bg-[#09090b] text-zinc-300 font-sans overflow-hidden">
        
        {/* 1. PALETTE (Left) */}
        <div className="w-64 flex-none border-r border-zinc-800 bg-[#0c0c0e] flex flex-col">
          <div className="h-12 flex items-center px-4 border-b border-zinc-800">
            <span className="font-bold text-xs tracking-wider text-zinc-100 flex items-center gap-2">
              <Layers size={14} className="text-indigo-500"/> COMPONENTS
            </span>
          </div>
          <div className="p-4 grid grid-cols-1 gap-2 overflow-y-auto">
            {COMPONENT_PALETTE.map((c) => (
              <button
                key={c.type}
                onClick={() => addElement(c.type as ElementType)}
                className="flex items-center gap-3 p-3 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-indigo-500 hover:bg-zinc-800 transition-all group text-left"
              >
                <div className="p-2 rounded bg-zinc-950 text-zinc-400 group-hover:text-indigo-400">
                  <c.icon size={18} />
                </div>
                <div>
                  <div className="text-sm font-bold text-zinc-300">{c.label}</div>
                  <div className="text-[10px] text-zinc-500">Click to add</div>
                </div>
                <Plus size={14} className="ml-auto opacity-0 group-hover:opacity-100 text-indigo-500" />
              </button>
            ))}
          </div>
        </div>

        {/* 2. CANVAS (Center) */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#121214] relative">
          
          {/* Toolbar */}
          <div className="h-12 flex items-center justify-center gap-4 border-b border-zinc-800 bg-[#09090b]">
            <div className="flex bg-zinc-900 rounded-lg p-1 border border-zinc-800">
              <button onClick={() => setViewport('mobile')} className={`p-1.5 rounded ${viewport === 'mobile' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}><Smartphone size={16}/></button>
              <button onClick={() => setViewport('tablet')} className={`p-1.5 rounded ${viewport === 'tablet' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}><Tablet size={16}/></button>
              <button onClick={() => setViewport('desktop')} className={`p-1.5 rounded ${viewport === 'desktop' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}><Monitor size={16}/></button>
            </div>
            <div className="text-xs text-zinc-500 font-mono">
              {viewport === 'mobile' ? '375px' : viewport === 'tablet' ? '768px' : '100%'}
            </div>
          </div>

          {/* Stage */}
          <div className="flex-1 overflow-auto p-8 flex justify-center bg-[url('https://grainy-gradients.vercel.app/noise.svg')]">
            <div 
              className={`
                bg-black border border-zinc-800 shadow-2xl transition-all duration-300 relative
                ${viewport === 'mobile' ? 'w-[375px]' : viewport === 'tablet' ? 'w-[768px]' : 'w-full max-w-5xl'}
              `}
              style={{ minHeight: '800px' }}
            >
              {/* Drop Zone */}
              <div className="p-8 flex flex-col gap-4 h-full">
                {elements.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-700 border-2 border-dashed border-zinc-800 rounded-xl">
                    <Move size={48} className="mb-4 opacity-20" />
                    <p className="text-sm">Canvas Empty</p>
                    <p className="text-xs opacity-50">Select components from the left sidebar</p>
                  </div>
                ) : (
                  elements.map(el => (
                    <React.Fragment key={el.id}>
                      {renderElement(el)}
                    </React.Fragment>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 3. PROPERTIES (Right) */}
        <div className="w-80 flex-none border-l border-zinc-800 bg-[#0c0c0e] flex flex-col">
          <div className="h-12 flex items-center justify-between px-4 border-b border-zinc-800">
            <span className="font-bold text-xs tracking-wider text-zinc-100 flex items-center gap-2">
              <Settings size={14} className="text-emerald-500"/> PROPERTIES
            </span>
            {selectedId && (
              <button onClick={deleteSelected} className="text-red-500 hover:bg-red-500/10 p-1.5 rounded transition-colors">
                <Trash2 size={14} />
              </button>
            )}
          </div>

          <div className="p-4 overflow-y-auto flex-1">
            {activeElement ? (
              <div className="flex flex-col gap-6">
                
                {/* Identity */}
                <div className="pb-4 border-b border-zinc-800">
                  <span className="text-[10px] uppercase text-zinc-500 font-bold">Element ID</span>
                  <div className="font-mono text-xs text-zinc-300 mt-1">{activeElement.id}</div>
                  <div className="mt-2 inline-flex items-center px-2 py-1 rounded bg-indigo-500/10 text-indigo-400 text-[10px] font-bold uppercase border border-indigo-500/20">
                    {activeElement.type}
                  </div>
                </div>

                {/* Content Editor */}
                {activeElement.props.text !== undefined && (
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-zinc-400">Text Content</label>
                    <input 
                      type="text" 
                      value={activeElement.props.text}
                      onChange={(e) => updateSelected('text', e.target.value)}
                      className="bg-zinc-900 border border-zinc-700 rounded p-2 text-sm text-white focus:border-indigo-500 outline-none"
                    />
                  </div>
                )}

                {/* Tailwind Class Editor */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-zinc-400 flex justify-between">
                    <span>Tailwind Classes</span>
                    <a href="https://tailwindcss.com/docs" target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline">Docs</a>
                  </label>
                  <textarea 
                    value={activeElement.classes}
                    onChange={(e) => updateSelected('classes', e.target.value)}
                    className="bg-zinc-900 border border-zinc-700 rounded p-2 text-xs font-mono text-emerald-400 focus:border-emerald-500 outline-none h-32 resize-none leading-relaxed"
                  />
                </div>

                {/* Presets (Quick Styles) */}
                <div className="flex flex-col gap-2">
                   <label className="text-xs font-bold text-zinc-400">Quick Colors</label>
                   <div className="flex gap-2">
                      {['bg-red-600', 'bg-blue-600', 'bg-emerald-600', 'bg-amber-600', 'bg-zinc-800'].map(color => (
                        <button 
                          key={color}
                          onClick={() => {
                            // Simple regex replace for bg- color
                            const newClasses = activeElement.classes.replace(/bg-\w+-\d+/, color);
                            updateSelected('classes', newClasses.includes(color) ? newClasses : `${activeElement.classes} ${color}`);
                          }}
                          className={`w-6 h-6 rounded-full ${color} border border-white/10 hover:scale-110 transition-transform`}
                        />
                      ))}
                   </div>
                </div>

              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-zinc-600 text-center opacity-50">
                <MousePointer2 size={32} className="mb-2" />
                <p className="text-xs">Select an element on the canvas to edit.</p>
              </div>
            )}
          </div>
        </div>

      </div>
  );
};

export default InterfaceBuilderPage;
