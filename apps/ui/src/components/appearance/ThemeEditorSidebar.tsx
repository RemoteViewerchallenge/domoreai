import React, { useState } from 'react';
import { callVoid } from '../../lib/callVoid.js';
import { Palette, Type, SlidersHorizontal, Settings, X, Layers, Keyboard, MousePointer, Cog } from 'lucide-react';
import type { Theme, ThemeColors } from '../../theme/types.js';
import { themePresets } from '../../theme/presets.js';

type Tab = 'presets' | 'colors' | 'typography' | 'visual' | 'keystrokes' | 'mouse' | 'settings';

interface ThemeEditorSidebarProps {
  theme: Theme;
  onUpdateTheme: (partial: Partial<Theme>) => void;
  onClose: () => void;
}

export const ThemeEditorSidebar: React.FC<ThemeEditorSidebarProps> = ({ theme, onUpdateTheme, onClose }) => {
  const [activeTab, setActiveTab] = useState<Tab>('presets');

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
    { id: 'presets', icon: Layers, label: 'Presets' },
    { id: 'colors', icon: Palette, label: 'Colors' },
    { id: 'typography', icon: Type, label: 'Typography' },
    { id: 'visual', icon: SlidersHorizontal, label: 'Visual' },
    { id: 'keystrokes', icon: Keyboard, label: 'Keys' },
    { id: 'mouse', icon: MousePointer, label: 'Mouse' },
    { id: 'settings', icon: Cog, label: 'Settings' },
  ];

  return (
    <div className="flex-none h-full w-80 bg-[var(--color-background-secondary)] border-r border-[var(--color-border)] shadow-2xl flex flex-col text-xs font-mono text-[var(--color-text)]">
      {/* Header */}
      <div className="flex-none h-12 px-4 flex items-center justify-between border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2 font-bold text-sm">
          <Settings size={16} className="text-[var(--color-primary)]" />
          <span>Theme Editor</span>
        </div>
        <button onClick={() => callVoid(onClose)} className="p-1 rounded hover:bg-[var(--color-background)]">
          <X size={16} />
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex-none flex border-b border-[var(--color-border)]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex flex-col items-center justify-center gap-1 p-2 text-center border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                : 'border-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-background)]'
            }`}
          >
            <tab.icon size={16} />
            <span className="text-[10px] uppercase">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {activeTab === 'presets' && (
          <section>
            <h3 className="font-bold uppercase text-[var(--color-text-secondary)] mb-3">Theme Presets</h3>
            <div className="space-y-2">
              {Object.entries(themePresets).map(([key, presetTheme]) => (
                <button
                  key={key}
                  onClick={() => onUpdateTheme(presetTheme)}
                  className={`w-full text-left p-3 rounded-md border-2 transition-all ${
                    theme.colors.primary.value === presetTheme.colors.primary.value
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary-muted)]'
                      : 'border-[var(--color-border)] bg-[var(--color-background)] hover:border-[var(--color-text-secondary)]'
                  }`}
                >
                  <div className="font-bold text-sm text-[var(--color-text)] capitalize">{key}</div>
                </button>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'colors' && (
          <section>
            <h3 className="font-bold uppercase text-[var(--color-text-secondary)] mb-3">Color Tokens</h3>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(theme.colors).map(([key, value]) => {
                 const isNeon = typeof value === 'object' && value !== null && 'value' in value;
                 const colorValue = isNeon ? (value as any).value : (value as string);
                 const updateFn = isNeon ? updateNeonColor : updateStringColor;

                 return (
                <div key={String(key)} className="space-y-1">
                  <label className="block text-[9px] uppercase font-semibold">{String(key)}</label>
                  <div className="flex items-center gap-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded px-1 py-1">
                    <input type="color" value={colorValue} onChange={(e) => updateFn(key as keyof ThemeColors, e.target.value)} className="w-6 h-6 border-0 p-0 bg-transparent cursor-pointer" />
                    <input type="text" value={colorValue} onChange={(e) => updateFn(key as keyof ThemeColors, e.target.value)} className="w-full bg-transparent border-0 text-[10px] focus:outline-none" />
                  </div>
                </div>
                 );
              })}
            </div>
          </section>
        )}

        {activeTab === 'typography' && (
          <section className="space-y-4">
            <div>
              <label className="block text-[9px] uppercase font-semibold">Base Font Size ({theme.visual.fontSize}px)</label>
              <input
                type="range" min={8} max={24} value={theme.visual.fontSize}
                onChange={(e) => onUpdateTheme({ visual: { ...theme.visual, fontSize: Number(e.target.value) } })}
                className="w-full"
              />
            </div>
             <div>
              <label className="block text-[9px] uppercase font-semibold">Line Height ({theme.visual.lineHeight})</label>
              <input
                type="range" min={1} max={2} step={0.1} value={theme.visual.lineHeight}
                onChange={(e) => onUpdateTheme({ visual: { ...theme.visual, lineHeight: Number(e.target.value) } })}
                className="w-full"
              />
            </div>
             <div>
              <label className="block text-[9px] uppercase font-semibold">Letter Spacing ({theme.visual.letterSpacing}px)</label>
              <input
                type="range" min={-2} max={4} step={0.5} value={theme.visual.letterSpacing}
                onChange={(e) => onUpdateTheme({ visual: { ...theme.visual, letterSpacing: Number(e.target.value) } })}
                className="w-full"
              />
            </div>
          </section>
        )}

        {activeTab === 'visual' && (
          <section className="space-y-4">
            <div>
              <label className="block text-[9px] uppercase font-semibold">Border Width ({theme.visual.borderWidth}px)</label>
              <input
                type="range" min={0} max={4} value={theme.visual.borderWidth}
                onChange={(e) => onUpdateTheme({ visual: { ...theme.visual, borderWidth: Number(e.target.value) } })}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-[9px] uppercase font-semibold">Glow Intensity ({theme.visual.glowIntensity}%)</label>
              <input
                type="range" min={0} max={100} value={theme.visual.glowIntensity}
                onChange={(e) => onUpdateTheme({ visual: { ...theme.visual, glowIntensity: Number(e.target.value) } })}
                className="w-full"
              />
            </div>
             <div>
              <label className="block text-[9px] uppercase font-semibold">Transparency ({theme.visual.transparency}%)</label>
              <input
                type="range" min={0} max={90} value={theme.visual.transparency}
                onChange={(e) => onUpdateTheme({ visual: { ...theme.visual, transparency: Number(e.target.value) } })}
                className="w-full"
              />
            </div>
          </section>
        )}

        {activeTab === 'keystrokes' && (
          <section>
            <h3 className="font-bold uppercase text-[var(--color-text-secondary)] mb-3">Keystrokes</h3>
            <div className="p-3 bg-[var(--color-background)] border border-[var(--color-border)] rounded text-center text-[var(--color-text-muted)]">
              Keystroke configuration coming soon.
            </div>
          </section>
        )}

        {activeTab === 'mouse' && (
          <section>
            <h3 className="font-bold uppercase text-[var(--color-text-secondary)] mb-3">Mouse</h3>
            <div className="p-3 bg-[var(--color-background)] border border-[var(--color-border)] rounded text-center text-[var(--color-text-muted)]">
              Mouse configuration coming soon.
            </div>
          </section>
        )}

        {activeTab === 'settings' && (
          <section>
            <h3 className="font-bold uppercase text-[var(--color-text-secondary)] mb-3">Settings</h3>
            <div className="p-3 bg-[var(--color-background)] border border-[var(--color-border)] rounded text-center text-[var(--color-text-muted)]">
              General settings coming soon.
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default ThemeEditorSidebar;
