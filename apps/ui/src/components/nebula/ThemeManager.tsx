import React, { useState, useEffect } from 'react';
import { 
  Palette, Type, Save, Trash2, Image as ImageIcon, LayoutTemplate 
} from 'lucide-react';
import { useThemeContext } from '../../theme/ThemeProvider.js';
import { ThemeStorage } from '../../theme/ThemeStorage.js';
import type { Theme } from '../../theme/types.js';
import { TokenIcon } from './TokenIcon.js'; // Your dynamic icon component

import type { LucideIcon } from 'lucide-react';

// --- Sub-components for cleanliness ---
const SectionHeader = ({ icon: Icon, title }: { icon: LucideIcon, title: string }) => (
  <div className="flex items-center gap-2 mb-4 pb-2 border-b border-zinc-800">
    <Icon size={16} className="text-indigo-400" />
    <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">{title}</span>
  </div>
);

const InputGroup = ({ label, children }: { label: string, children: React.ReactNode }) => (
  <div className="space-y-1">
    <label className="text-[10px] uppercase font-bold text-zinc-500">{label}</label>
    {children}
  </div>
);

export const ThemeManager = () => {
  const { theme, setTheme } = useThemeContext();
  const [savedThemes, setSavedThemes] = useState<Theme[]>([]);
  const [activeTab, setActiveTab] = useState<'visual' | 'fonts' | 'icons' | 'library' | 'components'>('visual');

  // Load themes on mount
  useEffect(() => {
    setSavedThemes(ThemeStorage.getAll());
  }, []);

  // --- Handlers ---

  const handleSave = () => {
    const newTheme = { ...theme, id: `custom-${Date.now()}`, name: `${theme.name} (Copy)`, timestamp: Date.now() };
    ThemeStorage.save(newTheme);
    setSavedThemes(ThemeStorage.getAll());
    setTheme(newTheme); // Switch to the new saved copy
  };

  const handleLoad = (t: Theme) => {
    setTheme(t);
  };

  const handleFontImport = (url: string) => {
    if (!url) return;
    // 1. Add to theme state
    const newUrls = [...(theme.assets.fonts.urls || []), url];
    setTheme({
      assets: {
        ...theme.assets,
        fonts: { ...theme.assets.fonts, urls: newUrls }
      }
    });
    // 2. Inject immediately for live preview
    const link = document.createElement('link');
    link.href = url;
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  };

  return (
    <div className="flex h-full bg-zinc-950 text-zinc-200 overflow-hidden rounded-xl border border-zinc-800">
      
      {/* Sidebar: Tabs */}
      <div className="w-16 flex flex-col items-center py-4 gap-4 border-r border-zinc-800 bg-zinc-900/50">
        {[
          { id: 'visual' as const, icon: Palette, label: 'Visual' },
          { id: 'components' as const, icon: LayoutTemplate, label: 'Components' },
          { id: 'fonts' as const, icon: Type, label: 'Fonts' },
          { id: 'icons' as const, icon: ImageIcon, label: 'Icons' },
          { id: 'library' as const, icon: Save, label: 'Library' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`p-3 rounded-xl transition-all ${
              activeTab === tab.id 
                ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' 
                : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'
            }`}
            title={tab.label}
          >
            <tab.icon size={20} />
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Header */}
        <div className="h-14 border-b border-zinc-800 flex items-center justify-between px-6 bg-zinc-900/30">
          <div>
            <h2 className="font-bold text-sm text-white">{theme.name}</h2>
            <p className="text-[10px] text-zinc-500 font-mono">{theme.id}</p>
          </div>
          <div className="flex gap-2">
             <button onClick={handleSave} className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded text-xs transition-colors">
               <Save size={14} /> Save As New
             </button>
          </div>
        </div>

        {/* Scrollable Editor Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">

          {/* === TAB: VISUAL (Colors & Gradients) === */}
          {activeTab === 'visual' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <SectionHeader icon={Palette} title="Colors & Gradients" />
              
              <div className="grid grid-cols-2 gap-4">
                <InputGroup label="Primary Color">
                  <div className="flex gap-2">
                    <input type="color" value={theme.colors.primary} 
                      onChange={e => setTheme({ colors: { ...theme.colors, primary: e.target.value } })}
                      className="h-8 w-8 rounded cursor-pointer bg-transparent border-none" 
                    />
                    <input type="text" value={theme.colors.primary} className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-2 text-xs font-mono text-zinc-300" readOnly />
                  </div>
                </InputGroup>
                
                <InputGroup label="Background">
                   <input type="color" value={theme.colors.background} 
                      onChange={e => setTheme({ colors: { ...theme.colors, background: e.target.value } })}
                      className="h-8 w-8 rounded cursor-pointer bg-transparent border-none" 
                    />
                </InputGroup>
              </div>

              <div className="pt-4 border-t border-zinc-800">
                <InputGroup label="Global Gradient (CSS)">
                   <textarea 
                      value={theme.gradients.primary}
                      onChange={e => setTheme({ gradients: { ...theme.gradients, primary: e.target.value, enabled: true } })}
                      className="w-full h-20 bg-zinc-900 border border-zinc-700 rounded p-3 text-xs font-mono text-zinc-300 focus:border-indigo-500 outline-none"
                      placeholder="linear-gradient(135deg, ...)"
                   />
                   <div className="mt-2 h-8 w-full rounded" style={{ background: theme.gradients.primary }}></div>
                </InputGroup>
              </div>
            </div>
          )}

          {/* === TAB: COMPONENTS (Physics & Layout) === */}
          {activeTab === 'components' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <SectionHeader icon={LayoutTemplate} title="Component Physics" />
              
              <h3 className="text-xs font-bold text-zinc-400 mt-4">Menu Bar</h3>
              <div className="grid grid-cols-2 gap-4">
                 <InputGroup label="Height">
                    <input type="text" 
                       value={theme.components.menuBar.height}
                       onChange={e => setTheme({ ...theme, components: { ...theme.components, menuBar: { ...theme.components.menuBar, height: e.target.value } } })}
                       className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs"
                    />
                 </InputGroup>
                 <InputGroup label="Background (RGBA)">
                    <input type="text" 
                       value={theme.components.menuBar.background}
                       onChange={e => setTheme({ ...theme, components: { ...theme.components, menuBar: { ...theme.components.menuBar, background: e.target.value } } })}
                       className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs"
                    />
                 </InputGroup>
              </div>

              <h3 className="text-xs font-bold text-zinc-400 mt-4">Floating Navigation</h3>
              <div className="grid grid-cols-2 gap-4">
                 <InputGroup label="Button Size">
                    <input type="text" 
                       value={theme.components.floatingNav.buttonSize}
                       onChange={e => setTheme({ ...theme, components: { ...theme.components, floatingNav: { ...theme.components.floatingNav, buttonSize: e.target.value } } })}
                       className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs"
                    />
                 </InputGroup>
                 <InputGroup label="Border Radius">
                    <input type="text" 
                       value={theme.components.floatingNav.radius}
                       onChange={e => setTheme({ ...theme, components: { ...theme.components, floatingNav: { ...theme.components.floatingNav, radius: e.target.value } } })}
                       className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs"
                    />
                 </InputGroup>
                  <InputGroup label="Bottom Offset">
                    <input type="text" 
                       value={theme.components.floatingNav.offsetBottom}
                       onChange={e => setTheme({ ...theme, components: { ...theme.components, floatingNav: { ...theme.components.floatingNav, offsetBottom: e.target.value } } })}
                       className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs"
                    />
                 </InputGroup>
              </div>
            </div>
          )}

          {/* === TAB: FONTS (Import & Assign) === */}
          {activeTab === 'fonts' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <SectionHeader icon={Type} title="Typography System" />

              {/* 1. Import */}
              <div className="bg-zinc-900/50 p-4 rounded-lg border border-zinc-800 space-y-3">
                 <h4 className="text-xs font-bold text-zinc-300">Import Web Font</h4>
                 <div className="flex gap-2">
                    <input id="fontUrl" type="text" placeholder="https://fonts.googleapis.com/css2?family=..." 
                       className="flex-1 bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-xs text-white"
                    />
                    <button 
                       onClick={() => handleFontImport((document.getElementById('fontUrl') as HTMLInputElement).value)}
                       className="px-3 bg-indigo-600 hover:bg-indigo-500 rounded text-xs font-bold text-white"
                    >
                      Import
                    </button>
                 </div>
                 <div className="text-[10px] text-zinc-500">Supported: Google Fonts, Adobe Typekit, or direct .woff2 URL.</div>
              </div>

              {/* 2. Assign */}
              <div className="grid grid-cols-1 gap-4">
                 {(['heading', 'body', 'mono'] as const).map(variant => (
                   <InputGroup key={variant} label={`${variant} Font Family`}>
                      <input 
                        type="text" 
                        value={theme.assets.fonts.mappings[variant]} 
                        onChange={e => setTheme({
                          assets: {
                             ...theme.assets,
                             fonts: {
                               ...theme.assets.fonts,
                               mappings: { ...theme.assets.fonts.mappings, [variant]: e.target.value }
                             }
                          }
                        })}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-xs text-white"
                        placeholder="e.g. 'Inter', sans-serif"
                      />
                   </InputGroup>
                 ))}
              </div>
            </div>
          )}

          {/* === TAB: ICONS (Variable Mapping) === */}
          {activeTab === 'icons' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
               <SectionHeader icon={ImageIcon} title="Icon Token Map" />
               <p className="text-xs text-zinc-500 mb-4 font-medium">
                 Map semantic actions (e.g. "action.save") to specific icons. 
                 Paste an SVG path to override the default.
               </p>

               {Object.entries(theme.assets.icons.tokenMap).map(([token, iconName]) => (
                 <div key={token} className="flex items-center gap-4 p-3 bg-zinc-900/30 border border-zinc-800 rounded-lg group hover:border-zinc-700 transition-colors">
                    <div className="w-8 h-8 flex items-center justify-center bg-zinc-800 rounded text-indigo-400 group-hover:bg-indigo-500/10">
                       <TokenIcon token={token} size={16} />
                    </div>
                    <div className="flex-1">
                       <div className="text-xs font-bold text-zinc-300">{token}</div>
                       <input 
                         type="text" 
                         value={iconName}
                         onChange={e => setTheme({
                           assets: {
                             ...theme.assets,
                             icons: {
                               ...theme.assets.icons,
                               tokenMap: { ...theme.assets.icons.tokenMap, [token]: e.target.value }
                             }
                           }
                         })}
                         className="w-full mt-1 bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-[10px] font-mono text-zinc-400 focus:border-indigo-500 outline-none"
                       />
                    </div>
                 </div>
               ))}
               
               <button className="w-full py-2 border border-dashed border-zinc-800 text-zinc-500 text-xs rounded hover:bg-zinc-900 transition-colors">
                 + Add Custom SVG Token
               </button>
            </div>
          )}

          {/* === TAB: LIBRARY (Save/Load) === */}
          {activeTab === 'library' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
               <SectionHeader icon={Save} title="Theme Library" />
               
               <div className="grid grid-cols-1 gap-3">
                 {savedThemes.map(t => (
                   <div 
                     key={t.id}
                     onClick={() => handleLoad(t)}
                     className={`group flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                       theme.id === t.id 
                         ? 'bg-indigo-500/10 border-indigo-500/50' 
                         : 'bg-zinc-900/30 border-zinc-800 hover:bg-zinc-800'
                     }`}
                   >
                      <div className="flex items-center gap-4">
                         <div className="w-10 h-10 rounded-lg shadow-sm border border-white/10" style={{ background: t.gradients.enabled ? t.gradients.primary : t.colors.primary }}></div>
                         <div>
                            <div className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors uppercase tracking-tight">{t.name}</div>
                            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">{t.mode}</div>
                         </div>
                      </div>
                      
                      {t.id.startsWith('custom-') && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); ThemeStorage.delete(t.id); setSavedThemes(ThemeStorage.getAll()); }}
                          className="p-2 text-zinc-600 hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                   </div>
                 ))}
               </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
