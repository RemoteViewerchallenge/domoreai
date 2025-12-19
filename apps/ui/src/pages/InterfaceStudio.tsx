import React from 'react';
import { PenTool } from 'lucide-react';
import { Editor, Frame, Element } from '@craftjs/core';
import { COMPONENT_REGISTRY } from '../craft-registry.js';
import { CraftContainer, CraftText } from '../features/ui-builder/CraftComponents.js';
import { Toolbox } from '../features/ui-builder/Toolbox.js';
import { SettingsPanel } from '../features/ui-builder/SettingsPanel.js';
import { NewUIThemeProvider } from '../components/appearance/NewUIThemeProvider.js';
import { SuperAiButton } from '../components/ui/SuperAiButton.js';

export default function FactoryPage() {
  return (
    <NewUIThemeProvider>
      <div className="h-full w-full bg-[var(--color-background)] flex flex-col relative overflow-hidden font-sans">
        {/* Header */}
        <div className="flex-none h-12 border-b border-[var(--color-border)] bg-[var(--color-background)] flex items-center justify-between px-4 z-10">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-600/20 text-blue-400 rounded-lg">
                <PenTool size={18} />
            </div>
            <div>
                <h1 className="text-sm font-bold text-[var(--color-text)] tracking-wide">THE FACTORY</h1>
                <p className="text-[10px] text-[var(--color-text-muted)]">Visual Interface Builder</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
             <SuperAiButton contextId="UI Builder" />
             <div className="h-6 w-px bg-[var(--color-border)]" />
             <button className="px-3 py-1.5 bg-[var(--color-primary)] text-[var(--color-background)] rounded text-xs font-bold uppercase hover:opacity-90 transition-opacity">
                Export Layout
             </button>
          </div>
        </div>

        {/* Builder Content */}
        <Editor resolver={COMPONENT_REGISTRY}>
            <div className="flex w-full flex-1 overflow-hidden bg-[#1e1e20]">
                {/* Toolbox */}
                <Toolbox />

                {/* Canvas Area */}
                <div className="flex-1 flex flex-col items-center p-8 overflow-y-auto bg-[url('/grid-pattern.svg')]">
                    <div className="w-full max-w-[1200px] min-h-[800px] bg-zinc-900 border border-zinc-800 shadow-xl rounded-lg overflow-hidden relative">
                         <div className="absolute top-0 left-0 right-0 h-6 bg-zinc-800 flex items-center px-2 gap-1.5 border-b border-zinc-700">
                            <div className="w-2 h-2 rounded-full bg-red-500/50" />
                            <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
                            <div className="w-2 h-2 rounded-full bg-green-500/50" />
                            <div className="mx-auto text-[10px] text-zinc-500 font-mono">App Preview</div>
                         </div>
                         <div className="mt-6 h-full">
                            <Frame>
                                <Element 
                                    is={CraftContainer} 
                                    canvas 
                                    background="#09090b" 
                                    padding={40}
                                    custom={{ displayName: 'App Root' }}
                                >
                                    <CraftText text="Welcome to The Factory" fontSize={24} color="#e4e4e7" />
                                    <Element is={CraftContainer} canvas background="#18181b" padding={20}>
                                        <CraftText text="Drag components here..." fontSize={14} color="#a1a1aa" />
                                    </Element>
                                </Element>
                            </Frame>
                        </div>
                    </div>
                </div>

                {/* Settings Panel */}
                <SettingsPanel />
            </div>
        </Editor>
      </div>
    </NewUIThemeProvider>
  );
}
