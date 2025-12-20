import React, { useState } from 'react';
import { 
  Settings, 
  Type, 
  Palette, 
  Box, 
  Copy, 
  Check, 
  Save,
  Monitor
} from 'lucide-react';

// --- THEME PRESETS (Required for the sidebar dropdown) ---

const darkTheme = {
  // Colors
  primaryColor: '#6366f1',
  secondaryColor: '#ec4899',
  backgroundColor: '#0f172a',
  surfaceColor: '#1e293b',
  textColor: '#f8fafc',
  mutedColor: '#94a3b8',
  borderColor: '#334155',

  // Gradients
  enableGradients: false,
  primaryGradient: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
  
  // Typography
  navFontSize: 14,
  smallFontSize: 14,
  baseFontSize: 16,
  h3FontSize: 20,
  h2FontSize: 32,
  h1FontSize: 48,
  
  lineHeight: 1.5,
  fontWeightNormal: 400,
  fontWeightBold: 700,

  // Borders & Shapes
  borderWidth: 1,
  borderRadius: 12,
  
  // Iconography
  iconSize: 24,
  iconStrokeWidth: 2,
  iconBgScale: 2.0,
  iconBgRadius: 12,
  iconFill: false,

  // Spacing
  spacingUnit: 4, 
  containerPadding: 32,
  
  // Effects
  shadowOpacity: 0.2,
  shadowBlur: 20,
};

const lightTheme = {
  ...darkTheme,
  backgroundColor: '#ffffff',
  surfaceColor: '#f8fafc',
  textColor: '#0f172a',
  mutedColor: '#64748b',
  borderColor: '#e2e8f0',
  shadowOpacity: 0.05,
  enableGradients: false,
};

const cyberTheme = {
  ...darkTheme,
  primaryColor: '#00ff9d',
  secondaryColor: '#00ccff',
  backgroundColor: '#000000',
  surfaceColor: '#111111',
  textColor: '#e0e0e0',
  borderColor: '#333333',
  borderWidth: 2,
  borderRadius: 0,
  iconBgRadius: 0,
  enableGradients: true,
  primaryGradient: 'linear-gradient(90deg, #00ff9d 0%, #00ccff 100%)',
  h1FontSize: 56,
  iconFill: true,
};

export const ThemeEditorPanel = () => {
  const [theme, setTheme] = useState(darkTheme);
  const [activeTab, setActiveTab] = useState('colors');
  const [copied, setCopied] = useState(false);
  
  // Theme Management State
  const [presets] = useState({
    'Default Dark': darkTheme,
    'Clean Light': lightTheme,
    'Cyberpunk': cyberTheme,
  });
  const [currentPresetName, setCurrentPresetName] = useState('Default Dark');

  const handleChange = (key: string, value: any) => {
    setTheme(prev => ({ ...prev, [key]: value }));
  };

  const handleLoadPreset = (name: string) => {
    if (presets[name as keyof typeof presets]) {
      setTheme(presets[name as keyof typeof presets]);
      setCurrentPresetName(name);
    }
  };

  const handleCopyCSS = () => {
    // Logic to generate the CSS string
    const cssString = `:root {
  --primary: ${theme.primaryColor};
  --bg: ${theme.backgroundColor};
  /* ... etc ... */
}`;
    navigator.clipboard.writeText(cssString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-full w-full bg-slate-900/95 backdrop-blur-2xl flex flex-col">
      {/* Panel Header & Theme Manager */}
      <div className="p-4 border-b border-slate-700 bg-slate-800/80 space-y-4">
        <div className="flex justify-between items-center">
           <h2 className="font-bold text-white flex items-center gap-2">
            <Settings size={18} className="text-indigo-400" />
            Theme Engine
          </h2>
          <button 
            onClick={handleCopyCSS}
            className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-md flex items-center gap-2 transition-colors font-medium"
          >
            {copied ? <Check size={14} /> : <Copy size={14}/>}
            {copied ? 'Copied' : 'Export'}
          </button>
        </div>

        {/* Theme Switcher */}
        <div className="flex gap-2">
          <select 
            value={currentPresetName}
            onChange={(e) => handleLoadPreset(e.target.value)}
            className="flex-1 bg-slate-900 border border-slate-600 text-slate-300 text-xs rounded-lg p-2 focus:ring-1 focus:ring-indigo-500 outline-none"
          >
            {Object.keys(presets).map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          <button 
            title="Save current as new theme"
            className="p-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors"
          >
            <Save size={16} />
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex p-2 gap-1 border-b border-slate-700 bg-slate-900 shrink-0">
         {[
            { id: 'type', icon: Type, label: 'Type' },
            { id: 'layout', icon: Box, label: 'Shape' },
            { id: 'colors', icon: Palette, label: 'Color' },
            { id: 'settings', icon: Monitor, label: 'Misc' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center py-2 rounded-lg transition-all ${
                activeTab === tab.id 
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30' 
                  : 'text-slate-500 hover:bg-slate-800 hover:text-slate-300'
              }`}
            >
              <tab.icon size={18} className="mb-1" />
              <span className="text-[10px] font-medium uppercase">{tab.label}</span>
            </button>
          ))}
      </div>

      {/* Scrollable Controls Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-8">
          
          {activeTab === 'colors' && (
            <div className="space-y-6 animate-fadeIn">
               <ControlGroup title="Mode & Gradients">
                  <Toggle 
                    label="Use Gradients" 
                    checked={theme.enableGradients} 
                    onChange={(v) => handleChange('enableGradients', v)} 
                  />
                  {theme.enableGradients && (
                     <div className="space-y-2 pt-2">
                        <label className="text-xs text-slate-400">Primary Gradient</label>
                        <input 
                          type="text" 
                          value={theme.primaryGradient}
                          onChange={(e) => handleChange('primaryGradient', e.target.value)}
                          className="w-full bg-slate-800 border border-slate-600 text-slate-300 text-xs rounded p-2 focus:border-indigo-500 outline-none"
                          placeholder="linear-gradient(...)"
                        />
                     </div>
                  )}
               </ControlGroup>

              <ControlGroup title="Brand Colors">
                <ColorInput label="Primary" value={theme.primaryColor} onChange={(v) => handleChange('primaryColor', v)} />
                <ColorInput label="Secondary" value={theme.secondaryColor} onChange={(v) => handleChange('secondaryColor', v)} />
              </ControlGroup>
              
              <ControlGroup title="Interface Colors">
                <ColorInput label="Background" value={theme.backgroundColor} onChange={(v) => handleChange('backgroundColor', v)} />
                <ColorInput label="Surface" value={theme.surfaceColor} onChange={(v) => handleChange('surfaceColor', v)} />
                <ColorInput label="Border" value={theme.borderColor} onChange={(v) => handleChange('borderColor', v)} />
              </ControlGroup>

              <ControlGroup title="Text Colors">
                <ColorInput label="Main Text" value={theme.textColor} onChange={(v) => handleChange('textColor', v)} />
                <ColorInput label="Muted Text" value={theme.mutedColor} onChange={(v) => handleChange('mutedColor', v)} />
              </ControlGroup>
            </div>
          )}

          {activeTab === 'type' && (
            <div className="space-y-6 animate-fadeIn">
              <ControlGroup title="Headings">
                <RangeInput label="H1 Size" value={theme.h1FontSize} min={24} max={96} unit="px" onChange={(v) => handleChange('h1FontSize', v)} />
                <RangeInput label="H2 Size" value={theme.h2FontSize} min={20} max={64} unit="px" onChange={(v) => handleChange('h2FontSize', v)} />
                <RangeInput label="H3 Size" value={theme.h3FontSize} min={16} max={48} unit="px" onChange={(v) => handleChange('h3FontSize', v)} />
              </ControlGroup>

              <ControlGroup title="Body & UI">
                <RangeInput label="Body Base" value={theme.baseFontSize} min={12} max={24} unit="px" onChange={(v) => handleChange('baseFontSize', v)} />
                <RangeInput label="Nav Links" value={theme.navFontSize} min={10} max={20} unit="px" onChange={(v) => handleChange('navFontSize', v)} />
                <RangeInput label="Small Text" value={theme.smallFontSize} min={10} max={16} unit="px" onChange={(v) => handleChange('smallFontSize', v)} />
              </ControlGroup>
              
              <ControlGroup title="Properties">
                 <RangeInput label="Line Height" value={theme.lineHeight} min={1} max={2} step={0.1} onChange={(v) => handleChange('lineHeight', v)} />
                 <SelectInput label="Bold Weight" value={theme.fontWeightBold} options={[600, 700, 800, 900]} onChange={(v) => handleChange('fontWeightBold', v)} />
              </ControlGroup>
            </div>
          )}

          {activeTab === 'layout' && (
            <div className="space-y-6 animate-fadeIn">
               <ControlGroup title="Global Shape">
                <RangeInput label="Border Radius" value={theme.borderRadius} min={0} max={32} unit="px" onChange={(v) => handleChange('borderRadius', v)} />
                <RangeInput label="Border Width" value={theme.borderWidth} min={0} max={4} unit="px" onChange={(v) => handleChange('borderWidth', v)} />
              </ControlGroup>

              <ControlGroup title="Icon Style">
                 <Toggle label="Fill Icons" checked={theme.iconFill} onChange={(v) => handleChange('iconFill', v)} />
                 <div className="h-2" />
                 <RangeInput label="Icon Size" value={theme.iconSize} min={16} max={48} unit="px" onChange={(v) => handleChange('iconSize', v)} />
                 <RangeInput label="Background Scale" value={theme.iconBgScale} min={1} max={3} step={0.1} unit="x" onChange={(v) => handleChange('iconBgScale', v)} />
                 <RangeInput label="Background Radius" value={theme.iconBgRadius} min={0} max={50} unit="px" onChange={(v) => handleChange('iconBgRadius', v)} />
                 <RangeInput label="Stroke Width" value={theme.iconStrokeWidth} min={0.5} max={3} step={0.5} unit="px" onChange={(v) => handleChange('iconStrokeWidth', v)} />
              </ControlGroup>
            </div>
          )}

          {activeTab === 'settings' && (
             <div className="space-y-6 animate-fadeIn">
              <ControlGroup title="Shadows & Depth">
                <RangeInput label="Blur Radius" value={theme.shadowBlur} min={0} max={100} unit="px" onChange={(v) => handleChange('shadowBlur', v)} />
                <RangeInput label="Opacity" value={theme.shadowOpacity} min={0} max={1} step={0.05} onChange={(v) => handleChange('shadowOpacity', v)} />
              </ControlGroup>
              
              <ControlGroup title="Spacing System">
                 <RangeInput label="Base Unit" value={theme.spacingUnit} min={2} max={12} unit="px" onChange={(v) => handleChange('spacingUnit', v)} />
                 <RangeInput label="Internal Padding" value={theme.containerPadding} min={12} max={64} unit="px" onChange={(v) => handleChange('containerPadding', v)} />
              </ControlGroup>
             </div>
          )}
      </div>
    </div>
  );
};

// --- Helper Components (Required for Sidebar) ---

const ControlGroup = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-3 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
    <h3 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2">
      <span className="w-1 h-1 rounded-full bg-indigo-400"></span>
      {title}
    </h3>
    <div className="space-y-4 pt-1">
      {children}
    </div>
  </div>
);

const ColorInput = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
  <div className="flex items-center justify-between group">
    <label className="text-xs text-slate-300 font-medium group-hover:text-white transition-colors">{label}</label>
    <div className="flex items-center gap-2">
      <div 
        className="w-10 h-6 rounded border border-slate-600 cursor-pointer relative overflow-hidden shadow-sm hover:border-indigo-500 transition-colors"
        style={{ backgroundColor: value }}
      >
        <input 
          type="color" 
          value={value} 
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
        />
      </div>
    </div>
  </div>
);

const RangeInput = ({ label, value, min, max, step = 1, unit = '', onChange }: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
}) => (
  <div className="space-y-2">
    <div className="flex justify-between items-center">
      <label className="text-xs text-slate-300 font-medium">{label}</label>
      <span className="text-[10px] font-mono text-indigo-300 bg-indigo-900/30 px-2 py-0.5 rounded border border-indigo-500/20">
        {value}{unit}
      </span>
    </div>
    <input 
      type="range" 
      min={min} 
      max={max} 
      step={step}
      value={value} 
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400"
    />
  </div>
);

const SelectInput = ({ label, value, options, onChange }: {
  label: string;
  value: number;
  options: number[];
  onChange: (v: number) => void;
}) => (
  <div className="flex items-center justify-between">
    <label className="text-xs text-slate-300 font-medium">{label}</label>
    <select 
      value={value}
      onChange={(e) => onChange(parseInt(e.target.value))}
      className="bg-slate-900 border border-slate-600 text-slate-300 text-xs rounded focus:ring-1 focus:ring-indigo-500 block p-1 px-2 outline-none"
    >
      {options.map(opt => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  </div>
);

const Toggle = ({ label, checked, onChange }: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) => (
  <div className="flex items-center justify-between cursor-pointer" onClick={() => onChange(!checked)}>
    <label className="text-xs text-slate-300 font-medium pointer-events-none">{label}</label>
    <div className={`w-9 h-5 flex items-center rounded-full p-1 transition-colors ${checked ? 'bg-indigo-500' : 'bg-slate-700'}`}>
      <div className={`bg-white w-3 h-3 rounded-full shadow-sm transform transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
    </div>
  </div>
);
