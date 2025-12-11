import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface AccordionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

export const Accordion: React.FC<AccordionProps> = ({ 
  title, 
  children, 
  defaultOpen = false,
  className = '' 
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`border-b border-zinc-800 ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-2 bg-zinc-950 hover:bg-zinc-900 transition-colors text-left"
      >
        <span className="font-bold text-cyan-400 uppercase tracking-wider text-xs">
          {title}
        </span>
        <ChevronDown 
          size={16} 
          className={`text-cyan-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      
      {isOpen && (
        <div className="bg-black">
          {children}
        </div>
      )}
    </div>
  );
};
