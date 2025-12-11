import React from 'react';
import { cn } from '../../src/lib/utils.js';

interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  borderColor: string;
}

const Panel: React.FC<PanelProps> = ({
  className,
  borderColor,
  children,
  ...props
}) => {
  return (
    <div
      className={cn(
        'bg-neutral-900 border-t-2',
        borderColor,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export { Panel };
