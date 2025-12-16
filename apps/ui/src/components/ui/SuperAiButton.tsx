import React, { useState, useRef, useEffect, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Settings, User, Zap, ArrowRight, X } from 'lucide-react';
import { cn } from '@/lib/utils.js';

const CompactRoleSelector = React.lazy(() => import('../CompactRoleSelector.js'));

type AiButtonProps = {
  contextId?: string;
  className?: string;
  expandUp?: boolean;    // Expand upwards?
  onGenerate: (prompt: string) => void;
};

export const SuperAiButton: React.FC<AiButtonProps> = ({ 
  contextId: _contextId, 
  className, 
  expandUp = false, 
  onGenerate 
}) => {
  const [mode, setMode] = useState<string>('idle');
  const inputRef = useRef<HTMLInputElement>(null);
  const [prompt, setPrompt] = useState('');

  useEffect(() => {
    if (mode === 'input' && inputRef.current) inputRef.current.focus();
  }, [mode]);

  const handleBloom = (e: React.MouseEvent) => {
    e.preventDefault();
    setMode(mode === 'menu' ? 'idle' : 'menu');
  };

  return (
    <div className={cn("relative z-50 inline-flex flex-col items-center", className)}>
      <AnimatePresence mode="wait">
        
        {/* INPUT MODE - Always expands naturally (Centered or LTR) */}
        {mode === 'input' && (
          <motion.div
            initial={{ width: 40, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 40, opacity: 0 }}
            className="absolute bottom-0 flex items-center bg-[var(--color-background-secondary)]/90 backdrop-blur-md border border-[var(--color-primary)]/50 rounded-full overflow-hidden h-10 shadow-[0_0_20px_rgba(var(--color-primary),0.2)]"
          >
            <div className="pl-3 pr-2 text-[var(--color-primary)]"><Sparkles size={16} /></div>
            <input
              ref={inputRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onGenerate(prompt)}
              className="w-full bg-transparent text-[var(--color-text)] text-sm px-2 focus:outline-none placeholder:text-[var(--color-text-secondary)]/50"
              placeholder="Command the AI..."
            />
            <button onClick={() => onGenerate(prompt)} className="text-[var(--color-primary)] hover:text-white pr-3 transition-colors">
              <ArrowRight size={16} />
            </button>
          </motion.div>
        )}

        {/* MAIN BUTTON (Hidden when Input is active to prevent clutter, or kept as anchor) */}
        {mode !== 'input' && (
          <motion.button
            layout
            onClick={() => setMode('input')}
            onContextMenu={handleBloom}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className={cn(
              "h-10 w-10 flex items-center justify-center rounded-full shadow-2xl transition-all border relative z-10",
              mode === 'menu' 
                ? "bg-[var(--color-background-secondary)] border-[var(--color-primary)] text-[var(--color-primary)]" 
                : "bg-gradient-to-br from-[var(--color-primary)] to-purple-600 text-white border-transparent hover:shadow-[0_0_15px_rgba(var(--color-primary),0.6)]"
            )}
          >
            {mode === 'menu' ? <X size={18} /> : <Sparkles size={18} />}
          </motion.button>
        )}
      </AnimatePresence>

      {/* BLOOM MENU (Context) */}
      <AnimatePresence>
        {mode === 'menu' && (
          <div 
            className={cn(
              "absolute left-1/2 -translate-x-1/2 bg-[var(--color-background-secondary)]/95 backdrop-blur-md border border-[var(--color-border)] p-2 rounded-xl shadow-2xl z-50 w-max min-w-[180px]",
              expandUp ? "bottom-14 origin-bottom" : "top-14 origin-top"
            )}
          >
            <div className="grid grid-cols-3 gap-2">
              <BloomItem icon={<User size={16} />} label="Roles" onClick={() => setMode('role_select')} />
              <BloomItem icon={<Settings size={16} />} label="Config" onClick={() => setMode('config')} />
              <BloomItem icon={<Zap size={16} />} label="Events" onClick={() => console.log('Events')} />
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* SUB-PANELS */}
      <AnimatePresence>
        {(mode === 'role_select' || mode === 'config') && (
          <motion.div 
            initial={{ opacity: 0, y: expandUp ? 10 : -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: expandUp ? 10 : -10, scale: 0.95 }}
            className={cn(
              "absolute left-1/2 -translate-x-1/2 w-72 bg-[var(--color-background-secondary)] border border-[var(--color-border)] rounded-xl shadow-2xl overflow-hidden z-50",
              expandUp ? "bottom-36" : "top-36"
            )}
          >
            <div className="flex justify-between items-center p-3 bg-[var(--color-background-secondary)]/30 border-b border-[var(--color-border)]">
              <span className="text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">
                {mode === 'role_select' ? 'Select Role' : 'Configuration'}
              </span>
              <button onClick={() => setMode('menu')}><X size={14} className="text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]"/></button>
            </div>
            <div className="max-h-64 overflow-y-auto custom-scrollbar bg-[var(--color-background)]/50">
              <Suspense fallback={<div className="p-4 text-xs text-[var(--color-text-secondary)]">Loading module...</div>}>
                {mode === 'role_select' && <CompactRoleSelector />}
                {mode === 'config' && <div className="p-4 text-xs text-[var(--color-text-secondary)]">Settings Panel Placeholder</div>}
              </Suspense>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const BloomItem = ({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className="flex flex-col items-center justify-center w-14 h-14 hover:bg-white/5 rounded-lg transition-colors text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] border border-transparent hover:border-[var(--color-border)]/50 shrink-0 gap-1"
    title={label}
  >
    {icon}
    <span className="text-[10px] font-medium">{label}</span>
  </button>
);
