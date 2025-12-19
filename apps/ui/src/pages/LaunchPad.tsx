import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Cpu, Layout, Database, Settings, 
  BarChart2, Shield, Zap, FileText,
  Monitor
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
    id: 'core',
    title: 'Core Operations',
    description: 'Primary work environments and system oversight.',
    icon: BarChart2,
    color: '#ef4444', // Red
    nodes: [
      { title: 'Agent Workbench', path: '/workbench', icon: Layout, description: 'The "Doing" grid. Where humans and agents work in Swappable Cards.', color: '#ef4444' },
      { title: 'Command Center', path: '/command', icon: Monitor, description: 'High-level dispatch and strategy visualization.', color: '#f87171' },
      { title: 'Code Visualizer', path: '/visualizer', icon: Zap, description: 'Live graph of the codebase and role ownership.', color: '#ef4444' },
    ]
  },
  {
    id: 'specialized',
    title: 'Specialized Studios',
    description: 'Vertical tools for defining and building the system.',
    icon: Cpu,
    color: '#3b82f6', // Blue
    nodes: [
      { title: 'Organizational Structure', path: '/org-structure', icon: Shield, description: 'Defining roles, teams, and chains of command.', color: '#3b82f6' },
      { title: 'Data Center', path: '/datacenter', icon: Database, description: 'SQL/JSON management and visual query building.', color: '#60a5fa' },
      { title: 'Interface Studio', path: '/ui-studio', icon: Layout, description: 'Visual UI factory for building frontend layouts.', color: '#9d00ff' },
    ]
  },
  {
    id: 'system',
    title: 'System & Governance',
    description: 'The laws and configuration of the Operating System.',
    icon: Settings,
    color: '#a855f7', // Purple
    nodes: [
      { title: 'Constitution', path: '/settings', icon: Settings, description: 'Global rules, themes, and system requirements.', color: '#a855f7' },
      { title: 'System Setup', path: '/setup', icon: FileText, description: 'Initialization and environment mapping.', color: '#c084fc' },
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

export const LaunchPad: React.FC = () => {
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
          Cooperative OS LaunchPad
        </MotionH1>
        <MotionP 
          className="text-[var(--color-text-secondary)] text-lg"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          System Hub & Bootloader. The central nervous system of your digital empire.
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

export default LaunchPad;
