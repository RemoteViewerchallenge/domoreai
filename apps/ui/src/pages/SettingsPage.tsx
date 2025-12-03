import { useState, useEffect, useCallback } from 'react';
import { Trash2, Plus, RotateCcw, Keyboard, Palette, Monitor } from 'lucide-react';
import { WorkspaceSettings } from '../components/settings/WorkspaceSettings.js';
import { useTheme } from '../hooks/useTheme.js';

interface Hotkey {
  id: string;
  action: string;
  keys: string;
}

interface ColorScheme {
  id: string;
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    success: string;
    background: string;
    backgroundSecondary: string;
    text: string;
    textSecondary: string;
    border: string;
  };
}

const HOTKEYS_STORAGE_KEY = 'core-hotkeys';
const COLOR_SCHEMES_STORAGE_KEY = 'core-color-schemes';
const SELECTED_SCHEME_STORAGE_KEY = 'core-selected-scheme';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'appearance' | 'hotkeys' | 'workspace'>('appearance');
  const { theme, setTheme, resetToDefault } = useTheme();

  // Load hotkeys from localStorage
  const [hotkeys, setHotkeys] = useState<Hotkey[]>(() => {
    const stored = localStorage.getItem(HOTKEYS_STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return [];
      }
    }
    return [];
  });

  // Load color schemes from localStorage
  const [colorSchemes, setColorSchemes] = useState<ColorScheme[]>(() => {
    const stored = localStorage.getItem(COLOR_SCHEMES_STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return [
          {
            id: 'default',
            name: 'Default Dark',
            colors: {
              primary: '#00FFFF',
              secondary: '#9D00FF',
              accent: '#FF00FF',
              success: '#00FF00',
              background: '#000000',
              backgroundSecondary: '#0a0a0a',
              text: '#ffffff',
              textSecondary: '#a0a0a0',
              border: '#1a1a1a',
            },
          },
        ];
      }
    }
    return [
      {
        id: 'default',
        name: 'Default Dark',
        colors: {
          primary: '#00FFFF',
          secondary: '#9D00FF',
          accent: '#FF00FF',
          success: '#00FF00',
          background: '#000000',
          backgroundSecondary: '#0a0a0a',
          text: '#ffffff',
          textSecondary: '#a0a0a0',
          border: '#1a1a1a',
        },
      },
    ];
  });

  const [selectedSchemeId, setSelectedSchemeId] = useState<string>(() => {
    return localStorage.getItem(SELECTED_SCHEME_STORAGE_KEY) || 'default';
  });

  // Save hotkeys to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(HOTKEYS_STORAGE_KEY, JSON.stringify(hotkeys));
    window.dispatchEvent(new StorageEvent('storage', {
      key: HOTKEYS_STORAGE_KEY,
      newValue: JSON.stringify(hotkeys)
    }));
  }, [hotkeys]);

  // Save color schemes to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(COLOR_SCHEMES_STORAGE_KEY, JSON.stringify(colorSchemes));
  }, [colorSchemes]);

  // Save selected scheme ID
  useEffect(() => {
    localStorage.setItem(SELECTED_SCHEME_STORAGE_KEY, selectedSchemeId);
  }, [selectedSchemeId]);

  const handleAddHotkey = () => {
    const newHotkey: Hotkey = {
      id: Date.now().toString(),
      action: 'New Action',
      keys: 'Ctrl+K',
    };
    setHotkeys([...hotkeys, newHotkey]);
  };

  const handleDeleteHotkey = (id: string) => {
    setHotkeys(hotkeys.filter((h) => h.id !== id));
  };

  const handleUpdateHotkey = (id: string, field: keyof Hotkey, value: string) => {
    setHotkeys(hotkeys.map((h) => (h.id === id ? { ...h, [field]: value } : h)));
  };

  const applyScheme = useCallback((scheme: ColorScheme) => {
    setTheme({
      colors: {
        ...theme.colors,
        primary: { name: 'Primary', value: scheme.colors.primary, glow: `0 0 20px ${scheme.colors.primary}80` },
        secondary: { name: 'Secondary', value: scheme.colors.secondary, glow: `0 0 20px ${scheme.colors.secondary}80` },
        accent: { name: 'Accent', value: scheme.colors.accent, glow: `0 0 20px ${scheme.colors.accent}80` },
        success: { name: 'Success', value: scheme.colors.success, glow: `0 0 20px ${scheme.colors.success}80` },
        background: scheme.colors.background,
        backgroundSecondary: scheme.colors.backgroundSecondary,
        text: scheme.colors.text,
        textSecondary: scheme.colors.textSecondary,
        border: scheme.colors.border,
      },
    });
  }, [setTheme, theme.colors]);

  // When selected scheme changes, apply it
  useEffect(() => {
    const scheme = colorSchemes.find(s => s.id === selectedSchemeId);
    if (scheme) {
      applyScheme(scheme);
    }
  }, [selectedSchemeId, colorSchemes, applyScheme]);

  const updateCurrentSchemeColor = (key: string, value: string) => {
    setColorSchemes(prev => prev.map(s => {
      if (s.id === selectedSchemeId) {
        return {
          ...s,
          colors: { ...s.colors, [key]: value }
        };
      }
      return s;
    }));
    
    // Also update live theme
    const isComplexColor = ['primary', 'secondary', 'accent', 'success'].includes(key);
    if (isComplexColor) {
      setTheme({
        colors: {
          ...theme.colors,
          [key]: { 
            ...(theme.colors[key as keyof typeof theme.colors] as { name: string, value: string, glow: string }), 
            value: value,
            glow: `0 0 20px ${value}80`
          }
        }
      });
    } else {
      setTheme({
        colors: {
          ...theme.colors,
          [key]: value
        }
      });
    }
  };

  const handleAddColorScheme = () => {
    const newScheme: ColorScheme = {
      id: Date.now().toString(),
      name: 'New Theme',
      colors: { 
        primary: typeof theme.colors.primary === 'string' ? theme.colors.primary : theme.colors.primary.value,
        secondary: typeof theme.colors.secondary === 'string' ? theme.colors.secondary : theme.colors.secondary.value,
        accent: typeof theme.colors.accent === 'string' ? theme.colors.accent : theme.colors.accent.value,
        success: typeof theme.colors.success === 'string' ? theme.colors.success : theme.colors.success.value,
        background: theme.colors.background,
        backgroundSecondary: theme.colors.backgroundSecondary,
        text: theme.colors.text,
        textSecondary: theme.colors.textSecondary,
        border: theme.colors.border,
      }, 
    };
    setColorSchemes([...colorSchemes, newScheme]);
    setSelectedSchemeId(newScheme.id);
  };

  const handleDeleteColorScheme = (id: string) => {
    if (colorSchemes.length <= 1) {
      alert("Cannot delete the last color scheme.");
      return;
    }
    const newSchemes = colorSchemes.filter(s => s.id !== id);
    setColorSchemes(newSchemes);
    if (selectedSchemeId === id) {
      setSelectedSchemeId(newSchemes[0].id);
      applyScheme(newSchemes[0]);
    }
  };

  const currentScheme = colorSchemes.find(s => s.id === selectedSchemeId) || colorSchemes[0];

  return (
    <div className="h-full w-full bg-[var(--color-background)] text-[var(--color-text)] flex flex-col font-mono text-xs overflow-hidden">
      {/* Header */}
      <div className="flex-none h-12 border-b border-[var(--color-border)] flex items-center px-4 justify-between bg-[var(--color-background-secondary)]">
        <h1 className="text-lg font-bold text-[var(--color-primary)] uppercase tracking-wider flex items-center gap-2">
          <Monitor size={18} />
          System Settings
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('appearance')}
            className={`px-3 py-1.5 rounded text-xs font-bold uppercase transition-all ${
              activeTab === 'appearance'
                ? 'bg-[var(--color-primary)] text-black shadow-[var(--glow-primary)]'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-background)]'
            }`}
          >
            <div className="flex items-center gap-2">
              <Palette size={14} />
              Appearance
            </div>
          </button>
          <button
            onClick={() => setActiveTab('hotkeys')}
            className={`px-3 py-1.5 rounded text-xs font-bold uppercase transition-all ${
              activeTab === 'hotkeys'
                ? 'bg-[var(--color-primary)] text-black shadow-[var(--glow-primary)]'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-background)]'
            }`}
          >
            <div className="flex items-center gap-2">
              <Keyboard size={14} />
              Hotkeys
            </div>
          </button>
          <button
            onClick={() => setActiveTab('workspace')}
            className={`px-3 py-1.5 rounded text-xs font-bold uppercase transition-all ${
              activeTab === 'workspace'
                ? 'bg-[var(--color-primary)] text-black shadow-[var(--glow-primary)]'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-background)]'
            }`}
          >
            <div className="flex items-center gap-2">
              <Monitor size={14} />
              Workspace
            </div>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* APPEARANCE TAB */}
          {activeTab === 'appearance' && (
            <div className="space-y-6">
              
              {/* Theme Selection & Management */}
              <div className="border border-[var(--color-border)] rounded-lg p-4 bg-[var(--color-background-secondary)]">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-sm font-bold text-[var(--color-text)] uppercase flex items-center gap-2">
                    <Palette size={16} className="text-[var(--color-primary)]" />
                    Theme Selection
                  </h2>
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddColorScheme}
                      className="flex items-center gap-1 px-2 py-1 bg-[var(--color-background)] border border-[var(--color-border)] hover:border-[var(--color-primary)] text-[var(--color-text)] rounded text-[10px] font-bold uppercase transition-all"
                    >
                      <Plus size={12} />
                      New Theme
                    </button>
                    <button
                      onClick={() => handleDeleteColorScheme(selectedSchemeId)}
                      className="flex items-center gap-1 px-2 py-1 bg-[var(--color-background)] border border-[var(--color-border)] hover:border-[var(--color-error)] text-[var(--color-text)] hover:text-[var(--color-error)] rounded text-[10px] font-bold uppercase transition-all"
                    >
                      <Trash2 size={12} />
                      Delete
                    </button>
                  </div>
                </div>

                <div className="flex gap-4 items-center">
                  <select
                    value={selectedSchemeId}
                    onChange={(e) => setSelectedSchemeId(e.target.value)}
                    className="flex-1 bg-[var(--color-background)] border border-[var(--color-border)] text-[var(--color-text)] px-3 py-2 rounded font-mono text-xs focus:border-[var(--color-primary)] focus:outline-none"
                  >
                    {colorSchemes.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  
                  <input
                    type="text"
                    value={currentScheme.name}
                    onChange={(e) => {
                      setColorSchemes(prev => prev.map(s => s.id === selectedSchemeId ? { ...s, name: e.target.value } : s));
                    }}
                    className="flex-1 bg-[var(--color-background)] border border-[var(--color-border)] text-[var(--color-text)] px-3 py-2 rounded font-mono text-xs focus:border-[var(--color-primary)] focus:outline-none"
                    placeholder="Rename Theme..."
                  />
                </div>
              </div>

              {/* Gradient Selection */}
              <div className="border border-[var(--color-border)] rounded-lg p-4 bg-[var(--color-background-secondary)]">
                <h2 className="text-sm font-bold text-[var(--color-text)] uppercase mb-4">Button Gradient Style</h2>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {[
                    { name: 'Cyberpunk', value: 'var(--gradient-cyberpunk)' },
                    { name: 'Oceanic', value: 'var(--gradient-oceanic)' },
                    { name: 'Sunset', value: 'var(--gradient-sunset)' },
                    { name: 'Forest', value: 'var(--gradient-forest)' },
                    { name: 'Plasma', value: 'var(--gradient-plasma)' },
                  ].map((gradient) => (
                    <button
                      key={gradient.name}
                      onClick={() => {
                        document.documentElement.style.setProperty('--active-gradient', gradient.value);
                      }}
                      className="h-12 rounded border border-[var(--color-border)] hover:border-[var(--color-primary)] transition-all relative overflow-hidden group"
                    >
                      <div 
                        className="absolute inset-0 opacity-80 group-hover:opacity-100 transition-opacity"
                        style={{ background: gradient.value }}
                      />
                      <span className="relative z-10 text-[10px] font-bold text-black uppercase bg-white/50 px-2 py-0.5 rounded">
                        {gradient.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Single Color Palette */}
              <div className="border border-[var(--color-border)] rounded-lg p-4 bg-[var(--color-background-secondary)]">
                <h2 className="text-sm font-bold text-[var(--color-text)] uppercase mb-4">Color Palette</h2>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {Object.entries(currentScheme.colors).map(([key, value]) => (
                    <div key={key} className="space-y-1">
                      <label className="text-[9px] text-[var(--color-text-secondary)] uppercase font-bold block">{key}</label>
                      <div className="flex gap-2 items-center bg-[var(--color-background)] p-1 rounded border border-[var(--color-border)]">
                        <input
                          type="color"
                          value={value}
                          onChange={(e) => updateCurrentSchemeColor(key, e.target.value)}
                          className="w-6 h-6 rounded cursor-pointer border-none bg-transparent p-0"
                        />
                        <input
                          type="text"
                          value={value}
                          onChange={(e) => updateCurrentSchemeColor(key, e.target.value)}
                          className="flex-1 bg-transparent border-none text-[var(--color-text)] text-[10px] font-mono focus:outline-none uppercase"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Theme Style Guide */}
              <div className="border border-[var(--color-border)] rounded-lg p-4 bg-[var(--color-background-secondary)]">
                <h2 className="text-sm font-bold text-[var(--color-text)] uppercase mb-4">Theme Style Guide</h2>
                
                <div className="space-y-6">
                  {/* Colors */}
                  <div>
                    <h3 className="text-xs font-bold text-[var(--color-text-secondary)] uppercase mb-2">System Colors</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {['primary', 'secondary', 'accent', 'success', 'warning', 'error', 'info'].map(color => (
                        <div key={color} className="flex items-center gap-3 bg-[var(--color-background)] p-2 rounded border border-[var(--color-border)]">
                          <div 
                            className="w-8 h-8 rounded shadow-lg"
                            style={{ background: `var(--color-${color})`, boxShadow: `0 0 10px var(--color-${color})` }}
                          />
                          <div>
                            <div className="text-[10px] font-bold text-[var(--color-text)] uppercase">{color}</div>
                            <div className="text-[9px] text-[var(--color-text-secondary)] font-mono">var(--color-{color})</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Backgrounds & Text */}
                  <div>
                    <h3 className="text-xs font-bold text-[var(--color-text-secondary)] uppercase mb-2">Base Colors</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        { name: 'Background', var: 'background' },
                        { name: 'Bg Secondary', var: 'background-secondary' },
                        { name: 'Text', var: 'text' },
                        { name: 'Text Secondary', var: 'text-secondary' },
                        { name: 'Border', var: 'border' }
                      ].map(item => (
                        <div key={item.var} className="flex items-center gap-3 bg-[var(--color-background)] p-2 rounded border border-[var(--color-border)]">
                          <div 
                            className="w-8 h-8 rounded border border-gray-700"
                            style={{ background: `var(--color-${item.var})` }}
                          />
                          <div>
                            <div className="text-[10px] font-bold text-[var(--color-text)] uppercase">{item.name}</div>
                            <div className="text-[9px] text-[var(--color-text-secondary)] font-mono">var(--color-{item.var})</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Typography */}
                  <div>
                    <h3 className="text-xs font-bold text-[var(--color-text-secondary)] uppercase mb-2">Typography</h3>
                    <div className="space-y-2 bg-[var(--color-background)] p-4 rounded border border-[var(--color-border)]">
                      <div className="text-2xl font-bold text-[var(--color-text)]">Heading 1</div>
                      <div className="text-xl font-bold text-[var(--color-text)]">Heading 2</div>
                      <div className="text-lg font-bold text-[var(--color-text)]">Heading 3</div>
                      <div className="text-base text-[var(--color-text)]">Body Text - The quick brown fox jumps over the lazy dog.</div>
                      <div className="text-sm text-[var(--color-text)]">Small Text - The quick brown fox jumps over the lazy dog.</div>
                      <div className="text-xs text-[var(--color-text-secondary)]">Secondary Text - The quick brown fox jumps over the lazy dog.</div>
                      <div className="text-[10px] text-[var(--color-text-secondary)] uppercase tracking-wider">Caption Text</div>
                    </div>
                  </div>

                  {/* Buttons */}
                  <div>
                    <h3 className="text-xs font-bold text-[var(--color-text-secondary)] uppercase mb-2">Components</h3>
                    <div className="flex flex-wrap gap-4 bg-[var(--color-background)] p-4 rounded border border-[var(--color-border)]">
                      <button className="px-4 py-2 bg-[var(--color-primary)] text-black font-bold rounded shadow-[var(--glow-primary)]">
                        Primary
                      </button>
                      <button className="px-4 py-2 bg-[var(--color-secondary)] text-black font-bold rounded shadow-[var(--glow-secondary)]">
                        Secondary
                      </button>
                      <button className="px-4 py-2 border border-[var(--color-primary)] text-[var(--color-primary)] font-bold rounded hover:bg-[var(--color-primary)] hover:text-black transition-colors">
                        Outline
                      </button>
                      <button className="px-4 py-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text)] font-bold rounded">
                        Ghost
                      </button>
                      <button className="px-4 py-2 rounded font-bold text-black relative overflow-hidden group">
                        <div className="absolute inset-0 bg-[var(--active-gradient)] opacity-80 group-hover:opacity-100 transition-opacity" />
                        <span className="relative z-10">Gradient</span>
                      </button>
                      <input 
                        type="text" 
                        placeholder="Input Field" 
                        className="px-3 py-2 bg-[var(--color-background-secondary)] border border-[var(--color-border)] rounded text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Visual Settings (Only working ones) */}
              <div className="border border-[var(--color-border)] rounded-lg p-4 bg-[var(--color-background-secondary)]">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-sm font-bold text-[var(--color-text)] uppercase">Visual Settings</h2>
                  <button
                    onClick={resetToDefault}
                    className="flex items-center gap-1 px-2 py-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text)] text-[10px] uppercase transition-all"
                  >
                    <RotateCcw size={12} />
                    Reset Defaults
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-[var(--color-primary)] uppercase mb-2">
                      Font Size Base: {theme.visual.fontSize}px
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="20"
                      value={theme.visual.fontSize}
                      onChange={(e) => setTheme({ visual: { ...theme.visual, fontSize: parseInt(e.target.value) } })}
                      className="w-full h-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg appearance-none cursor-pointer accent-[var(--color-primary)]"
                    />
                    <p className="text-[10px] text-[var(--color-text-secondary)] mt-1">
                      Scales the entire UI text size.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[var(--color-primary)] uppercase mb-2">
                      Secondary Text Size: {getComputedStyle(document.documentElement).getPropertyValue('--font-size-secondary') || '11px'}
                    </label>
                    <input
                      type="range"
                      min="9"
                      max="16"
                      defaultValue={11}
                      onChange={(e) => document.documentElement.style.setProperty('--font-size-secondary', `${e.target.value}px`)}
                      className="w-full h-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg appearance-none cursor-pointer accent-[var(--color-primary)]"
                    />
                    <p className="text-[10px] text-[var(--color-text-secondary)] mt-1">
                      Scales secondary and small text elements.
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-[var(--color-primary)] uppercase mb-2">
                      Border Width: {theme.visual.borderWidth}px
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="4"
                      value={theme.visual.borderWidth}
                      onChange={(e) => setTheme({ visual: { ...theme.visual, borderWidth: parseInt(e.target.value) } })}
                      className="w-full h-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg appearance-none cursor-pointer accent-[var(--color-primary)]"
                    />
                    <p className="text-[10px] text-[var(--color-text-secondary)] mt-1">
                      Adjusts the thickness of UI borders.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[var(--color-primary)] uppercase mb-2">
                      Glow Intensity: {theme.visual.glowIntensity}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={theme.visual.glowIntensity}
                      onChange={(e) => setTheme({ visual: { ...theme.visual, glowIntensity: parseInt(e.target.value) } })}
                      className="w-full h-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg appearance-none cursor-pointer accent-[var(--color-primary)]"
                    />
                    <p className="text-[10px] text-[var(--color-text-secondary)] mt-1">
                      Controls the strength of neon glow effects.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* HOTKEYS TAB */}
          {activeTab === 'hotkeys' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-sm font-bold text-[var(--color-text)] uppercase">Keyboard Shortcuts</h2>
                <button
                  onClick={handleAddHotkey}
                  className="flex items-center gap-2 px-3 py-1.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/80 text-[var(--color-background)] rounded text-xs font-bold uppercase shadow-[var(--glow-primary)] transition-all"
                >
                  <Plus size={14} />
                  Add Hotkey
                </button>
              </div>

              <div className="space-y-2">
                {hotkeys.map((hotkey) => (
                  <div
                    key={hotkey.id}
                    className="flex items-center gap-4 bg-[var(--color-background-secondary)] p-3 rounded border border-[var(--color-border)] hover:border-[var(--color-primary)] transition-colors group"
                  >
                    <div className="flex-1">
                      <input
                        type="text"
                        value={hotkey.action}
                        onChange={(e) => handleUpdateHotkey(hotkey.id, 'action', e.target.value)}
                        className="w-full bg-transparent border-none text-[var(--color-text)] font-bold focus:outline-none"
                        placeholder="Action Name"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <input
                          type="text"
                          value={hotkey.keys}
                          onChange={(e) => handleUpdateHotkey(hotkey.id, 'keys', e.target.value)}
                          className="w-32 bg-[var(--color-background)] border border-[var(--color-border)] text-[var(--color-primary)] px-2 py-1 rounded text-center font-mono text-xs focus:border-[var(--color-primary)] focus:outline-none"
                          placeholder="Key Combo"
                        />
                      </div>
                      <button
                        onClick={() => handleDeleteHotkey(hotkey.id)}
                        className="p-1.5 text-[var(--color-text-secondary)] hover:text-[var(--color-error)] hover:bg-[var(--color-background)] rounded transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
                {hotkeys.length === 0 && (
                  <div className="text-center py-8 text-[var(--color-text-secondary)] italic">
                    No custom hotkeys defined.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* WORKSPACE TAB */}
          {activeTab === 'workspace' && (
            <WorkspaceSettings />
          )}

        </div>
      </div>
    </div>
  );
}