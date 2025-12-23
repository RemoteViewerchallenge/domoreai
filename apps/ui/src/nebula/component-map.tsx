import React from 'react';
// 1. IMPORT YOUR COMPLEX COMPONENTS HERE
import AgentWorkbench from '../pages/AgentWorkbench.js';
import { UniversalDataGrid } from '../components/UniversalDataGrid.js';
import { VisualQueryBuilder } from '../components/VisualQueryBuilder.js';
import SmartEditor from '../components/SmartEditor.js';
import { SuperAiButton } from '../components/ui/SuperAiButton.js';

// 2. DEFINE THE REGISTRY
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ComponentRegistry: Record<string, React.FC<any>> = {
  // Primitives
  'Box': ({ children, ...props }) => <div {...props}>{children}</div>,
  'Text': ({ content, ...props }) => <span {...props}>{content}</span>,
  
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
  'SuperAiButton': SuperAiButton
};

export const resolveComponent = (name: string) => {
  return ComponentRegistry[name] || (() => <div className="p-4 bg-red-900/50 text-red-200 border border-red-500 rounded">Unknown Component: {name}</div>);
};
