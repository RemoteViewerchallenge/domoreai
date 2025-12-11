import React, { useState } from 'react';
import { 
  FileText, Code, Terminal, FolderTree, Globe, Sparkles,
  Mic, Settings, Play, Search, Zap, Activity, ChevronDown, ChevronUp
} from 'lucide-react';

const WideScreenWorkspace = () => {
  // Professional unified colors
  const colors = {
    bg: '#0a0e14',
    bgCard: '#13171f',
    bgHeader: '#1a1f2e',
    border: '#2d3748',
    primary: '#60a5fa',
    secondary: '#a78bfa',
    accent: '#34d399',
    warning: '#fbbf24',
    text: '#e2e8f0',
    textMuted: '#94a3b8',
    textDim: '#64748b',
  };

  const [activityLogs] = useState([
    { time: '14:32:01', msg: 'AI completed Product Strategy analysis', type: 'success' },
    { time: '14:31:45', msg: 'Code compilation successful', type: 'success' },
    { time: '14:30:22', msg: 'Terminal: npm run dev started', type: 'info' },
    { time: '14:29:15', msg: 'File saved: App.tsx', type: 'info' },
  ]);

  // 4 columns for wide screen
  const [workspace] = useState([
    {
      col: 0,
      mainCard: { id: 'm1', view: 'editor', title: 'Product Strategy.docx', aiActive: true },
      immediate: { // Cards 1 position away
        above: { id: 'i1a', title: 'Meeting Notes', view: 'editor' },
        below: { id: 'i1b', title: 'Roadmap Q1', view: 'editor' },
      },
      distant: { // Cards 2+ positions away (compressed)
        above: [
          { id: 'd1a1', title: 'Budget', view: 'editor' },
          { id: 'd1a2', title: 'Team Doc', view: 'editor' },
        ],
        below: [
          { id: 'd1b1', title: 'Archive 1', view: 'editor' },
          { id: 'd1b2', title: 'Archive 2', view: 'editor' },
        ],
      },
    },
    {
      col: 1,
      mainCard: { id: 'm2', view: 'code', title: 'App.tsx', aiActive: true },
      immediate: {
        above: { id: 'i2a', title: 'utils.ts', view: 'code' },
        below: { id: 'i2b', title: 'styles.css', view: 'code' },
      },
      distant: {
        above: [
          { id: 'd2a1', title: 'config.ts', view: 'code' },
        ],
        below: [
          { id: 'd2b1', title: 'test.ts', view: 'code' },
        ],
      },
    },
    {
      col: 2,
      mainCard: { id: 'm3', view: 'terminal', title: 'Terminal', aiActive: false },
      immediate: {
        above: { id: 'i3a', title: 'Files', view: 'files' },
        below: { id: 'i3b', title: 'React Docs', view: 'browser' },
      },
      distant: {
        above: [],
        below: [
          { id: 'd3b1', title: 'API Docs', view: 'browser' },
        ],
      },
    },
    {
      col: 3,
      mainCard: { id: 'm4', view: 'files', title: 'Project Files', aiActive: false },
      immediate: {
        above: { id: 'i4a', title: 'Search', view: 'browser' },
        below: { id: 'i4b', title: 'Logs', view: 'terminal' },
      },
      distant: {
        above: [
          { id: 'd4a1', title: 'Old Files', view: 'files' },
        ],
        below: [],
      },
    },
  ]);

  const viewIcons = {
    editor: FileText,
    code: Code,
    terminal: Terminal,
    files: FolderTree,
    browser: Globe,
  };

  const MiniCard = ({ card, size = 'normal' }) => {
    const Icon = viewIcons[card.view] || FileText;
    if (size === 'compressed') {
      return (
        <div
          className="flex items-center justify-center w-8 h-8 rounded cursor-pointer transition-all hover:scale-110"
          style={{
            backgroundColor: colors.bgCard,
            border: `1px solid ${colors.border}`,
          }}
          title={card.title}
        >
          <Icon size={10} style={{ color: colors.primary }} />
        </div>
      );
    }
    
    return (
      <div
        className="flex items-center gap-2 px-3 py-2 rounded cursor-pointer transition-all hover:scale-105"
        style={{
          backgroundColor: colors.bgCard,
          border: `1px solid ${colors.border}`,
          minWidth: '120px',
        }}
      >
        <Icon size={12} style={{ color: colors.primary }} />
        <span className="text-[10px] font-semibold truncate" style={{ color: colors.text }}>
          {card.title}
        </span>
      </div>
    );
  };

  const MainCard = ({ card }) => {
    const Icon = viewIcons[card.view] || FileText;

    return (
      <div 
        className="flex flex-col h-full rounded overflow-hidden"
        style={{
          backgroundColor: colors.bgCard,
          border: `2px solid ${colors.primary}`,
          boxShadow: `0 0 20px ${colors.primary}30`,
          aspectRatio: '8.5 / 11',
          maxHeight: '100%',
        }}
      >
        {/* Card Header */}
        <div 
          className="flex items-center justify-between px-3 py-2 border-b"
          style={{ 
            backgroundColor: colors.bgHeader,
            borderColor: colors.border,
          }}
        >
          <div className="flex items-center gap-2">
            <Icon size={14} style={{ color: colors.primary }} />
            <span className="text-xs font-bold" style={{ color: colors.text }}>
              {card.title}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {card.aiActive && (
              <Sparkles size={12} className="animate-pulse" style={{ color: colors.warning }} />
            )}
            <button className="p-1 rounded" style={{ color: colors.textMuted }}>
              <Zap size={12} />
            </button>
          </div>
        </div>

        {/* Card Content */}
        <div className="flex-1 overflow-hidden">
          {card.view === 'editor' && (
            <div className="h-full overflow-y-auto p-6" style={{ backgroundColor: '#ffffff' }}>
              <h1 className="text-3xl font-bold mb-4" style={{ color: '#1a1a1a' }}>Product Strategy 2025</h1>
              <div className="h-1 mb-4" style={{ backgroundColor: colors.primary, width: '80px' }}></div>
              <p className="text-base leading-relaxed mb-4" style={{ color: '#4a4a4a' }}>
                Our product vision focuses on three core pillars: innovation, accessibility, and sustainability. 
                By leveraging cutting-edge AI technology and user-centered design, we aim to deliver exceptional 
                value to our customers while maintaining our commitment to environmental responsibility.
              </p>
              <h2 className="text-xl font-bold mb-3" style={{ color: '#1a1a1a' }}>Key Objectives</h2>
              <ul className="space-y-2 ml-4 text-base" style={{ color: '#4a4a4a' }}>
                <li className="flex gap-2"><span style={{ color: colors.primary }}>•</span>Launch AI-powered features across all product lines</li>
                <li className="flex gap-2"><span style={{ color: colors.accent }}>•</span>Achieve 40% growth in user engagement</li>
                <li className="flex gap-2"><span style={{ color: colors.secondary }}>•</span>Expand into three new international markets</li>
              </ul>
            </div>
          )}

          {card.view === 'code' && (
            <div className="h-full overflow-y-auto p-4 font-mono text-sm" style={{ backgroundColor: '#1e1e1e', color: '#d4d4d4' }}>
              <div className="space-y-1">
                <div><span style={{ color: '#c586c0' }}>import</span> <span style={{ color: '#4ec9b0' }}>React</span> <span style={{ color: '#c586c0' }}>from</span> <span style={{ color: '#ce9178' }}>'react'</span>;</div>
                <div><span style={{ color: '#c586c0' }}>import</span> {'{ useState }'} <span style={{ color: '#c586c0' }}>from</span> <span style={{ color: '#ce9178' }}>'react'</span>;</div>
                <div className="h-3"></div>
                <div><span style={{ color: '#c586c0' }}>export</span> <span style={{ color: '#569cd6' }}>const</span> <span style={{ color: '#4ec9b0' }}>App</span> = () =&gt; {'{'}</div>
                <div className="ml-4"><span style={{ color: '#569cd6' }}>const</span> [count, setCount] = <span style={{ color: '#dcdcaa' }}>useState</span>(<span style={{ color: '#b5cea8' }}>0</span>);</div>
                <div className="h-3"></div>
                <div className="ml-4"><span style={{ color: '#c586c0' }}>return</span> (</div>
                <div className="ml-8">&lt;<span style={{ color: '#4ec9b0' }}>div</span> <span style={{ color: '#9cdcfe' }}>className</span>=<span style={{ color: '#ce9178' }}>"container"</span>&gt;</div>
                <div className="ml-12">&lt;<span style={{ color: '#4ec9b0' }}>h1</span>&gt;Count: {'{count}'}&lt;/<span style={{ color: '#4ec9b0' }}>h1</span>&gt;</div>
                <div className="ml-12">&lt;<span style={{ color: '#4ec9b0' }}>button</span> <span style={{ color: '#9cdcfe' }}>onClick</span>={'{() =&gt; setCount(count + 1)}'}&gt;</div>
                <div className="ml-16">Increment</div>
                <div className="ml-12">&lt;/<span style={{ color: '#4ec9b0' }}>button</span>&gt;</div>
                <div className="ml-8">&lt;/<span style={{ color: '#4ec9b0' }}>div</span>&gt;</div>
                <div className="ml-4">);</div>
                <div>{'}'};</div>
              </div>
            </div>
          )}

          {card.view === 'terminal' && (
            <div className="h-full overflow-y-auto p-4 font-mono text-sm" style={{ backgroundColor: '#000', color: '#0f0' }}>
              <div className="space-y-1">
                <div><span style={{ color: '#0f0' }}>user@workspace</span>:<span style={{ color: colors.primary }}>~/project</span>$ npm run dev</div>
                <div style={{ color: colors.textDim }}>  ➜  Local: http://localhost:5173/</div>
                <div style={{ color: colors.textDim }}>  ➜  Network: use --host to expose</div>
                <div className="h-2"></div>
                <div style={{ color: colors.accent }}>✓ built in 342ms</div>
                <div className="h-2"></div>
                <div><span style={{ color: '#0f0' }}>user@workspace</span>:<span style={{ color: colors.primary }}>~/project</span>$ <span className="animate-pulse">|</span></div>
              </div>
            </div>
          )}

          {card.view === 'files' && (
            <div className="h-full overflow-y-auto p-3 text-sm" style={{ backgroundColor: colors.bg, color: colors.text }}>
              <div className="space-y-1">
                {[
                  { icon: FolderTree, name: 'src/', color: colors.primary },
                  { icon: Code, name: 'App.tsx', color: colors.secondary, indent: true },
                  { icon: Code, name: 'index.tsx', color: colors.secondary, indent: true },
                  { icon: FolderTree, name: 'assets/', color: colors.accent },
                  { icon: FileText, name: 'README.md', color: colors.textMuted },
                ].map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <div 
                      key={i} 
                      className="flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-opacity-10"
                      style={{ marginLeft: item.indent ? '20px' : '0' }}
                    >
                      <Icon size={14} style={{ color: item.color }} />
                      <span>{item.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {card.view === 'browser' && (
            <div className="h-full flex flex-col" style={{ backgroundColor: '#fff' }}>
              <div className="flex-1 overflow-y-auto p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl" style={{ backgroundColor: '#61dafb' }}>⚛</div>
                  <h1 className="text-2xl font-bold" style={{ color: '#1a1a1a' }}>React Documentation</h1>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { title: 'Components', color: colors.primary },
                    { title: 'Hooks', color: colors.secondary },
                    { title: 'State', color: colors.accent },
                    { title: 'Effects', color: colors.warning },
                  ].map((item, i) => (
                    <div key={i} className="p-3 rounded border-l-4 cursor-pointer" 
                      style={{ backgroundColor: '#f8f9fa', borderColor: item.color }}>
                      <h4 className="font-bold mb-1" style={{ color: item.color }}>{item.title}</h4>
                      <p style={{ color: '#6b7280', fontSize: '12px' }}>Learn more →</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Card Footer - View Switcher */}
        <div 
          className="flex items-center justify-between px-3 py-2 border-t"
          style={{ 
            backgroundColor: colors.bgHeader,
            borderColor: colors.border,
          }}
        >
          <div className="flex gap-1">
            {Object.entries(viewIcons).map(([view, Icon]) => (
              <button
                key={view}
                className="p-1.5 rounded transition-all"
                style={{
                  backgroundColor: card.view === view ? colors.primary : 'transparent',
                  color: card.view === view ? 'white' : colors.textMuted,
                }}
              >
                <Icon size={12} />
              </button>
            ))}
          </div>
          <button className="p-1.5 rounded" style={{ color: colors.textMuted }}>
            <Play size={12} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden font-sans" style={{ backgroundColor: colors.bg }}>
      {/* Wide Top Menu with Activity Logs */}
      <div 
        className="h-12 flex items-center gap-4 px-4 border-b"
        style={{
          backgroundColor: colors.bgHeader,
          borderColor: colors.border,
        }}
      >
        <div className="flex items-center gap-3">
          <div className="text-sm font-bold" style={{ color: colors.primary }}>AI OS</div>
          <button className="px-3 py-1 rounded text-xs font-semibold" style={{ backgroundColor: colors.primary, color: 'white' }}>
            New Workspace
          </button>
        </div>

        {/* Activity Logs Scroller */}
        <div className="flex-1 flex items-center gap-2 overflow-x-auto">
          <Activity size={14} style={{ color: colors.accent }} />
          <div className="flex gap-3">
            {activityLogs.map((log, i) => (
              <div key={i} className="flex items-center gap-2 px-2 py-1 rounded whitespace-nowrap" style={{ backgroundColor: colors.bgCard }}>
                <span className="text-[9px] font-mono" style={{ color: colors.textDim }}>{log.time}</span>
                <span className="text-[10px]" style={{ color: log.type === 'success' ? colors.accent : colors.text }}>{log.msg}</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button className="p-1.5 rounded" style={{ color: colors.textMuted }}><Search size={16} /></button>
          <button className="p-1.5 rounded" style={{ backgroundColor: colors.accent, color: 'white' }}>
            <Mic size={16} />
          </button>
          <button className="p-1.5 rounded" style={{ color: colors.textMuted }}><Settings size={16} /></button>
        </div>
      </div>

      {/* Main Workspace - 4 Columns */}
      <div className="flex-1 flex gap-1 p-1 overflow-hidden">
        {workspace.map((col) => (
          <div 
            key={col.col}
            className="flex-1 flex flex-col gap-1 overflow-hidden"
            style={{ minWidth: '300px' }}
          >
            {/* Distant Header - Compressed squares */}
            {col.distant.above.length > 0 && (
              <div 
                className="flex-none flex gap-1 px-2 py-1 rounded"
                style={{ backgroundColor: colors.bgHeader }}
              >
                {col.distant.above.map(card => (
                  <MiniCard key={card.id} card={card} size="compressed" />
                ))}
                <ChevronDown size={10} style={{ color: colors.textDim }} />
              </div>
            )}

            {/* Immediate Header - Card 1 position above */}
            {col.immediate.above && (
              <div 
                className="flex-none px-2 py-1"
                style={{ 
                  maxHeight: '60px',
                  overflow: 'hidden',
                }}
              >
                <MiniCard card={col.immediate.above} />
              </div>
            )}

            {/* Main Card - Takes most space, maintains 8.5:11 ratio */}
            <div className="flex-1 min-h-0 flex items-center justify-center">
              <MainCard card={col.mainCard} />
            </div>

            {/* Immediate Footer - Card 1 position below */}
            {col.immediate.below && (
              <div 
                className="flex-none px-2 py-1"
                style={{ 
                  maxHeight: '60px',
                  overflow: 'hidden',
                }}
              >
                <MiniCard card={col.immediate.below} />
              </div>
            )}

            {/* Distant Footer - Compressed squares */}
            {col.distant.below.length > 0 && (
              <div 
                className="flex-none flex gap-1 px-2 py-1 rounded"
                style={{ backgroundColor: colors.bgHeader }}
              >
                <ChevronUp size={10} style={{ color: colors.textDim }} />
                {col.distant.below.map(card => (
                  <MiniCard key={card.id} card={card} size="compressed" />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Status Bar */}
      <div 
        className="h-6 flex items-center justify-between px-4 text-[9px] border-t"
        style={{
          backgroundColor: colors.bgHeader,
          borderColor: colors.border,
          color: colors.textMuted,
        }}
      >
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: colors.accent }}></div>
            Connected
          </span>
          <span>4 Columns • 12 Cards</span>
        </div>
        <div className="flex gap-4">
          <span><kbd className="px-1 rounded text-[8px]" style={{ backgroundColor: colors.bgCard }}>⌘K</kbd> Commands</span>
          <span><kbd className="px-1 rounded text-[8px]" style={{ backgroundColor: colors.bgCard }}>Space</kbd> Voice</span>
          <span><kbd className="px-1 rounded text-[8px]" style={{ backgroundColor: colors.bgCard }}>1-4</kbd> Focus</span>
        </div>
      </div>
    </div>
  );
};

export default WideScreenWorkspace;