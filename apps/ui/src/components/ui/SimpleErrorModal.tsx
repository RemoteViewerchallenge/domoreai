import React from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { callVoid } from '../../lib/callVoid.js';

interface SimpleErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  error: string | null;
  title?: string;
}

export const SimpleErrorModal: React.FC<SimpleErrorModalProps> = ({
  isOpen,
  onClose,
  error,
  title = "Error"
}) => {
  if (!isOpen || !error) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-[500px] max-w-[90vw] bg-zinc-950 border border-red-500/30 rounded-lg shadow-[0_0_30px_rgba(239,68,68,0.1)] overflow-hidden flex flex-col max-h-[80vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900/50 flex-none">
          <div className="flex items-center gap-2 text-red-400 font-bold uppercase tracking-wider text-xs">
            <AlertTriangle size={14} />
            <span>{title}</span>
          </div>
          <button onClick={() => callVoid(onClose)} className="text-[var(--color-text-secondary)] hover:text-white transition-colors">
            <X size={14} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          <div className="text-zinc-300 text-sm font-mono whitespace-pre-wrap break-words select-text">
            {error}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/30 flex justify-end flex-none">
          <button
            onClick={() => callVoid(onClose)}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded text-xs font-bold uppercase transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
