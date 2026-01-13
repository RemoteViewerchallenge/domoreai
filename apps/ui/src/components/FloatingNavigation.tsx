import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils.js';
import { useNavigate } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';

interface NavItemDef {
  label: string;
  path?: string;
  icon?: LucideIcon;
  action?: () => void;
}

export const FloatingNavigation = ({ items = [] }: { items: NavItemDef[] }) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div 
      className="fixed z-[100] flex flex-col-reverse items-start gap-3"
      style={{
        bottom: 'var(--components-floating-nav-offset-bottom)',
        left: 'var(--components-floating-nav-offset-left)',
      }}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn("flex items-center justify-center shadow-2xl backdrop-blur-md transition-all", isOpen ? "bg-[var(--colors-primary)] text-white" : "bg-[var(--components-floating-nav-background)] text-[var(--colors-primary)] border border-[var(--colors-primary)]/30")}
        style={{
          width: 'var(--components-floating-nav-button-size)',
          height: 'var(--components-floating-nav-button-size)',
          borderRadius: 'var(--components-floating-nav-radius)',
        }}
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="flex flex-col gap-2 mb-2 origin-bottom-left">
            {items.map((item) => (
              <button
                key={item.label}
                onClick={() => { 
                  if (item.action) {
                    item.action();
                  } else if (item.path) {
                    navigate(item.path);
                  }
                  setIsOpen(false); 
                }}
                className="flex items-center gap-3 px-4 py-2 backdrop-blur-md shadow-lg border border-[var(--colors-border)] hover:border-[var(--colors-primary)] bg-[var(--components-floating-nav-background)] text-[var(--colors-text)] rounded-[var(--shape-radius-lg)]"
              >
                {item.icon && <item.icon size={16} />}
                <span className="text-sm">{item.label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
