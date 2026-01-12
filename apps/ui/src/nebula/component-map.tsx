import React from 'react';
// 1. IMPORT YOUR COMPLEX COMPONENTS HERE
import AgentWorkbench from '../pages/AgentWorkbench.js';
import { UniversalDataGrid } from '../components/UniversalDataGrid.js';
import { VisualQueryBuilder } from '../components/VisualQueryBuilder.js';
import SmartEditor from '../components/SmartEditor.js';
import { SuperAiButton } from '../components/ui/SuperAiButton.js';
import { ModelContextSelector } from '../features/nebula-renderer/components/ModelContextSelector.js';
import { RoleModelOverride } from '../components/RoleModelOverride.js';
import { TokenIcon } from '@/components/nebula/TokenIcon.js';
import { ThemeManager } from '@/components/nebula/ThemeManager.js';

import { Input } from '../components/ui/input.js';
import { Button } from '../components/ui/button.js';
import { Textarea } from '../components/ui/textarea.js';
import { Label } from '../components/ui/label.js';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card.js';
import { Badge } from '../components/ui/badge.js';
// Select component missing, using native or alternative if needed

// 2. DEFINE THE REGISTRY
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ComponentRegistry: Record<string, React.FC<any>> = {
  // Primitives
  'Box': ({ children, ...props }) => <div {...props}>{children}</div>,
  'Flex': ({ children, ...props }) => <div style={{ display: 'flex', ...props.style }} {...props}>{children}</div>,
  'Grid': ({ children, ...props }) => <div style={{ display: 'grid', ...props.style }} {...props}>{children}</div>,
  'Text': ({ content, ...props }) => <span {...props}>{content}</span>,
  
  // UI Components (Shadcn/Custom)
  'Input': Input,
  'Button': Button,
  'Textarea': Textarea,
  'Label': Label,
  'Card': Card,
  'CardHeader': CardHeader,
  'CardTitle': CardTitle,
  'CardContent': CardContent,
  'Badge': Badge,
  
  // COMPLEX BLACK BOXES (The ones failing for you)
  'AgentWorkbench': (props) => (
    <div className="w-full h-full min-h-[600px] border border-zinc-800 rounded-md overflow-hidden relative">
       {/* Wrap in Suspense if it lazy loads data */}
       <AgentWorkbench {...props} />
    </div>
  ),
  'UniversalDataGrid': UniversalDataGrid,
  'VisualQueryBuilder': VisualQueryBuilder,
  'SmartEditor': SmartEditor,
  'SuperAiButton': SuperAiButton,
  'ModelContextSelector': ModelContextSelector,
  'RoleModelOverride': RoleModelOverride,
  'TokenIcon': TokenIcon,
  'ThemeManager': ThemeManager
};

export const resolveComponent = (name: string) => {
  return ComponentRegistry[name] || (() => <div className="p-4 bg-red-900/50 text-red-200 border border-red-500 rounded">Unknown Component: {name}</div>);
};
