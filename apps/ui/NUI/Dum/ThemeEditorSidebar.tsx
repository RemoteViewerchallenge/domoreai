import React, { useState } from 'react';
import { callVoid } from '../../src/lib/callVoid.js';
import { Palette, Type, SlidersHorizontal, Settings, X, Layers } from 'lucide-react';
import type { DesignTheme, DesignThemeColors, DesignThemeGradients, FontKey, DesignDensity } from '../design-system/types.js';
import { gradientOptions } from '../design-system/gradients.js';
import type { GradientOption } from '../design-system/gradients.js';
import { defaultDesignThemePresets } from '../design-system/presets.js';

type Tab = 'presets' | 'colors' | 'typography' | 'visual';

interface ThemeEditorSidebarProps {
  theme: DesignTheme;
  onUpdateTheme: (updater: (prev: DesignTheme) => DesignTheme) => void;
  onClose: () => void;
}

export const ThemeEditorSidebar: React.FC<ThemeEditorSidebarProps> = ({ theme, onUpdateTheme, onClose }) => {
  const [activeTab, setActiveTab] = useState<Tab>('presets');

  const updateColors = (partial: Partial<DesignThemeColors>) => {
    onUpdateTheme((t) => ({ ...t, colors: { ...t.colors, ...partial } }));
  };

  const updateGradients = (partial: Partial<DesignThemeGradients>) => {
    onUpdateTheme((t) => ({ ...t, gradients: { ...t.gradients, ...partial } }));
  };

  const tabs: { id: Tab; icon: React.ElementType; label: string }[] = [
    { id: 'presets', icon: Layers, label: 'Presets' },
    { id: 'colors', icon: Palette, label: 'Colors' },
    { id: 'typography', icon: Type, label: 'Typography' },
    { id: 'visual', icon: SlidersHorizontal, label: 'Visual' },
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
              {defaultDesignThemePresets.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => onUpdateTheme(() => preset.theme)}
                  className={`w-full text-left p-3 rounded-md border-2 transition-all ${
                    theme.colors.primary === preset.theme.colors.primary && theme.colors.background === preset.theme.colors.background
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary-muted)]'
                      : 'border-[var(--color-border)] bg-[var(--color-background)] hover:border-[var(--color-text-secondary)]'
                  }`}
                >
                  <div className="font-bold text-sm text-[var(--color-text)]">{preset.name}</div>
                  <p className="text-xs text-[var(--color-text-secondary)]">{preset.description}</p>
                </button>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'colors' && (
          <section>
            <h3 className="font-bold uppercase text-[var(--color-text-secondary)] mb-3">Color Tokens</h3>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(theme.colors).map(([key, value]) => (
                <div key={String(key)} className="space-y-1">
                  <label className="block text-[9px] uppercase font-semibold">{String(key)}</label>
                  <div className="flex items-center gap-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded px-1 py-1">
                    <input type="color" value={value as string} onChange={(e) => updateColors({ [key]: e.target.value })} className="w-6 h-6 border-0 p-0 bg-transparent cursor-pointer" />
                    <input type="text" value={value as string} onChange={(e) => updateColors({ [key]: e.target.value })} className="w-full bg-transparent border-0 text-[10px] focus:outline-none" />
                  </div>
                </div>
              ))}
            </div>
            <h3 className="font-bold uppercase text-[var(--color-text-secondary)] mt-6 mb-3">Gradient Tokens</h3>
            <div className="grid grid-cols-2 gap-4">
              {(['primary', 'accent', 'surface', 'button'] as (keyof DesignThemeGradients)[]).map((slot) => (
                <div key={slot}>
                  <label className="block text-[9px] uppercase font-semibold mb-1">{slot}</label>
                  <div className="h-8 w-full rounded border border-[var(--color-border)] mb-2" style={{ background: theme.gradients[slot] }} />
                  <div className="flex flex-wrap gap-1">
                    {gradientOptions.map((g: GradientOption) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => updateGradients({ [slot]: g.value })}
                        className={`h-5 w-5 rounded border-2 ${theme.gradients[slot] === g.value ? 'border-[var(--color-primary)]' : 'border-transparent'}`}
                        style={{ background: g.value }}
                        title={g.name}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'typography' && (
          <section className="space-y-4">
            <div>
              <label className="block text-[9px] uppercase font-semibold mb-1">UI Font</label>
              <select
                value={theme.typography.fontFamilyUi}
                onChange={(e) => onUpdateTheme((t) => ({ ...t, typography: { ...t.typography, fontFamilyUi: e.target.value as FontKey } }))}
                className="w-full bg-[var(--color-background)] border border-[var(--color-border)] rounded px-2 py-1 text-[10px] focus:outline-none focus:border-[var(--color-primary)]"
              >
                <option value="system">System</option>
                <option value="humanist">Humanist</option>
                <option value="tech">Tech</option>
              </select>
            </div>
            <div>
              <label className="block text-[9px] uppercase font-semibold mb-1">Mono Font</label>
              <select
                value={theme.typography.fontFamilyMono}
                onChange={(e) => onUpdateTheme((t) => ({ ...t, typography: { ...t.typography, fontFamilyMono: e.target.value as FontKey } }))}
                className="w-full bg-[var(--color-background)] border border-[var(--color-border)] rounded px-2 py-1 text-[10px] focus:outline-none focus:border-[var(--color-primary)]"
              >
                <option value="mono">Mono</option>
                <option value="system">System</option>
              </select>
            </div>
            <div>
              <label className="block text-[9px] uppercase font-semibold">Base Font Size ({theme.typography.baseSize}px)</label>
              <input
                type="range" min={10} max={18} value={theme.typography.baseSize}
                onChange={(e) => onUpdateTheme((t) => ({ ...t, typography: { ...t.typography, baseSize: Number(e.target.value) } }))}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-[9px] uppercase font-semibold">Secondary Font Size ({theme.typography.secondarySize}px)</label>
              <input
                type="range" min={9} max={16} value={theme.typography.secondarySize}
                onChange={(e) => onUpdateTheme((t) => ({ ...t, typography: { ...t.typography, secondarySize: Number(e.target.value) } }))}
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
                onChange={(e) => onUpdateTheme((t) => ({ ...t, visual: { ...t.visual, borderWidth: Number(e.target.value) } }))}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-[9px] uppercase font-semibold">Glow Intensity ({theme.visual.glowIntensity}%)</label>
              <input
                type="range" min={0} max={100} value={theme.visual.glowIntensity}
                onChange={(e) => onUpdateTheme((t) => ({ ...t, visual: { ...t.visual, glowIntensity: Number(e.target.value) } }))}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-[9px] uppercase font-semibold">Radius Scale ({theme.visual.radiusScale.toFixed(1)})</label>
              <input
                type="range" min={0} max={2} step={0.1} value={theme.visual.radiusScale}
                onChange={(e) => onUpdateTheme((t) => ({ ...t, visual: { ...t.visual, radiusScale: Number(e.target.value) } }))}
                className="w-full"
              />
            </div>
            <div>
              <div className="text-[9px] uppercase font-semibold mb-1">Density</div>
              <div className="flex gap-2">
                {['compact', 'standard', 'cozy'].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => onUpdateTheme((t) => ({ ...t, visual: { ...t.visual, density: d as DesignDensity } }))}
                    className={`flex-1 px-2 py-1 rounded border text-[9px] uppercase ${
                      theme.visual.density === d
                        ? 'border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-primary-muted)]'
                        : 'border-[var(--color-border)] hover:border-[var(--color-text-secondary)]'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default ThemeEditorSidebar;
