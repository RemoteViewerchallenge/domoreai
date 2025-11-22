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
  // Default: Prompt 2, Gen 8
  // Prompt Focus: Prompt 5, Gen 5
  // Gen Focus: Prompt 1, Gen 9
  
  let splitRatio = 20; // Default
  if (focus === 'prompt') splitRatio = 50;
  if (focus === 'gen') splitRatio = 10;

  return (
    <div 
      className={`relative w-full h-full flex flex-col overflow-hidden transition-all duration-300 ${
        isActive ? 'shadow-[0_0_10px_rgba(59,130,246,0.3)] z-10' : 'opacity-60 hover:opacity-100'
      } bg-black`}
    >
      {/* Prompt Area (Top) */}
      <div 
        className="w-full transition-all duration-500 ease-in-out flex flex-col bg-gray-950/20"
        style={{ height: `${splitRatio}%` }}
        onClick={() => setFocus('prompt')}
      >
        <div className="flex-1 relative">
          {/* > Indicator */}
          <div className="absolute left-1 top-1 text-cyan-500 text-xs z-10 pointer-events-none">
            &gt;
          </div>
          <MonacoEditor
            value={promptValue}
            onChange={(val) => onPromptChange(val || '')}
            language="markdown"
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              lineNumbers: 'off',
              folding: false,
              padding: { top: 4, bottom: 4 },
              fontSize: 11,
              fontFamily: 'monospace',
              wordWrap: 'on',
              scrollBeyondLastLine: false,
              renderLineHighlight: 'none',
              hideCursorInOverviewRuler: true,
              overviewRulerBorder: false,
              scrollbar: { vertical: 'auto', horizontal: 'hidden' },
            }}
            className="h-full w-full"
          />
        </div>
      </div>

      {/* Divider between Prompt and Generation */}
      <div className="w-full h-px bg-cyan-500" />

      {/* Generation Area (Bottom) */}
      <div 
        className="w-full transition-all duration-500 ease-in-out flex flex-col bg-gray-900/20"
        style={{ height: `${100 - splitRatio}%` }}
        onClick={() => setFocus('gen')}
      >
        <div className="flex-1 relative">
          <MonacoEditor
            value={genValue}
            onChange={(val) => onGenChange(val || '')}
            language="javascript"
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              lineNumbers: 'off',
              folding: false,
              padding: { top: 4, bottom: 4 },
              fontSize: 11,
              fontFamily: 'monospace',
              wordWrap: 'on',
              scrollBeyondLastLine: false,
              renderLineHighlight: 'none',
              hideCursorInOverviewRuler: true,
              overviewRulerBorder: false,
              scrollbar: { vertical: 'auto', horizontal: 'hidden' },
            }}
            className="h-full w-full"
          />
        </div>
      </div>
    </div>
  );
};

export default WorkOrderCard;
