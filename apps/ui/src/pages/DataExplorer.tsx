import React, { useState } from 'react';
import { DbNodeCanvas } from '../components/DbNodeCanvas.js';
import { Database, Network } from 'lucide-react';
import { NewUIThemeProvider } from '../components/appearance/NewUIThemeProvider.js';
import DbBrowserPage from './DbBrowserPage.js'; // We will use the existing page as the "Browser" tab content for now

export const DataExplorer: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'canvas' | 'browser'>('canvas'); // 'canvas' is the new default "Cross"

    return (
        <NewUIThemeProvider>
            <div className="flex flex-col h-full w-full bg-[var(--color-background)] font-sans">
                {/* Top Navigation / Tab Bar */}
                <div className="h-10 flex-none border-b border-[var(--color-border)] bg-[var(--color-background)] flex items-center justify-between px-4">
                    <div className="flex items-center gap-1">
                        <button 
                            onClick={() => setActiveTab('canvas')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded text-[10px] font-bold uppercase transition-all ${
                                activeTab === 'canvas' 
                                    ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' 
                                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-text)]/5'
                            }`}
                        >
                            <Network size={12} /> Canvas
                        </button>
                         <button 
                            onClick={() => setActiveTab('browser')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded text-[10px] font-bold uppercase transition-all ${
                                activeTab === 'browser' 
                                    ? 'bg-purple-600/10 text-purple-400 border border-purple-500/20' 
                                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-text)]/5'
                            }`}
                        >
                            <Database size={12} /> Browser
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-hidden relative">
                    {activeTab === 'canvas' ? (
                        <div className="h-full w-full animate-in fade-in duration-300">
                             <DbNodeCanvas />
                        </div>
                    ) : (
                        <div className="h-full w-full animate-in fade-in duration-300 overflow-auto">
                            {/* Reusing existing logic but wrapping it to ensure it fits */}
                            <DbBrowserPage /> 
                        </div>
                    )}
                </div>
            </div>
        </NewUIThemeProvider>
    );
}

export default DataExplorer;