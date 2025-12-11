import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Play, ExternalLink, Terminal as TerminalIcon, Plus } from 'lucide-react';

interface CustomButton {
  id: string;
  label: string;
  action: 'command' | 'url' | 'agent';
  actionData: string;
  icon?: string;
  color?: string;
}

interface CardCustomButtonsProps {
  cardId: string;
  buttons: CustomButton[];
  onExecute: (button: CustomButton) => void;
  onAddButton?: () => void;
}

/**
 * Expandable panel for custom action buttons per card
 * Buttons can run commands, open URLs, or trigger agent actions
 */
export const CardCustomButtons: React.FC<CardCustomButtonsProps> = ({
  cardId,
  buttons,
  onExecute,
  onAddButton
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getButtonIcon = (action: string, icon?: string) => {
    if (icon) return icon;
    switch (action) {
      case 'command': return <TerminalIcon size={14} />;
      case 'url': return <ExternalLink size={14} />;
      case 'agent': return <Play size={14} />;
      default: return <Play size={14} />;
    }
  };

  const getButtonColor = (color?: string) => {
    if (color) return color;
    return 'bg-cyan-600/20 border-cyan-500 text-cyan-300 hover:bg-cyan-600/30';
  };

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="flex items-center gap-2 px-2 py-1 bg-zinc-800/50 border border-zinc-700 text-[var(--color-text-secondary)] hover:bg-zinc-700 hover:text-zinc-300 rounded text-[10px] font-bold uppercase tracking-wider transition-all"
      >
        <ChevronUp size={12} />
        {buttons.length > 0 ? `Actions (${buttons.length})` : 'Actions'}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-2 bg-zinc-900/50 border border-zinc-700 rounded">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">
          Quick Actions
        </div>
        <button
          onClick={() => setIsExpanded(false)}
          className="p-0.5 hover:bg-zinc-800 rounded text-[var(--color-text-secondary)] hover:text-white"
        >
          <ChevronDown size={12} />
        </button>
      </div>

      {/* Buttons Grid - Compact with bright colors */}
      <div className="flex flex-wrap gap-1.5">
        {buttons.map((button) => (
          <button
            key={button.id}
            onClick={() => onExecute(button)}
            className="flex items-center gap-1 px-2 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-[10px] font-bold transition-all shadow-[0_0_10px_rgba(6,182,212,0.4)]"
            title={button.actionData}
          >
            {getButtonIcon(button.action, button.icon)}
            <span className="truncate max-w-[80px]">{button.label}</span>
          </button>
        ))}
        
        {/* Add Button */}
        {onAddButton && (
          <button
            onClick={onAddButton}
            className="flex items-center justify-center gap-1 px-2 py-1 bg-green-600 hover:bg-green-500 text-white rounded text-[10px] font-bold transition-all shadow-[0_0_10px_rgba(34,197,94,0.4)]"
          >
            <Plus size={12} />
            Add
          </button>
        )}
      </div>
    </div>
  );
};