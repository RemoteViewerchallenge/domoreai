import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useAnimations } from '../../theme/ThemeProvider';

interface AccordionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export const Accordion: React.FC<AccordionProps> = ({ title, defaultOpen = false, children }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const { enabled: animationsEnabled } = useAnimations();

  const handleToggle = () => setIsOpen(!isOpen);

  return (
    <div className="border-b border-[var(--color-border)] last:border-b-0">
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between p-4 bg-[var(--color-card-header,var(--color-background-secondary))] hover:bg-[var(--color-background-hover,var(--color-background))]/50 transition-colors"
      >
        <span className="font-semibold text-sm text-[var(--color-text)]">{title}</span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: animationsEnabled ? 0.2 : 0 }}
        >
          <ChevronDown size={16} className="text-[var(--color-text-secondary)]" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={animationsEnabled ? { height: 0, opacity: 0 } : false}
            animate={animationsEnabled ? { height: 'auto', opacity: 1 } : false}
            exit={animationsEnabled ? { height: 0, opacity: 0 } : false}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden bg-[var(--color-background-secondary)]"
          >
            <div className="border-t border-[var(--color-border)]">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
