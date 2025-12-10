import React, { useEffect, useMemo, useState } from 'react';
import { Trash2, Plus, RotateCcw, Copy, Palette, Type, SlidersHorizontal, Eye } from 'lucide-react';
import { defaultDesignThemePresets } from '../design-system/presets';
import type { DesignTheme, DesignThemePreset, DesignThemeColors, DesignThemeGradients } from '../design-system/types';
import { gradientOptions } from '../design-system/gradients';
import { StyleGuidePreview } from '../design-system/StyleGuidePreview';
import { buildCssVariablesFromTheme } from '../design-system/cssVariables';

const PRESETS_STORAGE_KEY = 'design-system-theme-presets';
const SELECTED_PRESET_STORAGE_KEY = 'design-system-selected-preset';

function loadInitialPresets(): DesignThemePreset[] {
  if (typeof window === 'undefined') return defaultDesignThemePresets;
  try {
    const raw = window.localStorage.getItem(PRESETS_STORAGE_KEY);
    if (!raw) return defaultDesignThemePresets;
    const parsed = JSON.parse(raw) as DesignThemePreset[];
    if (!Array.isArray(parsed) || parsed.length === 0) return defaultDesignThemePresets;
    return parsed;
  } catch {
    return defaultDesignThemePresets;
  }
}

const DesignSystemSettingsPage: React.FC = () => {
  const [presets, setPresets] = useState<DesignThemePreset[]>(() => loadInitialPresets());
  const [selectedPresetId, setSelectedPresetId] = useState<string>(() => {
    if (typeof window === 'undefined') return presets[0]?.id ?? 'core-dark';
    return window.localStorage.getItem(SELECTED_PRESET_STORAGE_KEY) || presets[0]?.id || 'core-dark';
  });

  const selectedPreset = useMemo(
    () => presets.find((p) => p.id === selectedPresetId) || presets[0],
    [presets, selectedPresetId],
  );

  const currentTheme: DesignTheme = selectedPreset.theme;

  // Persist presets
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
  }, [presets]);

  // Persist selected preset id
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(SELECTED_PRESET_STORAGE_KEY, selectedPresetId);
  }, [selectedPresetId]);

  const updateCurrentTheme = (updater: (prev: DesignTheme) => DesignTheme) => {
    setPresets((prev) =>
      prev.map((preset) =>
        preset.id === selectedPresetId
          ? { ...preset, theme: updater(preset.theme) }
          : preset,
      ),
    );
  };

  const updateColors = (partial: Partial<DesignThemeColors>) => {
    updateCurrentTheme((theme) => ({ ...theme, colors: { ...theme.colors, ...partial } }));
  };

  const updateGradients = (partial: Partial<DesignThemeGradients>) => {
    updateCurrentTheme((theme) => ({ ...theme, gradients: { ...theme.gradients, ...partial } }));
  };

  const handleAddPreset = () => {
    const base = selectedPreset || presets[0];
    const id = `preset-${Date.now()}`;
    const copy: DesignThemePreset = {
      ...base,
      id,
      name: base.name + ' Copy',
    };
    setPresets((prev) => [...prev, copy]);
    setSelectedPresetId(id);
  };

  const handleDeletePreset = () => {
    if (presets.length <= 1) return;
    const remaining = presets.filter((p) => p.id !== selectedPresetId);
    setPresets(remaining);
    setSelectedPresetId(remaining[0].id);
  };

  const handleResetDefaults = () => {
    setPresets(defaultDesignThemePresets);
    setSelectedPresetId(defaultDesignThemePresets[0].id);
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore in this sandbox
    }
  };

  const themeJson = useMemo(() => JSON.stringify(currentTheme, null, 2), [currentTheme]);

  return (
    <div className="h-screen w-screen flex bg-black text-xs font-mono overflow-hidden">
      {/* Left: Preset list */}
      <div className="h-full w-64 border-r flex flex-col" style={{ borderColor: 'rgba(148,163,184,0.3)', background: '#020617' }}>
        <div className="flex-none px-3 py-3 border-b flex items-center justify-between" style={{ borderColor: 'rgba(148,163,184,0.3)' }}>
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-slate-200">
            <Palette size={14} />
            Presets
          </div>
          <button
            onClick={handleResetDefaults}
            className="p-1 rounded border border-slate-700 text-[9px] uppercase flex items-center gap-1 text-slate-300 hover:border-slate-400"
          >
            <RotateCcw size={10} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {presets.map((preset) => (
            <button
              key={preset.id}
              onClick={() => setSelectedPresetId(preset.id)}
              className={`w-full text-left px-2 py-1.5 rounded border text-[10px] mb-1 transition-colors ${
                preset.id === selectedPresetId
                  ? 'border-cyan-400 bg-cyan-500/10 text-slate-50'
                  : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-500'
              }`}
            >
              <div className="font-semibold truncate">{preset.name}</div>
              {preset.description && (
                <div className="text-[9px] text-slate-400 truncate">{preset.description}</div>
              )}
            </button>
          ))}
        </div>
        <div className="flex-none px-2 py-2 border-t flex gap-2" style={{ borderColor: 'rgba(148,163,184,0.3)' }}>
          <button
            onClick={handleAddPreset}
            className="flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded border border-slate-700 text-[10px] uppercase text-slate-200 hover:border-cyan-400"
          >
            <Plus size={10} />
            Duplicate
          </button>
          <button
            onClick={handleDeletePreset}
            disabled={presets.length <= 1}
            className="flex items-center justify-center px-2 py-1 rounded border text-[10px] uppercase gap-1 disabled:opacity-40 disabled:cursor-not-allowed border-slate-700 text-red-300 hover:border-red-400"
          >
            <Trash2 size={10} />
          </button>
        </div>
      </div>

      {/* Middle: Editing panels */}
      <div className="flex-1 h-full flex flex-col border-r" style={{ borderColor: 'rgba(148,163,184,0.3)', background: '#020617' }}>
        <div className="flex-none px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'rgba(148,163,184,0.3)' }}>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-slate-200">
              <Eye size={14} />
              Design System Settings
            </div>
            <div className="text-[10px] text-slate-400">
              Standalone sandbox – not wired to current app theme.
            </div>
          </div>
          <input
            className="px-2 py-1 rounded border border-slate-700 bg-slate-950 text-[10px] text-slate-200 focus:outline-none focus:border-cyan-400 w-56"
            value={selectedPreset.name}
            onChange={(e) => {
              const name = e.target.value;
              setPresets((prev) =>
                prev.map((p) => (p.id === selectedPresetId ? { ...p, name } : p)),
              );
            }}
          />
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {/* Colors & Gradients */}
          <section className="border border-slate-800 rounded-lg p-3 bg-slate-950/60">
            <div className="flex items-center gap-2 mb-3 text-[11px] font-bold uppercase tracking-wide text-slate-200">
              <Palette size={14} />
              Colors & Gradients
            </div>

            {/* Colors grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {Object.entries(currentTheme.colors).map(([key, value]) => (
                <div key={key} className="space-y-1">
                  <label className="block text-[9px] uppercase text-slate-400 font-semibold">
                    {key}
                  </label>
                  <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded px-1 py-1">
                    <input
                      type="color"
                      value={value}
                      onChange={(e) => updateColors({ [key]: e.target.value } as Partial<DesignThemeColors>)}
                      className="w-6 h-6 border-0 p-0 bg-transparent cursor-pointer"
                    />
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => updateColors({ [key]: e.target.value } as Partial<DesignThemeColors>)}
                      className="flex-1 bg-transparent border-0 text-[10px] text-slate-200 font-mono focus:outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Gradients */}
            <div className="mt-2">
              <div className="text-[9px] uppercase text-slate-400 font-semibold mb-2">
                Gradient Tokens
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {(['primary', 'accent', 'surface', 'button'] as (keyof DesignThemeGradients)[]).map((slot) => (
                  <div key={slot} className="space-y-1">
                    <div className="text-[9px] uppercase text-slate-400 font-semibold flex justify-between">
                      <span>{slot}</span>
                    </div>
                    <div className="h-8 w-full rounded border border-slate-800 mb-1" style={{ background: currentTheme.gradients[slot] }} />
                    <div className="flex flex-wrap gap-1">
                      {gradientOptions.map((g) => (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => updateGradients({ [slot]: g.value } as Partial<DesignThemeGradients>)}
                          className={`h-5 w-5 rounded border ring-1 ring-transparent hover:ring-cyan-400 transition-all ${
                            currentTheme.gradients[slot] === g.value
                              ? 'border-cyan-400'
                              : 'border-slate-700'
                          }`}
                          style={{ background: g.value }}
                          title={g.name}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Typography & Visual */}
          <section className="border border-slate-800 rounded-lg p-3 bg-slate-950/60">
            <div className="flex items-center gap-2 mb-3 text-[11px] font-bold uppercase tracking-wide text-slate-200">
              <Type size={14} />
              Typography & Visual
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Typography */}
              <div className="space-y-2">
                <div className="text-[9px] uppercase text-slate-400 font-semibold">Fonts</div>
                <div className="space-y-2">
                  <div>
                    <label className="block text-[9px] uppercase text-slate-400 mb-1">UI Font</label>
                    <select
                      value={currentTheme.typography.fontFamilyUi}
                      onChange={(e) =>
                        updateCurrentTheme((theme) => ({
                          ...theme,
                          typography: { ...theme.typography, fontFamilyUi: e.target.value as any },
                        }))
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[10px] text-slate-200 focus:outline-none focus:border-cyan-400"
                    >
                      <option value="system">System</option>
                      <option value="humanist">Humanist</option>
                      <option value="tech">Tech</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase text-slate-400 mb-1">Mono Font</label>
                    <select
                      value={currentTheme.typography.fontFamilyMono}
                      onChange={(e) =>
                        updateCurrentTheme((theme) => ({
                          ...theme,
                          typography: { ...theme.typography, fontFamilyMono: e.target.value as any },
                        }))
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[10px] text-slate-200 focus:outline-none focus:border-cyan-400"
                    >
                      <option value="mono">Mono</option>
                      <option value="system">System</option>
                    </select>
                  </div>
                </div>

                <div className="mt-3 space-y-2">
                  <label className="block text-[9px] uppercase text-slate-400">Base Font Size ({currentTheme.typography.baseSize}px)</label>
                  <input
                    type="range"
                    min={10}
                    max={18}
                    value={currentTheme.typography.baseSize}
                    onChange={(e) =>
                      updateCurrentTheme((theme) => ({
                        ...theme,
                        typography: { ...theme.typography, baseSize: Number(e.target.value) },
                      }))
                    }
                    className="w-full"
                  />
                  <label className="block text-[9px] uppercase text-slate-400">Secondary Font Size ({currentTheme.typography.secondarySize}px)</label>
                  <input
                    type="range"
                    min={9}
                    max={16}
                    value={currentTheme.typography.secondarySize}
                    onChange={(e) =>
                      updateCurrentTheme((theme) => ({
                        ...theme,
                        typography: { ...theme.typography, secondarySize: Number(e.target.value) },
                      }))
                    }
                    className="w-full"
                  />
                </div>
              </div>

              {/* Visual */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-[9px] uppercase text-slate-400 font-semibold">
                  <SlidersHorizontal size={12} />
                  Visual System
                </div>
                <div className="space-y-2">
                  <div>
                    <label className="block text-[9px] uppercase text-slate-400 mb-1">Border Width ({currentTheme.visual.borderWidth}px)</label>
                    <input
                      type="range"
                      min={0}
                      max={4}
                      value={currentTheme.visual.borderWidth}
                      onChange={(e) =>
                        updateCurrentTheme((theme) => ({
                          ...theme,
                          visual: { ...theme.visual, borderWidth: Number(e.target.value) },
                        }))
                      }
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase text-slate-400 mb-1">Glow Intensity ({currentTheme.visual.glowIntensity}%)</label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={currentTheme.visual.glowIntensity}
                      onChange={(e) =>
                        updateCurrentTheme((theme) => ({
                          ...theme,
                          visual: { ...theme.visual, glowIntensity: Number(e.target.value) },
                        }))
                      }
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase text-slate-400 mb-1">Radius Scale ({currentTheme.visual.radiusScale.toFixed(1)})</label>
                    <input
                      type="range"
                      min={0}
                      max={2}
                      step={0.1}
                      value={currentTheme.visual.radiusScale}
                      onChange={(e) =>
                        updateCurrentTheme((theme) => ({
                          ...theme,
                          visual: { ...theme.visual, radiusScale: Number(e.target.value) },
                        }))
                      }
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="mt-2">
                  <div className="text-[9px] uppercase text-slate-400 mb-1">Density</div>
                  <div className="flex gap-2">
                    {['compact', 'standard', 'cozy'].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() =>
                          updateCurrentTheme((theme) => ({
                            ...theme,
                            visual: { ...theme.visual, density: d as any },
                          }))
                        }
                        className={`flex-1 px-2 py-1 rounded border text-[9px] uppercase ${
                          currentTheme.visual.density === d
                            ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10'
                            : 'border-slate-700 text-slate-300 hover:border-slate-400'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Preview & Export */}
          <section className="border border-slate-800 rounded-lg p-3 bg-slate-950/60">
            <div className="flex items-center gap-2 mb-3 text-[11px] font-bold uppercase tracking-wide text-slate-200">
              <Eye size={14} />
              Preview & Export
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex flex-col h-40 border border-slate-800 rounded bg-slate-950">
                <div className="flex-none px-2 py-1 border-b border-slate-800 flex items-center justify-between text-[9px] text-slate-300">
                  <span>Theme JSON</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(themeJson)}
                    className="flex items-center gap-1 px-1 py-0.5 rounded border border-slate-700 text-[9px] text-slate-200 hover:border-cyan-400"
                  >
                    <Copy size={10} />
                    Copy
                  </button>
                </div>
                <textarea
                  readOnly
                  value={themeJson}
                  className="flex-1 bg-transparent text-[10px] text-slate-200 p-2 resize-none outline-none"
                />
              </div>

              <CssExportPanel theme={currentTheme} onCopy={handleCopy} />
            </div>
          </section>
        </div>
      </div>

      {/* Right: Live style guide preview */}
      <div className="h-full w-96 flex flex-col" style={{ background: '#020617' }}>
        <StyleGuidePreview theme={currentTheme} />
      </div>
    </div>
  );
};

interface CssExportPanelProps {
  theme: DesignTheme;
  onCopy: (text: string) => void;
}

const CssExportPanel: React.FC<CssExportPanelProps> = ({ theme, onCopy }) => {
  const vars = buildCssVariablesFromTheme(theme) as Record<string, string>;
  const cssBlock = useMemo(
    () =>
      [
        ':root {',
        ...Object.entries(vars).map(([k, v]) => `  ${k}: ${v};`),
        '}',
      ].join('\n'),
    [vars],
  );

  return (
    <div className="flex flex-col h-40 border border-slate-800 rounded bg-slate-950">
      <div className="flex-none px-2 py-1 border-b border-slate-800 flex items-center justify-between text-[9px] text-slate-300">
        <span>CSS Variables</span>
        <button
          type="button"
          onClick={() => onCopy(cssBlock)}
          className="flex items-center gap-1 px-1 py-0.5 rounded border border-slate-700 text-[9px] text-slate-200 hover:border-cyan-400"
        >
          <Copy size={10} />
          Copy
        </button>
      </div>
      <textarea
        readOnly
        value={cssBlock}
        className="flex-1 bg-transparent text-[10px] text-slate-200 p-2 resize-none outline-none"
      />
    </div>
  );
};

export default DesignSystemSettingsPage;
