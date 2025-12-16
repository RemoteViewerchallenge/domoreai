import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutGrid, Database, Cpu, Layers, Settings, Menu, X, MonitorPlay } from 'lucide-react';
import { cn } from '@/lib/utils.js';

const NAV_ITEMS = [
  { path: '/', label: 'Workspace', icon: <LayoutGrid size={16} /> }, 
  { path: '/focus', label: 'Focus Mode', icon: <MonitorPlay size={16} /> },
  { path: '/data', label: 'Data Explorer', icon: <Database size={16} /> },
  { path: '/creator', label: 'Creator Studio', icon: <Cpu size={16} /> },
  { path: '/coore', label: 'System Core', icon: <Layers size={16} /> },
  { path: '/settings', label: 'Settings', icon: <Settings size={16} /> },
];

export const FloatingNavigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="fixed bottom-6 left-6 z-[100] flex flex-col-reverse items-start gap-3">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "h-10 w-10 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 backdrop-blur-md",
          isOpen 
            ? "bg-[var(--color-primary)] text-[var(--color-background)] rotate-90" 
            : "bg-[var(--color-background-secondary)]/80 border border-[var(--color-primary)]/30 text-[var(--color-primary)] hover:border-[var(--color-primary)] hover:bg-[var(--color-background-secondary)]"
        )}
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="flex flex-col gap-1 mb-1 origin-bottom-left"
          >
            {NAV_ITEMS.map((item) => {
              const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
              return (
                <motion.button
                  key={item.path}
                  onClick={() => { navigate(item.path); setIsOpen(false); }}
                  whileHover={{ x: 4 }}
                  className={cn(
                    "flex items-center gap-3 px-3 py-1.5 rounded-md backdrop-blur-md shadow-lg transition-all min-w-[140px] border",
                    isActive
                      ? "bg-gradient-to-r from-[var(--color-primary)] to-purple-600 text-white border-transparent font-medium"
                      : "bg-[var(--color-background-secondary)]/90 text-[var(--color-text-secondary)] border-[var(--color-border)]/50 hover:border-[var(--color-primary)]/50 hover:text-[var(--color-text)] hover:bg-[var(--color-background-secondary)]"
                  )}
                >
                  {item.icon}
                  <span className="text-xs">{item.label}</span>
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
