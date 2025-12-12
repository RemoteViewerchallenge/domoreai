import React, { useState } from 'react';
import { callVoid } from '../../lib/callVoid.js';
import { Palette, Type, SlidersHorizontal, Settings, X, Layers, Keyboard, MousePointer, Cog } from 'lucide-react';
import type { Theme, ThemeColors } from '../../theme/types.js';
import { themePresets } from '../../theme/presets.js';

type Tab = 'appearance' | 'colors' | 'presets' | 'input' | 'settings';

interface ThemeEditorSidebarProps {
  theme: Theme;
  onUpdateTheme: (partial: Partial<Theme>) => void;
  onClose: () => void;
}

const ColorInput = ({ label, value, onChange, placeholder = "Hex or Gradient..." }: { label: string, value: any, onChange: (val: string) => void, placeholder?: string }) => {
    const isNeon = typeof value === 'object' && value !== null && 'value' in value;
    const colorValue = isNeon ? value.value : (value as string) || '';
    
    return (
        <div className="flex items-center gap-2 p-1.5 hover-bg-translucent-light rounded group transition-colors">
            <div className="relative flex-none">
            <div 
                className="w-8 h-8 rounded border border-[var(--color-border)] overflow-hidden shadow-sm group-hover:border-[var(--color-text-secondary)] transition-colors"
                style={{ background: colorValue }}
            >
                <input 
                    type="color" 
                    value={colorValue.startsWith('#') ? colorValue : '#000000'} 
                    onChange={(e) => onChange(e.target.value)} 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                    title="Pick Color"
                />
            </div>
            </div>
            <div className="flex-1 min-w-0">
            <div className="flex flex-col">
                <label className="text-[9px] uppercase font-bold text-[var(--color-text-secondary)] truncate mb-0.5">{label}</label>
                <input 
                    type="text" 
                    value={colorValue} 
                    onChange={(e) => onChange(e.target.value)} 
                    className="w-full bg-transparent border-b border-[var(--color-border)] text-[10px] focus:outline-none focus:border-[var(--color-primary)] font-mono text-[var(--color-text)] py-0.5 transition-colors"
                    placeholder={placeholder}
                />
            </div>
            </div>
        </div>
    );
};

export const ThemeEditorSidebar: React.FC<ThemeEditorSidebarProps> = ({ theme, onUpdateTheme, onClose }) => {
  const [activeTab, setActiveTab] = useState<Tab>('colors');

  const updateNeonColor = (key: keyof ThemeColors, value: string) => {
    const currentColor = theme.colors[key];
    if (typeof currentColor === 'object' && currentColor !== null && 'value' in currentColor) {
       onUpdateTheme({
        colors: {
          ...theme.colors,
          [key]: { ...currentColor, value }
        }
      });
    }
  };

  const updateStringColor = (key: keyof ThemeColors, value: string) => {
      onUpdateTheme({
        colors: {
          ...theme.colors,
          [key]: value
        }
      });
  };

  const tabs: { id: Tab; icon: React.ElementType; label: string }[] = [
    { id: 'colors', icon: Palette, label: 'Colors' },
    { id: 'appearance', icon: SlidersHorizontal, label: 'Visual' },
    { id: 'input', icon: Keyboard, label: 'Input' },
    { id: 'settings', icon: Cog, label: 'Settings' },
  ];

  return (
    <div className="flex-none h-full w-72 theme-editor-sidebar border-r border-[var(--color-border)] shadow-2xl flex flex-col text-xs font-mono text-[var(--color-text)]">
      {/* Header */}
      <div className="flex-none h-10 px-3 flex items-center justify-between border-b border-[var(--color-border)] bg-translucent-dark">
        <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider">
          <Settings size={14} className="text-[var(--color-primary)]" />
          <span>Theme Editor</span>
        </div>
        <button onClick={() => callVoid(onClose)} className="p-1 rounded hover-bg-translucent-light transition-colors">
          <X size={14} />
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex-none flex border-b border-[var(--color-border)] bg-translucent-dark">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 p-2 text-center border-b-2 transition-all ${
              activeTab === tab.id
                ? 'border-[var(--color-primary)] text-[var(--color-primary)] bg-translucent-light'
                : 'border-transparent text-[var(--color-text-secondary)] hover-bg-translucent-light hover:text-[var(--color-text)]'
            }`}
          >
            <tab.icon size={14} />
            <span className="text-[9px] uppercase font-bold tracking-wider">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-0 custom-scrollbar">


        {activeTab === 'colors' && (
          <div className="p-3 space-y-6">
          {/* Main Colors with Gradient and Font Controls */}
          <section className="space-y-2">
            <h3 className="font-bold uppercase text-[var(--color-text-secondary)] text-[10px] tracking-wider border-b border-[var(--color-border)] pb-1">Main Colors & Typography</h3>
            <div className="space-y-2">
              <ColorInput label="Primary Color" value={theme.colors.primary} onChange={(v) => updateNeonColor('primary', v)} />
              <ColorInput label="Background (Gradient OK)" value={theme.colors.background} onChange={(v) => updateStringColor('background', v)} placeholder="Color or CSS Gradient..." />
              <ColorInput label="Text Color" value={theme.colors.text} onChange={(v) => updateStringColor('text', v)} />
              <div className="flex gap-2 items-center">
                <label className="text-[9px] uppercase font-bold text-[var(--color-text-secondary)]">Font</label>
                <select value={theme.visual.fontFamily || 'monospace'} onChange={e => onUpdateTheme({ visual: { ...theme.visual, fontFamily: e.target.value } })} className="bg-black/20 border border-[var(--color-border)] text-[10px] rounded p-1 text-[var(--color-text)] focus:border-[var(--color-primary)] outline-none">
                <option value="monospace">Monospace</option>
                <option value="sans-serif">Sans Serif</option>
                <option value="serif">Serif</option>
                <option value="cursive">Cursive</option>
                <option value="fantasy">Fantasy</option>
                </select>
                <label className="text-[9px] uppercase font-bold text-[var(--color-text-secondary)] ml-2">Font Size</label>
                <input type="number" min={8} max={48} value={theme.visual.fontSize} onChange={e => onUpdateTheme({ visual: { ...theme.visual, fontSize: Number(e.target.value) } })} className="w-14 bg-transparent border-b border-[var(--color-border)] text-[10px] focus:outline-none focus:border-[var(--color-primary)] font-mono text-[var(--color-text)] py-0.5 transition-colors ml-1" />
                <span className="text-[10px] text-[var(--color-text-secondary)]">px</span>
              </div>
            </div>
          </section>

          {/* Menu Bar */}
          <section className="space-y-2">
            <h3 className="font-bold uppercase text-[var(--color-text-secondary)] text-[10px] tracking-wider border-b border-[var(--color-border)] pb-1">Menu Bar</h3>
            <div className="space-y-2">
              <ColorInput label="Menu Background (Gradient OK)" value={theme.colors.menuBarBackground} onChange={(v) => updateStringColor('menuBarBackground', v)} placeholder="Color or Gradient..." />
              <ColorInput label="Icon Color" value={theme.colors.iconColor} onChange={(v) => updateStringColor('iconColor', v)} />
            </div>
          </section>

          {/* Buttons */}
          <section className="space-y-2">
            <h3 className="font-bold uppercase text-[var(--color-text-secondary)] text-[10px] tracking-wider border-b border-[var(--color-border)] pb-1">Buttons</h3>
            <div className="space-y-2">
              <ColorInput label="Button Background (Gradient OK)" value={theme.colors.buttonBackground} onChange={(v) => updateStringColor('buttonBackground', v)} placeholder="Color or Gradient..." />
              <ColorInput label="Button Text" value={theme.colors.buttonText} onChange={(v) => updateStringColor('buttonText', v)} />
            </div>
          </section>

          {/* Cards */}
          <section className="space-y-2">
            <h3 className="font-bold uppercase text-[var(--color-text-secondary)] text-[10px] tracking-wider border-b border-[var(--color-border)] pb-1">Cards</h3>
            <div className="space-y-2">
              <ColorInput label="Card Background (Gradient OK)" value={theme.colors.cardBackground} onChange={(v) => updateStringColor('cardBackground', v)} />
              <ColorInput label="Card Border" value={theme.colors.cardBorder} onChange={(v) => updateStringColor('cardBorder', v)} />
            </div>
          </section>
          </div>
        )}

        {activeTab === 'appearance' && (
          <div className="p-3 space-y-6">
            {/* Typography Section */}
            <section className="space-y-3">
                <h3 className="font-bold uppercase text-[var(--color-text-secondary)] text-[10px] tracking-wider border-b border-[var(--color-border)] pb-1">Typography</h3>
                
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-[var(--color-text-secondary)]">Font Size</span>
                    <span className="font-mono">{theme.visual.fontSize}px</span>
                  </div>
                  <input
                    type="range" min={8} max={24} value={theme.visual.fontSize}
                    onChange={(e) => onUpdateTheme({ visual: { ...theme.visual, fontSize: Number(e.target.value) } })}
                    className="w-full accent-[var(--color-primary)] h-1 bg-[var(--color-border)] rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-[var(--color-text-secondary)]">Line Height</span>
                    <span className="font-mono">{theme.visual.lineHeight}</span>
                  </div>
                  <input
                    type="range" min={1} max={2} step={0.1} value={theme.visual.lineHeight}
                    onChange={(e) => onUpdateTheme({ visual: { ...theme.visual, lineHeight: Number(e.target.value) } })}
                    className="w-full accent-[var(--color-primary)] h-1 bg-[var(--color-border)] rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-[var(--color-text-secondary)]">Letter Spacing</span>
                    <span className="font-mono">{theme.visual.letterSpacing}px</span>
                  </div>
                  <input
                    type="range" min={-2} max={4} step={0.5} value={theme.visual.letterSpacing}
                    onChange={(e) => onUpdateTheme({ visual: { ...theme.visual, letterSpacing: Number(e.target.value) } })}
                    className="w-full accent-[var(--color-primary)] h-1 bg-[var(--color-border)] rounded-lg appearance-none cursor-pointer"
                  />
                </div>
            </section>

            {/* Visual Section */}
            <section className="space-y-3">
                <h3 className="font-bold uppercase text-[var(--color-text-secondary)] text-[10px] tracking-wider border-b border-[var(--color-border)] pb-1">Effects</h3>
                
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-[var(--color-text-secondary)]">Border Width</span>
                    <span className="font-mono">{theme.visual.borderWidth}px</span>
                  </div>
                  <input
                    type="range" min={0} max={4} value={theme.visual.borderWidth}
                    onChange={(e) => onUpdateTheme({ visual: { ...theme.visual, borderWidth: Number(e.target.value) } })}
                    className="w-full accent-[var(--color-primary)] h-1 bg-[var(--color-border)] rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-[var(--color-text-secondary)]">Glow Intensity</span>
                    <span className="font-mono">{theme.visual.glowIntensity}%</span>
                  </div>
                  <input
                    type="range" min={0} max={100} value={theme.visual.glowIntensity}
                    onChange={(e) => onUpdateTheme({ visual: { ...theme.visual, glowIntensity: Number(e.target.value) } })}
                    className="w-full accent-[var(--color-primary)] h-1 bg-[var(--color-border)] rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-[var(--color-text-secondary)]">Transparency</span>
                    <span className="font-mono">{theme.visual.transparency}%</span>
                  </div>
                  <input
                    type="range" min={0} max={90} value={theme.visual.transparency}
                    onChange={(e) => onUpdateTheme({ visual: { ...theme.visual, transparency: Number(e.target.value) } })}
                    className="w-full accent-[var(--color-primary)] h-1 bg-[var(--color-border)] rounded-lg appearance-none cursor-pointer"
                  />
                </div>
            </section>
          </div>
        )}

        {activeTab === 'input' && (
          <div className="p-3">
            <h3 className="font-bold uppercase text-[var(--color-text-secondary)] text-[10px] mb-2 tracking-wider">Input Configuration</h3>
            <div className="p-3 bg-translucent-light border border-[var(--color-border)] rounded text-center text-[var(--color-text-muted)] text-[10px]">
              Keystroke & Mouse configuration coming soon.
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="p-3 space-y-4">
            <section>
                <h3 className="font-bold uppercase text-[var(--color-text-secondary)] text-[10px] mb-2 tracking-wider">Layout</h3>
                <div className="space-y-2">
                    <div>
                        <label className="block text-[9px] uppercase font-bold text-[var(--color-text-secondary)] mb-1">Menu Style</label>
                        <select 
                            value={theme.layout.menuStyle}
                            onChange={(e) => onUpdateTheme({ layout: { ...theme.layout, menuStyle: e.target.value as any } })}
                            className="w-full bg-black/20 border border-[var(--color-border)] text-[10px] rounded p-1 text-[var(--color-text)] focus:border-[var(--color-primary)] outline-none"
                        >
                            <option value="standard">Standard</option>
                            <option value="compact">Compact</option>
                            <option value="dashboard">Dashboard</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-[9px] uppercase font-bold text-[var(--color-text-secondary)] mb-1">Icon Theme</label>
                        <select 
                            value={theme.layout.iconTheme}
                            onChange={(e) => onUpdateTheme({ layout: { ...theme.layout, iconTheme: e.target.value as any } })}
                            className="w-full bg-black/20 border border-[var(--color-border)] text-[10px] rounded p-1 text-[var(--color-text)] focus:border-[var(--color-primary)] outline-none"
                        >
                            <option value="outline">Outline</option>
                            <option value="filled">Filled</option>
                            <option value="duotone">Duotone</option>
                        </select>
                    </div>
                </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

export default ThemeEditorSidebar;
