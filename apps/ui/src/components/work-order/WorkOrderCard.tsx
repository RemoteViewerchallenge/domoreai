import React, { useState } from 'react';
import MonacoEditor from '../MonacoEditor.js';

interface WorkOrderCardProps {
  id: string;
  promptValue: string;
  genValue: string;
  onPromptChange: (val: string) => void;
  onGenChange: (val: string) => void;
  isActive: boolean;
}

const WorkOrderCard: React.FC<WorkOrderCardProps> = ({
  promptValue,
  genValue,
  onPromptChange,
  onGenChange,
  isActive
}) => {
  const [focus, setFocus] = useState<'prompt' | 'gen' | null>(null);

  // Hydraulic Logic
  // This controls the height of the FIRST row.
  let splitRatio = 35; 
  if (focus === 'prompt') splitRatio = 60;
  if (focus === 'gen') splitRatio = 15;

  const editorOptions = {
    minimap: { enabled: false },
    lineNumbers: 'on' as const,
    folding: false,
    padding: { top: 12, bottom: 12 },
    fontSize: 11,
    fontFamily: '"JetBrains Mono", "Fira Code", monospace',
    wordWrap: 'on' as const,
    automaticLayout: true,
    scrollbar: { vertical: 'auto' as const, horizontal: 'hidden' as const, verticalScrollbarSize: 10 },
    dragAndDrop: true,
    links: true,
  };

  return (
    // CSS GRID LAYOUT
    // Rows: [Split%] [2px] [Rest of space]
    <div 
      className={`w-full h-full grid bg-black overflow-hidden ${isActive ? 'z-10' : ''}`}
      style={{ 
        gridTemplateRows: `${splitRatio}% 2px 1fr`,
        transition: 'grid-template-rows 0.3s ease-out' // Smooth animation
      }}
    >
      
      {/* --- ROW 1: PROMPT --- */}
      <div 
        className="relative min-h-0 w-full bg-zinc-900 border-b border-zinc-800"
        onClick={() => setFocus('prompt')}
      >
        {/* Label */}
        <div className={`absolute top-0 right-0 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest border-l border-b transition-colors duration-300 z-30 ${focus === 'prompt' ? 'bg-cyan-950 text-cyan-400 border-cyan-700' : 'bg-zinc-800 text-zinc-500 border-zinc-700'}`}>
          Input
        </div>
        {/* Editor */}
        <div className="absolute inset-0">
           <MonacoEditor
            value={promptValue}
            onChange={(val: string | undefined) => onPromptChange(val || '')}
            language="markdown"
            theme="vs-dark"
            options={editorOptions}
            className="h-full w-full"
          />
        </div>
      </div>

      {/* --- ROW 2: DIVIDER --- */}
      <div className="w-full h-full bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.5)] z-50 relative" />

      {/* --- ROW 3: OUTPUT --- */}
      <div 
        className="relative min-h-0 w-full bg-black"
        onClick={() => setFocus('gen')}
      >
         {/* Label */}
         <div className={`absolute top-0 right-0 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest border-l border-b transition-colors duration-300 z-30 ${focus === 'gen' ? 'bg-green-950 text-green-400 border-green-700' : 'bg-zinc-900 text-zinc-600 border-zinc-800'}`}>
          Output
        </div>
        {/* Editor */}
        <div className="absolute inset-0">
          <MonacoEditor
            value={genValue}
            onChange={(val: string | undefined) => onGenChange(val || '')}
            language="javascript"
            theme="vs-dark"
            options={editorOptions}
            className="h-full w-full"
          />
        </div>
      </div>

    </div>
  );
};

export default WorkOrderCard;
