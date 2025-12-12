import React from 'react';
import { Sparkles } from 'lucide-react';
import { useTheme } from '../hooks/useTheme.js';

interface AiActionTriggerProps {
  context: string;
  onAction?: (context: string) => void;
  className?: string;
  size?: number;
}

export const AiActionTrigger: React.FC<AiActionTriggerProps> = ({ 
  context, 
  onAction, 
  className = '',
  size = 16 
}) => {
  const { theme } = useTheme();
  
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('AI Action Triggered with context:', context);
    if (onAction) {
      onAction(context);
    }
    // TODO: Integrate with AI service/agent
  };

  return (
    <button
      onClick={handleClick}
      className={`group relative flex items-center justify-center rounded-full transition-all hover:scale-110 ${className}`}
      style={{
        background: theme.colors.primary.value,
        boxShadow: theme.colors.primary.glow,
        width: size * 1.5,
        height: size * 1.5,
      }}
      title="Ask AI"
    >
      <Sparkles 
        size={size} 
        className="text-black transition-transform group-hover:rotate-12" 
        strokeWidth={2.5}
      />
      <span className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full animate-pulse" />
    </button>
  );
};
