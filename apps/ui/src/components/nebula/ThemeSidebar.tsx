import React, { useState } from 'react';
import { useThemeContext } from '../../theme/ThemeProvider.js';
import { Palette, Type, LayoutGrid, X, Save } from 'lucide-react';
import { cn } from '../../lib/utils.js';
import { IconSelector } from './primitives/IconSelector.js';

const PRESET_GRADIENTS = [
    'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', // Indigo-Purple
    'linear-gradient(to right, #ec4899, #8b5cf6)',       // Pink-Violet
    'linear-gradient(to right, #06b6d4, #3b82f6)',       // Cyan-Blue
    'linear-gradient(to right, #f97316, #ea580c)',       // Orange
    'linear-gradient(to right, #10b981, #059669)',       // Emerald
    'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', // Amber
    'linear-gradient(to right, #ef4444, #b91c1c)',       // Red
    'linear-gradient(to right, #14b8a6, #0f766e)',       // Teal
    'linear-gradient(to right, #64748b, #475569)',       // Slate
    'linear-gradient(135deg, #18181b 0%, #27272a 100%)', // Zinc (Dark)
];

const PRESET_FONTS = [
    { name: 'Inter', value: '"Inter", sans-serif' },
    { name: 'JetBrains Mono', value: '"JetBrains Mono", monospace' },
    { name: 'Roboto', value: '"Roboto", sans-serif' },
    { name: 'Fira Code', value: '"Fira Code", monospace' },
    { name: 'System', value: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }
];

export const ThemeSidebar = ({ onClose }: { onClose: () => void }) => {
    const { theme, setTheme } = useThemeContext();
    const [activeSection, setActiveSection] = useState<'colors' | 'type' | 'icons'>('colors');

    // Live update helper
    const updateGradient = (grad: string) => {
        setTheme({ ...theme, gradients: { ...theme.gradients, primary: grad, enabled: true } });
    };

    return (
        <div className="w-80 h-full flex flex-col bg-[var(--bg-secondary)] border-l border-[var(--border-color)] shadow-2xl z-50 animate-in slide-in-from-right-10 duration-200">
            {/* Header */}
            <div className="h-12 flex items-center justify-between px-4 border-b border-[var(--border-color)] bg-[var(--bg-background)]">
                <span className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]">Theme Engine</span>
                <button type="button" onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"><X size={14} /></button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-[var(--border-color)]">
                <SidebarTab icon={Palette} active={activeSection === 'colors'} onClick={() => setActiveSection('colors')} />
                <SidebarTab icon={Type} active={activeSection === 'type'} onClick={() => setActiveSection('type')} />
                <SidebarTab icon={LayoutGrid} active={activeSection === 'icons'} onClick={() => setActiveSection('icons')} />
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                
                {/* 1. COLORS & GRADIENTS */}
                {activeSection === 'colors' && (
                    <div className="space-y-6">
                        <SectionTitle title="Global Gradient" />
                        <div className="grid grid-cols-2 gap-2">
                            {PRESET_GRADIENTS.map((g, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    className="h-8 rounded border border-white/10 hover:border-white/50 transition-all shadow-sm"
                                    style={{ background: g }}
                                    onClick={() => updateGradient(g)}
                                    title={g}
                                />
                            ))}
                        </div>
                        
                        {/* ✅ NEW: AI Intent Colors */}
                        <SectionTitle title="AI Context Colors" />
                        <div className="space-y-3">
                             {theme.ai?.intents && Object.entries(theme.ai.intents).map(([key, color]) => (
                                 <div key={key} className="flex items-center gap-3">
                                     <input 
                                         type="color" 
                                         value={color} 
                                         onChange={(e) => {
                                             setTheme({ 
                                                 ...theme, 
                                                 ai: { 
                                                     ...theme.ai, 
                                                     intents: { ...theme.ai.intents, [key]: e.target.value } 
                                                 } 
                                             })
                                         }}
                                         className="w-6 h-6 rounded bg-transparent border-0 p-0 cursor-pointer"
                                     />
                                     <span className="text-[10px] font-mono capitalize text-[var(--text-secondary)]">{key}</span>
                                 </div>
                             ))}
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Manual Override</label>
                            <textarea 
                                value={theme.gradients.primary}
                                onChange={(e) => updateGradient(e.target.value)}
                                className="w-full h-16 bg-[var(--bg-background)] border border-[var(--border-color)] rounded p-2 text-[10px] font-mono"
                            />
                        </div>
                    </div>
                )}

                {/* 2. TYPOGRAPHY */}
                {activeSection === 'type' && (
                    <div className="space-y-6">
                         <SectionTitle title="Font Family" />
                         <div className="space-y-2">
                            {PRESET_FONTS.map(f => (
                                <button
                                    key={f.name}
                                    type="button"
                                    onClick={() => setTheme({ ...theme, assets: { ...theme.assets, fonts: { ...theme.assets.fonts, mappings: { ...theme.assets.fonts.mappings, body: f.value, heading: f.value } } } })}
                                    className={cn(
                                        "w-full text-left px-3 py-2 rounded text-xs border transition-all",
                                        theme.assets.fonts.mappings.body === f.value 
                                            ? "bg-[var(--color-primary)]/10 border-[var(--color-primary)] text-[var(--color-primary)] font-bold"
                                            : "bg-[var(--bg-background)] border-[var(--border-color)] hover:bg-[var(--bg-primary)]"
                                    )}
                                >
                                    {f.name}
                                </button>
                            ))}
                         </div>
                    </div>
                )}

                {/* 3. ICONS */}
                {activeSection === 'icons' && (
                    <div className="h-full flex flex-col">
                        <SectionTitle title="Icon Mapping" />
                        <div className="flex-1">
                             <IconSelector 
                                 currentMap={theme.assets.icons.tokenMap}
                                 onChange={(token, iconName) => {
                                     setTheme({ ...theme, assets: { ...theme.assets, icons: { ...theme.assets.icons, tokenMap: { ...theme.assets.icons.tokenMap, [token]: iconName } } } })
                                 }}
                             />
                        </div>
                    </div>
                )}
            </div>
            
            {/* Footer Actions */}
            <div className="p-4 border-t border-[var(--border-color)] bg-[var(--bg-background)]">
                <button type="button" className="w-full flex items-center justify-center gap-2 py-2 bg-[var(--color-primary)] text-white text-xs font-bold rounded hover:opacity-90">
                    <Save size={14} /> Save Theme
                </button>
            </div>
        </div>
    );
};

const SidebarTab = ({ icon: Icon, active, onClick }: { icon: React.ElementType, active: boolean, onClick: () => void }) => (
    <button 
        type="button"
        onClick={onClick} 
        className={cn("flex-1 py-3 flex justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)] transition-colors", active && "text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]")}
    >
        <Icon size={16} />
    </button>
);

const SectionTitle = ({ title }: { title: string }) => (
    <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">{title}</div>
);
