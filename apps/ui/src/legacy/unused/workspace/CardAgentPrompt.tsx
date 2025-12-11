import React, { useState } from 'react';
import { Send, X, Sparkles } from 'lucide-react';

interface CardAgentPromptProps {
  cardId: string;
  cardContext: {
    currentPath: string;
    activeFile: string | null;
    content: string;
    type: 'editor' | 'code' | 'browser' | 'terminal';
  };
  onSubmit: (prompt: string) => void;
  isLoading?: boolean;
}

/**
 * Expandable prompt input for card-specific agent interactions
 * Provides context from the current card state
 */
export const CardAgentPrompt: React.FC<CardAgentPromptProps> = ({
  cardId,
  cardContext,
  onSubmit,
  isLoading = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [prompt, setPrompt] = useState('');

  const handleSubmit = () => {
    if (prompt.trim() && !isLoading) {
      onSubmit(prompt);
      setPrompt('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      setIsExpanded(false);
    }
  };

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="flex items-center gap-2 px-2 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded text-[10px] font-bold uppercase tracking-wider transition-all shadow-[0_0_10px_rgba(168,85,247,0.4)]"
      >
        <Sparkles size={12} />
        Ask Agent
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-3 bg-zinc-900 border border-purple-500 rounded">
      {/* Context Info */}
      <div className="flex items-center justify-between text-[10px] text-[var(--color-text-secondary)]">
        <div className="flex items-center gap-2">
          <Sparkles size={12} className="text-purple-400" />
          <span>Agent will receive context from this card</span>
        </div>
        <button
          onClick={() => setIsExpanded(false)}
          className="p-1 hover:bg-zinc-800 rounded text-[var(--color-text-secondary)] hover:text-white"
        >
          <X size={12} />
        </button>
      </div>

      {/* Context Preview */}
      <div className="text-[9px] text-zinc-600 font-mono bg-black/50 p-2 rounded space-y-1">
        <div>📁 Path: {cardContext.currentPath}</div>
        {cardContext.activeFile && <div>📄 File: {cardContext.activeFile}</div>}
        <div>🖥️ View: {cardContext.type}</div>
      </div>

      {/* Prompt Input */}
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask the agent about this card's content... (Cmd/Ctrl+Enter to send)"
        className="w-full h-20 bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-purple-500 resize-none"
        autoFocus
      />

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="text-[9px] text-zinc-600">
          Cmd/Ctrl+Enter to send • Esc to close
        </div>
        <button
          onClick={handleSubmit}
          disabled={!prompt.trim() || isLoading}
          className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded text-xs font-bold transition-all"
        >
          <Send size={12} />
          {isLoading ? 'Sending...' : 'Send'}
        </button>
      </div>
    </div>
  );
};