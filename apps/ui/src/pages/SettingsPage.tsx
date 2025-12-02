import { useState } from 'react';
import { Keyboard, Palette, Save, Plus, Trash2, Edit2 } from 'lucide-react';

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
    background: string;
  };
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'hotkeys' | 'colors'>('hotkeys');
  
  // Hotkeys State
  const [hotkeys, setHotkeys] = useState<Hotkey[]>([
    { id: '1', action: 'Run Agent', keys: 'Ctrl+Enter' },
    { id: '2', action: 'Toggle Settings', keys: 'Ctrl+,' },
    { id: '3', action: 'New Card', keys: 'Ctrl+N' },
    { id: '4', action: 'Focus Next Column', keys: 'Ctrl+Tab' },
    { id: '5', action: 'Focus Previous Column', keys: 'Ctrl+Shift+Tab' },
  ]);
  
  const [editingHotkey, setEditingHotkey] = useState<string | null>(null);

  // Color Schemes State
  const [colorSchemes, setColorSchemes] = useState<ColorScheme[]>([
    {
      id: '1',
      name: 'Neon Cyberpunk',
      colors: {
        primary: '#00FFFF',
        secondary: '#FF00FF',
        accent: '#00FF00',
        background: '#000000',
      },
    },
    {
      id: '2',
      name: 'Sunset Glow',
      colors: {
        primary: '#FF6600',
        secondary: '#FFFF00',
        accent: '#FF00FF',
        background: '#1a1a1a',
      },
    },
  ]);
  
  const [selectedScheme, setSelectedScheme] = useState<string>('1');
  const [editingScheme, setEditingScheme] = useState<string | null>(null);

  const handleSaveHotkeys = () => {
    localStorage.setItem('customHotkeys', JSON.stringify(hotkeys));
    alert('Hotkeys saved!');
  };

  const handleAddHotkey = () => {
    const newHotkey: Hotkey = {
      id: String(Date.now()),
      action: 'New Action',
      keys: 'Ctrl+?',
    };
    setHotkeys([...hotkeys, newHotkey]);
    setEditingHotkey(newHotkey.id);
  };

  const handleDeleteHotkey = (id: string) => {
    setHotkeys(hotkeys.filter(h => h.id !== id));
  };

  const handleSaveColorScheme = () => {
    localStorage.setItem('colorSchemes', JSON.stringify(colorSchemes));
    localStorage.setItem('selectedScheme', selectedScheme);
    alert('Color scheme saved!');
  };

  const handleAddColorScheme = () => {
    const newScheme: ColorScheme = {
      id: String(Date.now()),
      name: 'New Scheme',
      colors: {
        primary: '#FFFFFF',
        secondary: '#CCCCCC',
        accent: '#999999',
        background: '#000000',
      },
    };
    setColorSchemes([...colorSchemes, newScheme]);
    setEditingScheme(newScheme.id);
  };

  const handleDeleteColorScheme = (id: string) => {
    setColorSchemes(colorSchemes.filter(s => s.id !== id));
    if (selectedScheme === id) {
      setSelectedScheme(colorSchemes[0]?.id || '');
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-black text-zinc-200 overflow-hidden font-mono">
      {/* Header */}
      <div className="flex-none h-12 bg-zinc-950 border-b border-zinc-900 flex items-center justify-between px-4">
        <h1 className="text-lg font-bold text-purple-400 uppercase tracking-widest">Settings</h1>
        
        {/* Tab Switcher */}
        <div className="flex bg-zinc-900 rounded p-1 border border-zinc-800">
          <button
            onClick={() => setActiveTab('hotkeys')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded text-xs font-bold uppercase transition-all ${
              activeTab === 'hotkeys'
                ? 'bg-cyan-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.6)]'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Keyboard size={14} />
            Hotkeys
          </button>
          <button
            onClick={() => setActiveTab('colors')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded text-xs font-bold uppercase transition-all ${
              activeTab === 'colors'
                ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.6)]'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Palette size={14} />
            Colors
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'hotkeys' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-zinc-400 uppercase">Keyboard Shortcuts</h2>
              <div className="flex gap-2">
                <button
                  onClick={handleAddHotkey}
                  className="flex items-center gap-2 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-bold uppercase shadow-[0_0_15px_rgba(6,182,212,0.6)] transition-all"
                >
                  <Plus size={14} />
                  Add
                </button>
                <button
                  onClick={handleSaveHotkeys}
                  className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded text-xs font-bold uppercase shadow-[0_0_15px_rgba(34,197,94,0.6)] transition-all"
                >
                  <Save size={14} />
                  Save
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {hotkeys.map(hotkey => (
                <div key={hotkey.id} className="flex items-center gap-3 bg-zinc-950 border border-zinc-800 rounded p-3">
                  <input
                    type="text"
                    value={hotkey.action}
                    onChange={(e) => {
                      setHotkeys(hotkeys.map(h => 
                        h.id === hotkey.id ? { ...h, action: e.target.value } : h
                      ));
                    }}
                    className="flex-1 bg-black border border-zinc-700 text-white text-sm px-3 py-2 rounded focus:border-cyan-500 focus:outline-none"
                    placeholder="Action name"
                  />
                  <input
                    type="text"
                    value={hotkey.keys}
                    onChange={(e) => {
                      setHotkeys(hotkeys.map(h => 
                        h.id === hotkey.id ? { ...h, keys: e.target.value } : h
                      ));
                    }}
                    className="w-40 bg-black border border-zinc-700 text-cyan-400 text-sm px-3 py-2 rounded font-mono focus:border-cyan-500 focus:outline-none"
                    placeholder="Ctrl+?"
                  />
                  <button
                    onClick={() => handleDeleteHotkey(hotkey.id)}
                    className="p-2 text-zinc-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'colors' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-zinc-400 uppercase">Color Schemes</h2>
              <div className="flex gap-2">
                <button
                  onClick={handleAddColorScheme}
                  className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded text-xs font-bold uppercase shadow-[0_0_15px_rgba(168,85,247,0.6)] transition-all"
                >
                  <Plus size={14} />
                  Add
                </button>
                <button
                  onClick={handleSaveColorScheme}
                  className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded text-xs font-bold uppercase shadow-[0_0_15px_rgba(34,197,94,0.6)] transition-all"
                >
                  <Save size={14} />
                  Save
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {colorSchemes.map(scheme => (
                <div
                  key={scheme.id}
                  className={`bg-zinc-950 border-2 rounded p-4 cursor-pointer transition-all ${
                    selectedScheme === scheme.id
                      ? 'border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.4)]'
                      : 'border-zinc-800 hover:border-zinc-700'
                  }`}
                  onClick={() => setSelectedScheme(scheme.id)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <input
                      type="text"
                      value={scheme.name}
                      onChange={(e) => {
                        setColorSchemes(colorSchemes.map(s =>
                          s.id === scheme.id ? { ...s, name: e.target.value } : s
                        ));
                      }}
                      className="bg-transparent border-none text-white text-sm font-bold focus:outline-none"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingScheme(scheme.id);
                        }}
                        className="p-1 text-zinc-500 hover:text-cyan-400 transition-colors"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteColorScheme(scheme.id);
                        }}
                        className="p-1 text-zinc-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(scheme.colors).map(([key, value]) => (
                      <div key={key} className="space-y-1">
                        <label className="text-[9px] text-zinc-500 uppercase">{key}</label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={value}
                            onChange={(e) => {
                              setColorSchemes(colorSchemes.map(s =>
                                s.id === scheme.id
                                  ? { ...s, colors: { ...s.colors, [key]: e.target.value } }
                                  : s
                              ));
                            }}
                            className="w-8 h-8 rounded cursor-pointer"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <input
                            type="text"
                            value={value}
                            onChange={(e) => {
                              setColorSchemes(colorSchemes.map(s =>
                                s.id === scheme.id
                                  ? { ...s, colors: { ...s.colors, [key]: e.target.value } }
                                  : s
                              ));
                            }}
                            className="flex-1 bg-black border border-zinc-700 text-white text-xs px-2 py-1 rounded font-mono focus:border-purple-500 focus:outline-none"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}