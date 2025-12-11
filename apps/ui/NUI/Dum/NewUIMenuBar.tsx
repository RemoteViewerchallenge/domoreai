import React from 'react';
import { callVoid } from '../../src/lib/callVoid.js';
import { Bot, Settings } from 'lucide-react';
import { AnimationToggle } from '../ui/AnimationToggle.js';

interface NewUIMenuBarProps {
  onToggleSidebar: () => void;
}

export const NewUIMenuBar: React.FC<NewUIMenuBarProps> = ({ onToggleSidebar }) => {
  return (
    <div className="flex-none h-12 px-4 flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-background-secondary)]">
      <div className="flex items-center gap-4">
        <div className="font-bold text-lg text-[var(--color-primary)]">
          UI Sandbox
        </div>
      </div>

      <div className="flex items-center gap-6">
        <AnimationToggle />
        <button
          onClick={() => callVoid(onToggleSidebar)}
          className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors"
          title="Toggle Theme Editor (Ctrl+E)"
        >
          <Settings size={20} />
        </button>
        <button
          onClick={() => alert('Global AI Context Button Clicked!')}
          className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors"
          title="Global AI Assistant"
        >
          <Bot size={20} />
        </button>
      </div>
    </div>
  );
};