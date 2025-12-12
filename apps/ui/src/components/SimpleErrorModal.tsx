import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

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
          <button onClick={onClose} className="text-[var(--color-text-secondary)] hover:text-white transition-colors">
            <X size={14} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          <textarea
            defaultValue={error || ''}
            onFocus={(e) => { e.currentTarget.select(); }}
            className="w-full h-full bg-transparent text-zinc-300 text-sm font-mono whitespace-pre-wrap break-words resize-none focus:outline-none border border-zinc-800 rounded p-2"
            spellCheck={false}
          />
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/30 flex justify-end flex-none">
          <button
            onClick={() => {
              try {
                navigator.clipboard.writeText(error || '');
              } catch (e) {
                // ignore
              }
            }}
            className="mr-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded text-xs font-bold uppercase transition-colors"
          >
            Copy
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded text-xs font-bold uppercase transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
