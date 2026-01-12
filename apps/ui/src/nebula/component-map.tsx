import React from 'react';

// --- CORE IMPORTS ---
import AgentWorkbench from '../pages/AgentWorkbench.js';
import { ThemeManager } from '../components/nebula/ThemeManager.js';
import { UnifiedMenuBar } from '../components/UnifiedMenuBar.js';
import { FloatingNavigation } from '../components/FloatingNavigation.js';

// --- REGISTRY ---
export const COMPONENT_MAP: Record<string, React.ElementType> = {
  // Primitives - Replaced with simple divs for now or specific components as needed
  // If you need specific UI primitives, they should be imported from your own UI library or design system.
  // 'Box': Box, 
  // 'Flex': Flex, 
  // 'Grid': Grid, 
  // 'Text': Text, 
  // 'Button': Button, 
  // 'Card': Card, 
  // 'Input': Input, 

  // Application Shell Components
  'UnifiedMenuBar': UnifiedMenuBar,
  'FloatingNavigation': FloatingNavigation,

  // The "Big Two" Tools
  'AgentWorkbench': AgentWorkbench,
  'NebulaCreator': ThemeManager, // We map "NebulaCreator" to your ThemeManager
};
