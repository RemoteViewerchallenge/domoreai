import React from 'react';
import { motion } from 'framer-motion';
import { Cpu, GitBranch, HardDrive, Server, Settings, Share2, Star, Bot } from 'lucide-react';

import { AiButton } from '../components/ui/AiButton.js';
import { Accordion } from '../components/ui/Accordion.js';
import DualRangeSlider from '../components/ui/DualRangeSlider.js';
import { useAnimations } from '../theme/ThemeProvider.js';
import { NewUIMenuBar } from '../components/appearance/NewUIMenuBar.js';

const cardVariants = {
  rest: { scale: 1, boxShadow: '0px 5px 10px rgba(0, 0, 0, 0.1)' },
  hover: { scale: 1.03, boxShadow: '0px 8px 20px rgba(0, 0, 0, 0.2)' },
};

const iconVariants = {
  rest: { rotate: 0, scale: 1 },
  hover: { rotate: 15, scale: 1.2 },
};

interface UIDisplayPageProps {
  onToggleSidebar: () => void;
}

export const UIDisplayPage: React.FC<UIDisplayPageProps> = ({ onToggleSidebar }) => {
  const { enabled: animationsEnabled } = useAnimations();
  const MotionDiv = animationsEnabled ? motion.div : 'div';

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <NewUIMenuBar onToggleSidebar={onToggleSidebar} />
      <div className="flex-1 p-8 overflow-y-auto bg-[var(--color-background)] text-[var(--color-text)]">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1 */}
          <div className="space-y-6">
            {/* Buttons & Toggles */}
          <MotionDiv
              className="p-6 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-background-secondary)] space-y-4"
            variants={cardVariants}
            initial="rest"
            whileHover="hover"
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <h2 className="font-bold text-lg text-[var(--color-accent)]">Controls</h2>
            <div className="flex flex-wrap gap-3 items-center">
                  <button className="px-4 py-2 rounded-[var(--radius-md)] text-sm font-bold bg-[var(--color-primary)] text-black">Primary</button>
                  <button className="px-4 py-2 rounded-[var(--radius-md)] text-sm font-bold border-2 border-[var(--color-secondary)] text-[var(--color-secondary)]">Secondary</button>
                  <button className="relative px-4 py-2 rounded-[var(--radius-md)] text-sm font-bold text-black overflow-hidden">
                <span className="absolute inset-0" style={{ background: 'var(--gradient-button)' }} />
                <span className="relative">Gradient</span>
              </button>
              <AiButton source={{ type: 'custom', payload: { context: 'buttons-panel' } }} />
            </div>
          </MotionDiv>

          {/* Animated Icons */}
          <MotionDiv
              className="p-6 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-background-secondary)]"
            variants={cardVariants}
            initial="rest"
            whileHover="hover"
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <h2 className="font-bold text-lg text-[var(--color-accent)]">Animated Icons</h2>
            <div className="flex flex-wrap gap-6 mt-4 text-[var(--color-text-secondary)]">
              {[Cpu, GitBranch, HardDrive, Server, Settings, Share2].map((Icon, i) => (
                <MotionDiv key={i} variants={iconVariants} className="cursor-pointer">
                  <Icon size={32} strokeWidth={1.5} />
                </MotionDiv>
              ))}
            </div>
          </MotionDiv>
          </div>

          {/* Column 2 */}
          <div className="space-y-6">
            {/* Sliders and Inputs */}
          <MotionDiv
              className="p-6 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-background-secondary)] space-y-4"
            variants={cardVariants}
            initial="rest"
            whileHover="hover"
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <h2 className="font-bold text-lg text-[var(--color-accent)]">Inputs</h2>
            <input
              type="text"
              placeholder="Text input..."
              className="w-full px-3 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-[var(--radius-md)] focus:outline-none focus:border-[var(--color-primary)]"
            />
            <DualRangeSlider min={0} max={100} value={[20, 80]} onChange={() => {}} label="Price Range" unit="$" />
            <div className="flex justify-end">
              <AiButton source={{ type: 'custom', payload: { context: 'inputs-panel' } }} />
            </div>
          </MotionDiv>

          {/* Accordion */}
          <MotionDiv
              className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-background-secondary)] overflow-hidden"
            variants={cardVariants}
            initial="rest"
            whileHover="hover"
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <Accordion title="Project Details" defaultOpen>
              <div className="p-4 text-sm space-y-2">
                <p>This section contains details about the project.</p>
                <p className="text-[var(--color-text-secondary)]">You can edit these details in the project settings.</p>
                <div className="pt-2">
                  <AiButton source={{ type: 'custom', payload: { context: 'accordion-content' } }} />
                </div>
              </div>
            </Accordion>
            <Accordion title="Deployment Status">
              <div className="p-4 text-sm text-[var(--color-text-secondary)]">
                <p>No active deployments.</p>
              </div>
            </Accordion>
          </MotionDiv>
          </div>

          {/* Column 3 */}
          <div className="space-y-6">
            {/* Mock Card */}
          <MotionDiv
              className="p-6 rounded-[var(--radius-lg)] border border-[var(--color-border)] flex flex-col"
            style={{ background: 'var(--gradient-surface)' }}
            variants={cardVariants}
            initial="rest"
            whileHover="hover"
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-lg text-[var(--color-primary)]">AI Vision Agent</h3>
                <p className="text-sm text-[var(--color-text-secondary)]">Online and ready</p>
              </div>
              <motion.div variants={iconVariants}>
                <Star className="text-yellow-400" />
              </motion.div>
            </div>
              <div className="flex-1 mt-4 mb-6 h-24 bg-black/20 rounded-[var(--radius-md)] flex items-center justify-center text-xs text-white/50">
              [Camera Feed Placeholder]
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-mono text-green-400">STATUS: ACTIVE</span>
              <AiButton source={{ type: 'custom', payload: { context: 'vision-agent-card' } }} />
            </div>
          </MotionDiv>
          </div>
        </div>
      </div>
    </div>
  );
};
export default UIDisplayPage;