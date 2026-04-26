import { useState, useRef } from 'react';
import {
  Command, Sparkles, X, Layers,
  Workflow, Settings, Palette, Plus, Minus,
  ChevronDown, Terminal, Mic, Database, Users,
  ShieldCheck
} from 'lucide-react';
import { cn } from '../../../lib/utils.js';
import { useWorkspaceStore } from '../../../stores/workspace.store.js';
import { trpc } from '../../../utils/trpc.js';

// ─────────────────────────────────────────────────────────────────────────────
// Workflow definitions — drives the Workflows dropdown
// ─────────────────────────────────────────────────────────────────────────────
const WORKFLOWS = [
  { id: 'provider',   label: 'Provider & Billing',   icon: ShieldCheck, columnCount: 2 },
  { id: 'org',        label: 'Org & Orchestration',  icon: Users,       columnCount: 2 },
  { id: 'datacenter', label: 'Data Center',          icon: Database,    columnCount: 2 },
  { id: 'settings',   label: 'Settings & Config',    icon: Settings,    columnCount: 1 },
  { id: 'voice',      label: 'Voice Playground',     icon: Mic,         columnCount: 2 },
] as const;


interface GlobalContextBarProps {
  aiOpen?: boolean;
  setAiOpen?: (open: boolean) => void;
  onToggleTheme?: () => void;
  themeOpen?: boolean;
  /** Called when user clicks the log ticker — opens a terminal card in col 0 */
  onOpenTerminal?: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Log Ticker — polls systemHealth.getLogs every 5s
// ─────────────────────────────────────────────────────────────────────────────
function LogTicker({ onClick }: { onClick: () => void }) {
  const { data: logs } = trpc.systemHealth.getLogs.useQuery(
    { limit: 30 },
    { refetchInterval: 5000, refetchIntervalInBackground: true }
  );

  const tickerRef = useRef<HTMLDivElement>(null);

  // Build a single long string from all log entries (newest → oldest for visual flow)
  const tickerText = logs?.length
    ? logs.map(l => `${l.ts.substring(11, 19)} ${l.msg}`).join('   ·   ')
    : 'System nominal — no recent events';

  return (
    <button
      onClick={onClick}
      title="Click to open Terminal"
      className="flex-1 min-w-0 h-full flex items-center overflow-hidden cursor-pointer group relative"
    >
      {/* Fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-8 z-10 bg-gradient-to-r from-[var(--bg-secondary)] to-transparent pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-8 z-10 bg-gradient-to-l from-[var(--bg-secondary)] to-transparent pointer-events-none" />

      {/* Scrolling text */}
      <div
        ref={tickerRef}
        className="whitespace-nowrap font-mono text-[9px] text-[var(--text-muted)] group-hover:text-[var(--color-primary)] transition-colors animate-ticker"
        style={{ animation: 'ticker 40s linear infinite' }}
      >
        {tickerText}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{tickerText}
      </div>

      {/* Terminal hint on hover */}
      <div className="absolute right-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-1.5 py-0.5 z-20">
        <Terminal size={9} />
        <span className="text-[8px] font-bold uppercase tracking-wider">Open Terminal</span>
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Condensed Workspace (Screenspace) Flipper
// ─────────────────────────────────────────────────────────────────────────────
function WorkspaceFlipper() {
  const [open, setOpen] = useState(false);
  const { screenspaces, activeScreenspaceId, switchScreenspace } = useWorkspaceStore();
  const active = screenspaces.find(s => s.id === activeScreenspaceId);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        title="Switch Workspace"
        className={cn(
          'flex items-center gap-1 px-2 h-8 rounded-sm text-[9px] font-bold uppercase tracking-wider transition-all border',
          open
            ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
            : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] border-[var(--border-color)] hover:text-[var(--text-primary)] hover:border-[var(--color-primary)]/50'
        )}
      >
        <Layers size={11} />
        <span className="hidden sm:block">{active?.name ?? 'WS'}</span>
        <ChevronDown size={9} className={cn('transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute top-9 left-0 w-40 bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-xl rounded-sm py-1 z-50">
          <div className="px-3 py-1 text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
            Screenspaces
          </div>
          <div className="h-px bg-[var(--border-color)] my-1" />
          {screenspaces.map(ss => (
            <button
              key={ss.id}
              onClick={() => { switchScreenspace(ss.id); setOpen(false); }}
              className={cn(
                'w-full text-left px-3 py-1.5 text-[10px] transition-colors',
                ss.id === activeScreenspaceId
                  ? 'text-[var(--color-primary)] bg-[var(--color-primary)]/10 font-bold'
                  : 'hover:bg-[var(--bg-primary)] text-[var(--text-secondary)]'
              )}
            >
              {ss.id === activeScreenspaceId ? '● ' : '○ '}{ss.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Workflows Dropdown
// ─────────────────────────────────────────────────────────────────────────────
function WorkflowsDropdown() {
  const [open, setOpen] = useState(false);
  const { activeWorkflow, setActiveWorkflow, setColumns } = useWorkspaceStore();

  const handleSelect = (wf: typeof WORKFLOWS[number] | null) => {
    if (wf) {
      setActiveWorkflow(wf.id);
      setColumns(wf.columnCount); // Soft default — user can still override with +/-
    } else {
      setActiveWorkflow(null);
    }
    setOpen(false);
  };

  const activeWf = WORKFLOWS.find(w => w.id === activeWorkflow);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        title="Switch Workflow"
        className={cn(
          'flex items-center gap-1.5 px-2 h-8 rounded-sm text-[9px] font-bold uppercase tracking-wider transition-all border',
          open || activeWorkflow
            ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
            : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] border-[var(--border-color)] hover:text-[var(--text-primary)] hover:border-[var(--color-primary)]/50'
        )}
      >
        {activeWf ? <activeWf.icon size={11} /> : <Workflow size={11} />}
        <span className="hidden md:block">{activeWf?.label ?? 'Workflows'}</span>
        <ChevronDown size={9} className={cn('transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute top-9 left-0 w-52 bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-xl rounded-sm py-1 z-50">
          <div className="px-3 py-1 text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
            Active Workflows
          </div>
          <div className="h-px bg-[var(--border-color)] my-1" />
          {WORKFLOWS.map(wf => (
            <button
              key={wf.id}
              onClick={() => handleSelect(wf)}
              className={cn(
                'w-full text-left px-3 py-1.5 text-[10px] flex items-center gap-2 transition-colors',
                wf.id === activeWorkflow
                  ? 'text-[var(--color-primary)] bg-[var(--color-primary)]/10 font-bold'
                  : 'hover:bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              )}
            >
              <wf.icon size={12} />
              {wf.label}
              <span className="ml-auto text-[8px] text-[var(--text-muted)]">{wf.columnCount}col</span>
            </button>
          ))}
          <div className="h-px bg-[var(--border-color)] my-1" />
          <button
            onClick={() => handleSelect(null)}
            className="w-full text-left px-3 py-1.5 text-[10px] text-[var(--text-muted)] hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)] transition-colors"
          >
            ✕ Exit Workflow (Free Grid)
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Settings / Theme Dropdown
// ─────────────────────────────────────────────────────────────────────────────
function SettingsDropdown({ onToggleTheme, themeOpen }: { onToggleTheme?: () => void; themeOpen?: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        title="Settings & Theme"
        className={cn(
          'flex items-center justify-center w-8 h-8 rounded-sm transition-all border',
          open || themeOpen
            ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
            : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] border-[var(--border-color)] hover:text-[var(--text-primary)] hover:border-[var(--color-primary)]/50'
        )}
      >
        <Settings size={13} />
      </button>

      {open && (
        <div className="absolute top-9 right-0 w-48 bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-xl rounded-sm py-1 z-50">
          <button
            onClick={() => { onToggleTheme?.(); setOpen(false); }}
            className="w-full text-left px-3 py-1.5 text-[10px] flex items-center gap-2 hover:bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <Palette size={12} />
            Theme Engine
          </button>
          <button
            onClick={() => { useWorkspaceStore.getState().setActiveWorkflow('settings'); setOpen(false); }}
            className="w-full text-left px-3 py-1.5 text-[10px] flex items-center gap-2 hover:bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <Settings size={12} />
            Constitution & Settings
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Column Count Controls
// ─────────────────────────────────────────────────────────────────────────────
function ColumnControls() {
  const { columns, setColumns } = useWorkspaceStore();

  return (
    <div className="flex items-center gap-0.5">
      <button
        onClick={() => setColumns(columns - 1)}
        disabled={columns <= 2}
        title="Remove Column"
        className="w-6 h-6 flex items-center justify-center rounded-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-all border border-transparent hover:border-[var(--border-color)]"
      >
        <Minus size={11} />
      </button>
      <div className="min-w-[20px] text-center text-[10px] font-mono font-bold text-[var(--text-secondary)]">
        {columns}
      </div>
      <button
        onClick={() => setColumns(columns + 1)}
        disabled={columns >= 4}
        title="Add Column"
        className="w-6 h-6 flex items-center justify-center rounded-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-all border border-transparent hover:border-[var(--border-color)]"
      >
        <Plus size={11} />
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main GlobalContextBar
// ─────────────────────────────────────────────────────────────────────────────
export const GlobalContextBar = ({
  aiOpen,
  setAiOpen,
  onToggleTheme,
  themeOpen,
  onOpenTerminal,
}: GlobalContextBarProps) => {
  const { activeWorkflow } = useWorkspaceStore();

  return (
    <>
      {/* Ticker keyframe — injected once */}
      <style>{`
        @keyframes ticker {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>

      <div className="flex-none h-10 bg-[var(--bg-secondary)] border-b border-[var(--border-color)] flex items-center select-none px-2 gap-1.5 overflow-hidden">

        {/* ── LEFT: Core controls ── */}
        <div className="flex items-center gap-1 flex-none">
          <WorkflowsDropdown />
          <div className="w-px h-4 bg-[var(--border-color)]" />
          <WorkspaceFlipper />
          <div className="w-px h-4 bg-[var(--border-color)]" />
          <SettingsDropdown onToggleTheme={onToggleTheme} themeOpen={themeOpen} />
          <div className="w-px h-4 bg-[var(--border-color)]" />
          <ColumnControls />
        </div>

        <div className="w-px h-4 bg-[var(--border-color)] flex-none" />

        {/* ── CENTER: Log Ticker (fills all remaining space) ── */}
        <LogTicker onClick={onOpenTerminal ?? (() => {})} />

        <div className="w-px h-4 bg-[var(--border-color)] flex-none" />

        {/* ── RIGHT: Miniaturized AI Command ── */}
        <div className="flex items-center gap-1 flex-none">
          {aiOpen ? (
            <div className="flex items-center w-64 h-7 bg-[var(--bg-primary)] border border-[var(--color-primary)] rounded shadow-lg animate-in slide-in-from-right-2 overflow-hidden">
              <div className="w-7 h-full flex items-center justify-center text-[var(--color-primary)] bg-[var(--color-primary)]/10">
                <Sparkles size={12} className="animate-pulse" />
              </div>
              <input
                id="nebula-ai-input"
                autoFocus
                placeholder="Command the engine..."
                className="flex-1 h-full bg-transparent border-none outline-none text-[10px] px-2 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] font-mono"
                onBlur={() => setAiOpen?.(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    alert('Global Command: ' + e.currentTarget.value);
                    setAiOpen?.(false);
                  }
                  if (e.key === 'Escape') setAiOpen?.(false);
                }}
              />
              <button onClick={() => setAiOpen?.(false)} className="px-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <X size={11} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAiOpen?.(true)}
              className="group flex items-center gap-1.5 px-2 py-1 rounded-sm bg-[var(--bg-primary)] border border-[var(--border-color)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-all h-7"
            >
              <Sparkles size={11} className="text-[var(--color-primary)]" />
              <span className="text-[9px] font-bold uppercase tracking-wider">AI</span>
              <div className="flex items-center gap-0.5 text-[8px] text-[var(--text-muted)] font-mono bg-[var(--bg-secondary)] px-1 rounded">
                <span>⌘</span><span>K</span>
              </div>
            </button>
          )}

          {/* Active workflow pill */}
          {activeWorkflow && (
            <div className="hidden sm:flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-[var(--color-primary)] bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 rounded px-2 py-0.5">
              <Command size={8} />
              {activeWorkflow}
            </div>
          )}
        </div>
      </div>
    </>
  );
};
