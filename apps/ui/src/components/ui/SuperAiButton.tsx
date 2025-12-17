import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Settings, User, Zap, ArrowRight, X } from 'lucide-react';
import { useFloating, offset, flip, shift, autoUpdate } from '@floating-ui/react';
import { cn } from '@/lib/utils.js';
import { trpc } from '../../utils/trpc.js';

// Lazy load the role selector
const CompactRoleSelector = React.lazy(() => import('../CompactRoleSelector.js'));

type ButtonState = 'idle' | 'active' | 'menu' | 'role_select' | 'config';

type SuperAiButtonProps = {
  contextId?: string;
  className?: string;
  expandUp?: boolean;
  onGenerate?: (prompt: string) => void;
};

export const SuperAiButton: React.FC<SuperAiButtonProps> = ({ 
  contextId, 
  className, 
  expandUp = false,
  onGenerate,
}) => {
  const [state, setState] = useState<ButtonState>('idle');
  const [prompt, setPrompt] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState<string | undefined>();
  
  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  
  // Floating UI for menu positioning
  const { refs, floatingStyles } = useFloating({
    placement: expandUp ? 'top' : 'bottom',
    middleware: [
      offset(8),
      flip(),
      shift({ padding: 8 }),
    ],
    whileElementsMounted: autoUpdate,
  });

  // Dispatch mutation
  const dispatchMutation = trpc.orchestrator.dispatch.useMutation({
    onSuccess: (data) => {
      console.log('✅ Command dispatched:', data);
      setPrompt('');
      setState('idle');
    },
    onError: (error) => {
      console.error('❌ Dispatch failed:', error);
    },
  });

  // Focus input when entering active state
  useEffect(() => {
    if (state === 'active' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [state]);

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    
    if (onGenerate) {
      onGenerate(prompt);
    } else {
      dispatchMutation.mutate({
        prompt,
        contextId,
        roleId: selectedRoleId,
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleGenerate();
    } else if (e.key === 'Escape') {
      setState('idle');
      setPrompt('');
    }
  };

  const handleRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setState(state === 'menu' ? 'idle' : 'menu');
  };

  const handleRoleSelect = (roleId: string) => {
    setSelectedRoleId(roleId);
    setState('menu');
  };

  return (
    <div className={cn("relative inline-flex", className)}>
      {/* Main Button */}
      <button
        ref={(node) => {
          buttonRef.current = node;
          refs.setReference(node);
        }}
        onClick={() => setState(state === 'idle' ? 'active' : 'idle')}
        onContextMenu={handleRightClick}
        className={cn(
          "h-8 w-8 flex items-center justify-center rounded-full transition-all border relative",
          "shadow-lg hover:shadow-xl",
          state === 'menu' || state === 'role_select' || state === 'config'
            ? "bg-[var(--color-background-secondary)] border-[var(--color-primary)] text-[var(--color-primary)]" 
            : "bg-gradient-to-br from-[var(--color-primary)] to-purple-600 text-white border-transparent",
          "hover:scale-110 active:scale-95"
        )}
        title="AI Command Center (Right-click for menu)"
      >
        <AnimatePresence mode="wait">
          {state === 'menu' || state === 'role_select' || state === 'config' ? (
            <motion.div
              key="x"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <X size={16} />
            </motion.div>
          ) : (
            <motion.div
              key="sparkles"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="relative"
            >
              <Sparkles size={16} />
              {state === 'idle' && (
                <motion.div
                  className="absolute inset-0"
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 0, 0.5],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  <Sparkles size={16} />
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </button>

      {/* Active Input Mode */}
      <AnimatePresence>
        {state === 'active' && (
          <motion.div
            initial={{ width: 32, opacity: 0 }}
            animate={{ width: 300, opacity: 1 }}
            exit={{ width: 32, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="absolute left-0 top-0 flex items-center bg-[var(--color-background-secondary)]/95 backdrop-blur-md border border-[var(--color-primary)]/50 rounded-full overflow-hidden h-8 shadow-[0_0_20px_rgba(var(--color-primary),0.3)]"
          >
            <div className="pl-2 pr-1 text-[var(--color-primary)]">
              <Sparkles size={14} />
            </div>
            <input
              ref={inputRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={() => {
                // Delay to allow button click
                setTimeout(() => {
                  if (state === 'active' && !prompt.trim()) {
                    setState('idle');
                  }
                }, 200);
              }}
              className="flex-1 bg-transparent text-[var(--color-text)] text-xs px-2 focus:outline-none placeholder:text-[var(--color-text-secondary)]/50"
              placeholder="Command the AI..."
            />
            <button 
              onClick={handleGenerate}
              disabled={!prompt.trim() || dispatchMutation.isLoading}
              className="text-[var(--color-primary)] hover:text-white pr-2 transition-colors disabled:opacity-50"
            >
              {dispatchMutation.isLoading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <Sparkles size={14} />
                </motion.div>
              ) : (
                <ArrowRight size={14} />
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bloom Menu */}
      <AnimatePresence>
        {state === 'menu' && (
          <motion.div
            ref={refs.setFloating}
            style={floatingStyles}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="bg-[var(--color-background-secondary)]/95 backdrop-blur-md border border-[var(--color-border)] p-1 rounded-lg shadow-2xl z-[100] min-w-[160px]"
          >
            <div className="grid grid-cols-3 gap-1">
              <MenuButton 
                icon={<User size={14} />} 
                label="Roles" 
                onClick={() => setState('role_select')} 
              />
              <MenuButton 
                icon={<Settings size={14} />} 
                label="Config" 
                onClick={() => setState('config')} 
              />
              <MenuButton 
                icon={<Zap size={14} />} 
                label="Events" 
                onClick={() => console.log('Events clicked')} 
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sub-Panels (Role Selector / Config) */}
      <AnimatePresence>
        {(state === 'role_select' || state === 'config') && (
          <motion.div
            ref={refs.setFloating}
            style={floatingStyles}
            initial={{ opacity: 0, scale: 0.95, y: expandUp ? 10 : -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: expandUp ? 10 : -10 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="w-64 bg-[var(--color-background-secondary)] border border-[var(--color-border)] rounded-lg shadow-2xl overflow-hidden z-[100]"
          >
            {/* Header */}
            <div className="flex justify-between items-center px-2 py-1 bg-[var(--color-background)]/30 border-b border-[var(--color-border)]">
              <span className="text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">
                {state === 'role_select' ? 'Select Role' : 'Configuration'}
              </span>
              <button 
                onClick={() => setState('menu')}
                className="text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors"
              >
                <X size={12} />
              </button>
            </div>

            {/* Content */}
            <div className="max-h-56 overflow-y-auto custom-scrollbar">
              <React.Suspense fallback={
                <div className="p-3 text-[10px] text-[var(--color-text-secondary)]">
                  Loading...
                </div>
              }>
                {state === 'role_select' && (
                  <CompactRoleSelector 
                    onSelect={handleRoleSelect}
                    selectedRoleId={selectedRoleId}
                  />
                )}
                {state === 'config' && (
                  <div className="p-3 text-[10px] text-[var(--color-text-secondary)]">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span>Context ID:</span>
                        <code className="text-[9px] bg-[var(--color-background)]/50 px-1 rounded">
                          {contextId || 'none'}
                        </code>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Selected Role:</span>
                        <code className="text-[9px] bg-[var(--color-background)]/50 px-1 rounded">
                          {selectedRoleId || 'auto'}
                        </code>
                      </div>
                    </div>
                  </div>
                )}
              </React.Suspense>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Menu Button Component (High Density)
const MenuButton = ({ 
  icon, 
  label, 
  onClick 
}: { 
  icon: React.ReactNode; 
  label: string; 
  onClick: () => void;
}) => (
  <button 
    onClick={onClick}
    className="flex flex-col items-center justify-center w-12 h-12 hover:bg-white/5 rounded transition-colors text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] border border-transparent hover:border-[var(--color-border)]/50 gap-0.5"
    title={label}
  >
    {icon}
    <span className="text-[9px] font-medium">{label}</span>
  </button>
);
