import React from 'react';
import { cn } from '@/lib/utils';

interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  borderColor?: string;
  borderDirection?: 't' | 'l' | 'b' | 'r';
}

const Panel = React.forwardRef<HTMLDivElement, PanelProps>(
  ({ className, borderColor = 'border-cyan-400', borderDirection = 't', ...props }, ref) => {
    const borderClass = `border-${borderDirection}-2`;

    return (
      <div
        ref={ref}
        className={cn(
          'bg-neutral-900',
          borderClass,
          borderColor,
          className
        )}
        {...props}
      />
    );
  }
);

Panel.displayName = 'Panel';

export { Panel };
