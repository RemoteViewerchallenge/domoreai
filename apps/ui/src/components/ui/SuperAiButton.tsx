import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Settings, User, Zap, ArrowRight, X, Eye, EyeOff, Database } from 'lucide-react';
import { useFloating, offset, flip, shift, autoUpdate } from '@floating-ui/react';
import { cn } from '@/lib/utils.js';
import { trpc } from '../../utils/trpc.js';
import { useWorkspaceStore } from '../../stores/workspace.store.js';

// Lazy load the role selector
const CompactRoleSelector = React.lazy(() => import('../CompactRoleSelector.js'));

type ButtonState = 'idle' | 'active' | 'menu' | 'role_select' | 'config';

type SuperAiButtonProps = {
  contextId?: string; // The local context ID (e.g. "users-table", "terminal-1")
  className?: string;
  expandUp?: boolean;
  side?: 'left' | 'right'; // Expansion direction
  onGenerate?: (prompt: string) => void;
  defaultPrompt?: string;
};

export const SuperAiButton: React.FC<SuperAiButtonProps> = ({ 
  contextId, 
  className, 
  expandUp = false,
  side = 'right', // CHANGE DEFAULT TO RIGHT (expands into the screen)
  onGenerate,
  defaultPrompt = ''
}) => {
  const [state, setState] = useState<ButtonState>('idle');
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [selectedRoleId, setSelectedRoleId] = useState<string | undefined>();
  
  const inputRef = useRef<HTMLInputElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  
  // Workspace Store for Global Context
  const { aiContext, setAiContext } = useWorkspaceStore();

  // Floating UI for menu positioning
  const { refs, floatingStyles } = useFloating({
    placement: expandUp ? 'top-start' : 'bottom-start',
    middleware: [
      offset(12),
      flip(),
      shift({ padding: 10 }),
    ],
    whileElementsMounted: autoUpdate,
  });

  // Dispatch mutation
  const dispatchMutation = trpc.orchestrator.dispatch.useMutation({
    onSuccess: (data) => {
      console.log('✅ Command dispatched:', data);
      // setPrompt(''); // Keep prompt for reuse per user request
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
    
    // Construct the full payload
    const payload = {
        prompt,
        contextId: contextId || aiContext.scope, // Prefer local context, fallback to global
        roleId: selectedRoleId,
        // Include flags if needed by the backend
        flags: {
            limitContext: aiContext.isLimiting,
            injectState: aiContext.injectedState
        }
    };

    if (onGenerate) {
      onGenerate(prompt);
    } else {
      dispatchMutation.mutate(payload);
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

  // Determine button aesthetic based on context
  const isContextLimited = aiContext.isLimiting;

  return (
    <div className={cn("relative inline-flex z-[1000]", className)}>
      {/* Main Button */}
      <button
        ref={(node) => {
          buttonRef.current = node;
          refs.setReference(node);
        }}
        onClick={() => setState(state === 'idle' ? 'active' : 'idle')}
        onContextMenu={handleRightClick}
        className={cn(
          "h-8 w-8 flex items-center justify-center rounded-full transition-all border relative z-[1001]",
          "shadow-lg hover:shadow-xl hover:scale-110 active:scale-95",
          state !== 'idle'
            ? "bg-[var(--color-background-secondary)] border-[var(--color-primary)] text-[var(--color-primary)]" 
            : isContextLimited 
                ? "bg-zinc-700 text-zinc-300 border-zinc-600"
                : "bg-gradient-to-br from-[var(--color-primary)] to-purple-600 text-white border-transparent"
        )}
        title={contextId ? `AI Context: ${contextId}` : "AI Command Center (Right-click for menu)"}
      >
        <AnimatePresence mode="wait">
          {state === 'menu' || state === 'role_select' || state === 'config' ? (
            <motion.div
              key="close"
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
              <Sparkles size={16} className={cn(isContextLimited && "opacity-50")} />
              {state === 'idle' && !isContextLimited && (
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

      {/* Active Input Mode - Expands OUTWARDS */}
      <AnimatePresence>
        {state === 'active' && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            style={side === 'left' ? { right: '100%', marginRight: 8 } : { left: '100%', marginLeft: 8 }} // Push OUT, not OVER
            className={cn(
               "absolute top-0 h-8 flex items-center bg-zinc-900/95 backdrop-blur border border-purple-500/50 shadow-2xl z-[9999] min-w-[300px]",
               side === 'left' ? "rounded-l-full pr-4 pl-2" : "rounded-r-full pl-4 pr-2"
            )}
          >
            {/* If Left Side: Input first, then button */}
             <input
              ref={inputRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={() => {
                setTimeout(() => {
                  if (state === 'active' && !prompt.trim()) {
                    setState('idle');
                  }
                }, 200);
              }}
              className="flex-1 min-w-0 bg-transparent text-[var(--color-text)] text-xs px-2 focus:outline-none placeholder:text-[var(--color-text-secondary)]/50"
              placeholder={`Ask AI about ${contextId || 'Global Context'}...`}
            />
            
            <button 
              onClick={handleGenerate}
              disabled={!prompt.trim() || dispatchMutation.isLoading}
              className={cn(
                  "text-[var(--color-primary)] hover:text-white px-3 h-full hover:bg-[var(--color-primary)]/20 transition-colors disabled:opacity-50",
                  side === 'left' ? "border-r border-[var(--color-border)]/50 order-first" : "border-l border-[var(--color-border)]/50"
              )}
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
      {state === 'menu' && (
        <div 
            ref={refs.setFloating}
            style={floatingStyles}
            className="z-[9999]" // Force high z-index
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className={cn(
                   "bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl overflow-hidden z-[9999] min-w-[160px]",
                   side === 'left' ? "right-0" : "left-0" // Align to the edge of the button
                )}
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
        </div>
      )}

      {/* Sub-Panels (Role Selector / Config) */}
      {(state === 'role_select' || state === 'config') && (
        <div 
            ref={refs.setFloating}
            style={floatingStyles}
            className="z-[9999]"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="w-64 bg-[var(--color-background-secondary)] border border-[var(--color-border)] rounded-lg shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex justify-between items-center px-2 py-1.5 bg-[var(--color-background)]/30 border-b border-[var(--color-border)]">
              <span className="text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">
                {state === 'role_select' ? 'Select Role' : 'Context Configuration'}
              </span>
              <button 
                onClick={() => setState('menu')}
                className="text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors p-1"
              >
                <X size={12} />
              </button>
            </div>

            {/* Content */}
            <div className="max-h-64 overflow-y-auto custom-scrollbar">
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
                  <div className="p-2 space-y-1">
                     <div className="p-2 bg-[var(--color-background)]/50 rounded mb-2">
                        <div className="flex items-center justify-between text-[10px] text-[var(--color-text-muted)] mb-1">
                            <span>Target Scope:</span>
                            <span className="font-mono text-[var(--color-text)]">{contextId || 'Global'}</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-[var(--color-text-muted)]">
                            <span>Selected Role:</span>
                            <span className="font-mono text-[var(--color-text)]">{selectedRoleId || 'Auto'}</span>
                        </div>
                     </div>

                     <h4 className="text-[9px] font-bold uppercase text-[var(--color-text-muted)] px-1 mb-1">Visibility</h4>
                     <button 
                        onClick={() => setAiContext({ isLimiting: !aiContext.isLimiting })}
                        className={cn(
                            "w-full flex items-center justify-between px-2 py-1.5 rounded text-[10px] transition-all border",
                            aiContext.isLimiting 
                                ? "bg-purple-900/40 border-purple-500/30 text-purple-200" 
                                : "bg-transparent border-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-text)]/5"
                        )}
                     >
                        <div className="flex items-center gap-2">
                            {aiContext.isLimiting ? <EyeOff size={12} /> : <Eye size={12} />}
                            <span>Limit AI Visibility</span>
                        </div>
                        <div className={cn("w-2 h-2 rounded-full", aiContext.isLimiting ? "bg-purple-500 shadow-[0_0_5px_rgba(168,85,247,0.5)]" : "bg-[var(--color-border)]")} />
                     </button>

                     <h4 className="text-[9px] font-bold uppercase text-[var(--color-text-muted)] px-1 mt-2 mb-1">Data Injection</h4>
                     <button 
                        onClick={() => setAiContext({ injectedState: !aiContext.injectedState })}
                        className={cn(
                            "w-full flex items-center justify-between px-2 py-1.5 rounded text-[10px] transition-all border",
                            aiContext.injectedState 
                                ? "bg-blue-900/40 border-blue-500/30 text-blue-200" 
                                : "bg-transparent border-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-text)]/5"
                        )}
                     >
                        <div className="flex items-center gap-2">
                            <Database size={12} />
                            <span>Inject Local State</span>
                        </div>
                        <div className={cn("w-2 h-2 rounded-full", aiContext.injectedState ? "bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.5)]" : "bg-[var(--color-border)]")} />
                     </button>
                  </div>
                )}
              </React.Suspense>
            </div>
          </motion.div>
        </div>
      )}
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
    className="flex flex-col items-center justify-center w-full h-12 hover:bg-white/5 rounded transition-colors text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] border border-transparent hover:border-[var(--color-border)]/50 gap-0.5"
    title={label}
  >
    {icon}
    <span className="text-[9px] font-medium">{label}</span>
  </button>
);
