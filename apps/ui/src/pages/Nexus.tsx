import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Cpu, Layout, Database, Settings, 
  Terminal, BarChart2, Layers, Globe, 
  HardDrive, Shield, Zap, FileText,
  Search, Code, Monitor, Server
} from 'lucide-react';
import { useNewUITheme } from '../components/appearance/NewUIThemeProvider.js';

interface NexusNode {
  title: string;
  path: string;
  icon: React.ElementType;
  description: string;
  color: string;
}

interface NexusZone {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  nodes: NexusNode[];
}

const ZONES: NexusZone[] = [
  {
    id: 'strategy',
    title: 'Strategy & Command',
    description: 'High-level decision making and oversight.',
    icon: BarChart2,
    color: '#ef4444', // Red
    nodes: [
      { title: 'Volcano Boardroom', path: '/boardroom', icon: Layers, description: 'Executive dashboard and KPI monitoring.', color: '#ef4444' },
      { title: 'Executive Office', path: '/office', icon: Monitor, description: 'Personal command center for the lead.', color: '#f87171' },
    ]
  },
  {
    id: 'creation',
    title: 'Engineering & Fabrication',
    description: 'Tools for building and modifying the system.',
    icon: Cpu,
    color: '#3b82f6', // Blue
    nodes: [
      { title: 'Creator Studio', path: '/creator', icon: Code, description: 'Visual node-based logic and UI builder.', color: '#3b82f6' },
      { title: 'Interface Builder', path: '/interface-builder', icon: Layout, description: 'Drag-and-drop frontend construction.', color: '#60a5fa' },
      { title: 'SuperNode Canvas', path: '/supernodes', icon: Zap, description: 'Advanced agentic workflows and automation.', color: '#93c5fd' },
      { title: 'Adaptive Workspace', path: '/adaptive', icon: Globe, description: 'Context-aware dynamic environment.', color: '#2563eb' },
    ]
  },
  {
    id: 'data',
    title: 'Data & Infrastructure',
    description: 'Raw information processing and storage storage.',
    icon: Database,
    color: '#10b981', // Emerald
    nodes: [
      { title: 'Data Explorer', path: '/data', icon: Search, description: 'Analyze and visualize complex datasets.', color: '#10b981' },
      { title: 'DB Browser', path: '/db-browser', icon: Server, description: 'Direct database management and table view.', color: '#34d399' },
      { title: 'Data Centers', path: '/datacenters', icon: HardDrive, description: 'Manage physical and virtual storage nodes.', color: '#059669' },
      { title: 'Unified Providers', path: '/providers', icon: Shield, description: 'External API and model provider config.', color: '#6ee7b7' },
    ]
  },
  {
    id: 'system',
    title: 'System & Utilities',
    description: 'Configuration and maintenance tools.',
    icon: Settings,
    color: '#a855f7', // Purple
    nodes: [
      { title: 'Settings', path: '/settings', icon: Settings, description: 'Global application preferences.', color: '#a855f7' },
      { title: 'File System', path: '/file-location', icon: FileText, description: 'VFS layout and file mapping.', color: '#c084fc' },
      { title: 'Core Internals', path: '/coore', icon: Terminal, description: 'Underlying C.O.R.E. process viewer.', color: '#d8b4fe' },
      { title: 'UI Showcase', path: '/ui-showcase', icon: Layout, description: 'Component library and design validation.', color: '#e9d5ff' },
    ]
  },
  {
    id: 'legacy',
    title: 'Experimental & Legacy',
    description: 'Older interfaces and development tools.',
    icon: Terminal,
    color: '#64748b', // Slate
    nodes: [
      { title: 'Legacy Workspace', path: '/workspace', icon: Layout, description: 'Original IDE-like workspace.', color: '#94a3b8' },
      { title: 'Sidebar Customizer', path: '/customizer', icon: Settings, description: 'Customize the sidebar layout.', color: '#cbd5e1' },
      { title: 'Smart Switch', path: '/workspace/smart-switch', icon: Zap, description: 'Fast context switching interface.', color: '#e2e8f0' },
      { title: 'Engineering Adaptive', path: '/workspace/engineering', icon: Globe, description: 'Alias for Adaptive Workspace.', color: '#60a5fa' },
    ]
  }
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1
  }
};

export const NexusPage: React.FC = () => {
  const navigate = useNavigate();
  const { theme } = useNewUITheme();
  const animationsEnabled = theme.animations.enabled;
  const MotionDiv = animationsEnabled ? motion.div : 'div';
  const MotionH1 = animationsEnabled ? motion.h1 : 'h1';
  const MotionP = animationsEnabled ? motion.p : 'p';

  return (
    <div className="flex flex-col flex-1 w-full bg-[var(--color-background)] text-[var(--color-text)] overflow-hidden">
      {/* Header */}
      <div className="p-8 pb-4">
        <MotionH1 
          className="text-4xl font-bold tracking-tight mb-2 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] bg-clip-text text-transparent"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          C.O.R.E. Nexus
        </MotionH1>
        <MotionP 
          className="text-[var(--color-text-secondary)] text-lg"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          The central nervous system of your digital empire. Select a module to begin.
        </MotionP>
      </div>

      {/* Grid */}
      <MotionDiv 
        className="flex-1 overflow-y-auto p-8 pt-4 grid grid-cols-1 lg:grid-cols-2 gap-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {ZONES.map((zone) => (
          <MotionDiv 
            key={zone.id}
            variants={itemVariants}
            className="flex flex-col gap-4 p-6 rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-background-secondary)]"
            style={{
                boxShadow: `0 0 20px -10px ${zone.color}30`
            }}
          >
            {/* Zone Header */}
            <div className="flex items-center gap-3 border-b border-[var(--color-border)] pb-4 mb-2">
              <div 
                className="p-3 rounded-lg"
                style={{ backgroundColor: `${zone.color}20`, color: zone.color }}
              >
                <zone.icon size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold" style={{ color: zone.color }}>{zone.title}</h2>
                <p className="text-sm text-[var(--color-text-secondary)]">{zone.description}</p>
              </div>
            </div>

            {/* Nodes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {zone.nodes.map((node) => (
                <button
                  key={node.path}
                  onClick={() => navigate(node.path)}
                  className="group flex flex-col gap-2 p-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] hover:border-[var(--color-primary)] bg-[var(--color-background)] text-left transition-all hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-semibold">
                      <node.icon size={16} style={{ color: node.color }} />
                      <span>{node.title}</span>
                    </div>
                    <code className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-background-secondary)] text-[var(--color-text-secondary)]">
                      {node.path}
                    </code>
                  </div>
                  <p className="text-xs text-[var(--color-text-secondary)] group-hover:text-[var(--color-text)] transition-colors">
                    {node.description}
                  </p>
                </button>
              ))}
            </div>
          </MotionDiv>
        ))}
      </MotionDiv>
    </div>
  );
};

export default NexusPage;
