import React, { useState, useEffect, useRef } from 'react';
import { Terminal as TerminalIcon, Send } from 'lucide-react';
import type { TerminalMessage } from '@repo/common/agent';

interface InteractiveTerminalProps {
  logs: TerminalMessage[];
  onSendCommand?: (command: string) => void;
}

export const InteractiveTerminal: React.FC<InteractiveTerminalProps> = ({ logs, onSendCommand }) => {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleSend = () => {
    if (!input.trim()) return;
    onSendCommand?.(input);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-black font-mono text-sm">
      {/* Terminal Output */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {logs.length === 0 && (
          <div className="text-zinc-600 italic">No logs yet. Start an agent or type a command...</div>
        )}
        {logs.map((log, i) => (
          <div key={i} className="flex gap-2 break-all">
            <span className="text-[var(--color-text-secondary)] shrink-0">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
            <span className={`
              ${log.type === 'error' ? 'text-red-500' : ''}
              ${log.type === 'warn' ? 'text-yellow-500' : ''}
              ${log.type === 'command' ? 'text-cyan-400 font-bold' : ''}
              ${log.type === 'response' ? 'text-green-400' : ''}
              ${log.type === 'info' ? 'text-zinc-300' : ''}
            `}>
              {log.type === 'command' && '$ '}
              {log.message}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div className="flex items-center gap-2 p-2 bg-zinc-900 border-t border-zinc-800">
        <TerminalIcon size={16} className="text-[var(--color-text-secondary)]" />
        <input
          className="flex-1 bg-transparent border-none outline-none text-zinc-200 placeholder-zinc-600"
          placeholder="Type a command..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button 
          onClick={handleSend}
          className="p-1 hover:bg-zinc-800 rounded text-[var(--color-text-secondary)] hover:text-white transition-colors"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
};
