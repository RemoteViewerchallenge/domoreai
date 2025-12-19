import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Type, 
  Palette, 
  Box, 
  Layout, 
  Copy, 
  Check, 
  Zap, 
  X,
  Shield,
  CreditCard,
  Save,
  Trash2,
  Moon,
  Sun,
  Monitor,
  ArrowRight
} from 'lucide-react';

// --- THEME PRESETS ---

const darkTheme = {
  // Colors
  primaryColor: '#6366f1', // Indigo
  secondaryColor: '#ec4899', // Pink
  backgroundColor: '#0f172a', // Slate-900
  surfaceColor: '#1e293b', // Slate-800
  textColor: '#f8fafc', // Slate-50
  mutedColor: '#94a3b8', // Slate-400
  borderColor: '#334155', // Slate-700

  // Gradients
  enableGradients: false,
  primaryGradient: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', // Indigo to Purple
  
  // Typography (Granular)
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
  iconBgScale: 2.0, // Size of background relative to icon
  iconBgRadius: 12, // Radius of icon background
  iconFill: false, // Fill icons?

  // Spacing & Layout
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

// --- APP COMPONENT ---

const App = () => {
  const [theme, setTheme] = useState(darkTheme);
  const [activeTab, setActiveTab] = useState('colors');
  const [copied, setCopied] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  
  // Theme Management State
  const [presets, setPresets] = useState({
    'Default Dark': darkTheme,
    'Clean Light': lightTheme,
    'Cyberpunk': cyberTheme,
  });
  const [currentPresetName, setCurrentPresetName] = useState('Default Dark');

  const handleChange = (key, value) => {
    setTheme(prev => ({ ...prev, [key]: value }));
  };

  const handleLoadPreset = (name) => {
    if (presets[name]) {
      setTheme(presets[name]);
      setCurrentPresetName(name);
    }
  };

  const handleSaveTheme = () => {
    const name = `Custom ${Object.keys(presets).length + 1}`;
    setPresets(prev => ({ ...prev, [name]: theme }));
    setCurrentPresetName(name);
  };

  // Generate CSS Variables
  const pageStyles = {
    // Colors
    '--color-primary': theme.primaryColor,
    '--color-secondary': theme.secondaryColor,
    '--color-bg': theme.backgroundColor,
    '--color-surface': theme.surfaceColor,
    '--color-text': theme.textColor,
    '--color-muted': theme.mutedColor,
    '--color-border': theme.borderColor,
    
    // Backgrounds (Solid or Gradient)
    '--bg-primary': theme.enableGradients ? theme.primaryGradient : theme.primaryColor,
    
    // Typography
    '--font-size-nav': `${theme.navFontSize}px`,
    '--font-size-small': `${theme.smallFontSize}px`,
    '--font-size-base': `${theme.baseFontSize}px`,
    '--font-size-h1': `${theme.h1FontSize}px`,
    '--font-size-h2': `${theme.h2FontSize}px`,
    '--font-size-h3': `${theme.h3FontSize}px`,
    
    '--font-weight-normal': theme.fontWeightNormal,
    '--font-weight-bold': theme.fontWeightBold,
    '--line-height': theme.lineHeight,

    // Borders
    '--border-width': `${theme.borderWidth}px`,
    '--border-radius': `${theme.borderRadius}px`,
    
    // Icons
    '--icon-size': `${theme.iconSize}px`,
    '--icon-stroke': `${theme.iconStrokeWidth}px`,
    '--icon-bg-width': `${theme.iconSize * theme.iconBgScale}px`,
    '--icon-bg-radius': `${theme.iconBgRadius}px`,
    
    // Spacing
    '--spacing-unit': `${theme.spacingUnit}px`,
    '--container-padding': `${theme.containerPadding}px`,
    
    // Effects
    '--shadow': `0 10px ${theme.shadowBlur}px -5px rgba(0,0,0,${theme.shadowOpacity})`,
  };

  const handleCopyCSS = () => {
    const cssString = `:root {
  /* Generated Theme Variables */
  --bg-primary: ${theme.enableGradients ? theme.primaryGradient : theme.primaryColor};
  --color-bg: ${theme.backgroundColor};
  --color-surface: ${theme.surfaceColor};
  --color-text: ${theme.textColor};
  --font-h1: ${theme.h1FontSize}px;
  --font-base: ${theme.baseFontSize}px;
  --radius: ${theme.borderRadius}px;
  /* ... copy full object for production */
}`;
    navigator.clipboard.writeText(cssString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div 
      style={pageStyles}
      className="min-h-screen relative transition-colors duration-200 font-sans"
    >
      {/* LIVE PREVIEW AREA */}
      <div 
        style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }} 
        className="min-h-screen w-full flex flex-col transition-colors duration-300"
      >
        {/* Navigation */}
        <nav 
          style={{ 
            borderColor: 'var(--color-border)', 
            borderBottomWidth: 'var(--border-width)',
            background: theme.enableGradients 
              ? `linear-gradient(to bottom, ${theme.surfaceColor}cc, ${theme.backgroundColor}cc)` 
              : 'var(--color-bg)',
            padding: 'var(--spacing-unit) calc(var(--spacing-unit) * 6)'
          }}
          className="w-full flex items-center justify-between backdrop-blur-md sticky top-0 z-10"
        >
          <div className="flex items-center gap-3">
            <div 
              className="flex items-center justify-center shadow-lg"
              style={{ 
                background: 'var(--bg-primary)', 
                borderRadius: 'var(--icon-bg-radius)',
                width: 'calc(var(--icon-size) * 1.5)',
                height: 'calc(var(--icon-size) * 1.5)',
              }}
            >
              <Zap color="white" size={20} fill={theme.iconFill ? "white" : "none"} />
            </div>
            <span style={{ fontWeight: 'var(--font-weight-bold)', fontSize: 'var(--font-size-h3)' }}>ThemeGen</span>
          </div>
          <div className="hidden md:flex gap-8 items-center" style={{ fontSize: 'var(--font-size-nav)', fontWeight: 500 }}>
            {['Products', 'Solutions', 'Pricing', 'Docs'].map(item => (
               <a href="#" key={item} style={{ color: 'var(--color-muted)' }} className="hover:opacity-80 transition-opacity">
                 {item}
               </a>
            ))}
          </div>
          <div className="flex items-center gap-4">
            <button 
              style={{ 
                padding: 'calc(var(--spacing-unit) * 2) calc(var(--spacing-unit) * 4)',
                borderRadius: 'var(--border-radius)',
                border: 'var(--border-width) solid var(--color-border)',
                fontSize: 'var(--font-size-nav)',
                fontWeight: 'var(--font-weight-bold)'
               }}
            >
              Log In
            </button>
            <button 
              className="shadow-lg hover:opacity-90 transition-opacity"
              style={{ 
                padding: 'calc(var(--spacing-unit) * 2) calc(var(--spacing-unit) * 4)',
                borderRadius: 'var(--border-radius)',
                background: 'var(--bg-primary)',
                color: '#fff',
                fontSize: 'var(--font-size-nav)',
                fontWeight: 'var(--font-weight-bold)'
               }}
            >
              Sign Up
            </button>
          </div>
        </nav>

        {/* Hero Section */}
        <div className="flex flex-col items-center justify-center text-center px-4 pt-24 pb-20 max-w-5xl mx-auto">
          <div 
            className="inline-flex items-center gap-2 px-3 py-1 mb-6 rounded-full border"
            style={{ 
              backgroundColor: 'var(--color-surface)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-secondary)',
              fontSize: 'var(--font-size-small)'
            }}
          >
            <span className="w-2 h-2 rounded-full bg-current animate-pulse"/>
            v2.0 Now Available
          </div>

          <h1 
            style={{ 
              fontSize: 'var(--font-size-h1)', 
              fontWeight: 'var(--font-weight-bold)',
              lineHeight: 1.1,
              marginBottom: 'calc(var(--spacing-unit) * 6)'
            }}
          >
             Design without <br/>
            <span 
              style={{ 
                background: theme.enableGradients ? theme.primaryGradient : 'var(--color-primary)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Limits.
            </span>
          </h1>
          <p 
            style={{ 
              fontSize: 'var(--font-size-h3)', 
              color: 'var(--color-muted)',
              maxWidth: '60ch',
              lineHeight: 'var(--line-height)',
              marginBottom: 'calc(var(--spacing-unit) * 8)'
            }}
          >
            Total control over every pixel. Adjust typography scales, component shapes, and color gradients in real-time.
          </p>
          <div className="flex gap-4">
             <button 
              className="shadow-xl hover:-translate-y-0.5 transition-transform"
              style={{ 
                padding: 'calc(var(--spacing-unit) * 3) calc(var(--spacing-unit) * 8)',
                borderRadius: 'var(--border-radius)',
                background: 'var(--bg-primary)',
                color: '#fff',
                fontSize: 'var(--font-size-base)',
                fontWeight: 'var(--font-weight-bold)',
                boxShadow: 'var(--shadow)'
               }}
            >
              Start Building
            </button>
             <button 
              style={{ 
                padding: 'calc(var(--spacing-unit) * 3) calc(var(--spacing-unit) * 6)',
                borderRadius: 'var(--border-radius)',
                backgroundColor: 'transparent',
                border: 'var(--border-width) solid var(--color-border)',
                color: 'var(--color-text)',
                fontSize: 'var(--font-size-base)',
                fontWeight: 'var(--font-weight-bold)'
               }}
            >
              Documentation
            </button>
          </div>
        </div>

        {/* Feature Grid */}
        <div 
          className="grid grid-cols-1 md:grid-cols-3 gap-8 px-8 max-w-7xl mx-auto w-full pb-24"
          style={{ padding: 'var(--container-padding)' }}
        >
          {[
            { icon: Shield, title: "Secure Architecture", desc: "Enterprise-grade security built into every component." },
            { icon: Layout, title: "Responsive Core", desc: "Fluid layouts that adapt to any viewport size instantly." },
            { icon: CreditCard, title: "Payment Ready", desc: "Seamless integration with major payment processors." }
          ].map((item, i) => (
            <div 
              key={i}
              className="group transition-all hover:-translate-y-1"
              style={{ 
                backgroundColor: 'var(--color-surface)',
                borderRadius: 'var(--border-radius)',
                border: 'var(--border-width) solid var(--color-border)',
                padding: 'var(--container-padding)',
                boxShadow: 'var(--shadow)'
              }}
            >
              <div 
                style={{ 
                  width: 'var(--icon-bg-width)',
                  height: 'var(--icon-bg-width)',
                  background: 'var(--color-bg)',
                  borderRadius: 'var(--icon-bg-radius)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 'calc(var(--spacing-unit) * 4)',
                  color: 'var(--color-primary)',
                  border: '1px solid var(--color-border)'
                }}
              >
                <item.icon 
                  size={theme.iconSize} 
                  strokeWidth={theme.iconStrokeWidth} 
                  fill={theme.iconFill ? theme.primaryColor : "none"} 
                  className={theme.iconFill ? "opacity-90" : ""}
                />
              </div>
              <h3 style={{ fontSize: 'var(--font-size-h3)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--spacing-unit)' }}>
                {item.title}
              </h3>
              <p style={{ color: 'var(--color-muted)', lineHeight: 'var(--line-height)', fontSize: 'var(--font-size-base)' }}>
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* --- HUD / SETTINGS PANEL --- */}
      <div 
        className={`fixed top-4 right-4 bottom-4 w-96 bg-slate-900/95 backdrop-blur-2xl border border-slate-700 shadow-2xl z-50 rounded-2xl flex flex-col transition-transform duration-300 ${isPanelOpen ? 'translate-x-0' : 'translate-x-[calc(100%+16px)]'}`}
      >
        {/* Panel Toggle */}
        <button 
          onClick={() => setIsPanelOpen(!isPanelOpen)}
          className="absolute left-0 top-6 -translate-x-full bg-indigo-600 p-3 rounded-l-xl shadow-lg text-white hover:bg-indigo-500 transition-colors"
        >
          {isPanelOpen ? <X size={20} /> : <Settings size={20} />}
        </button>

        {/* Panel Header & Theme Manager */}
        <div className="p-4 border-b border-slate-700 bg-slate-800/80 rounded-t-2xl space-y-4">
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
              className="flex-1 bg-slate-900 border border-slate-600 text-slate-300 text-xs rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
            >
              {Object.keys(presets).map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            <button 
              onClick={handleSaveTheme}
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

        {/* Scrollable Controls */}
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
                            className="w-full bg-slate-800 border border-slate-600 text-slate-300 text-xs rounded p-2"
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
    </div>
  );
};

// --- Helper Components ---

const ControlGroup = ({ title, children }) => (
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

const ColorInput = ({ label, value, onChange }) => (
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

const RangeInput = ({ label, value, min, max, step = 1, unit = '', onChange }) => (
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

const SelectInput = ({ label, value, options, onChange }) => (
  <div className="flex items-center justify-between">
    <label className="text-xs text-slate-300 font-medium">{label}</label>
    <select 
      value={value}
      onChange={(e) => onChange(parseInt(e.target.value))}
      className="bg-slate-900 border border-slate-600 text-slate-300 text-xs rounded focus:ring-1 focus:ring-indigo-500 block p-1 px-2"
    >
      {options.map(opt => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  </div>
);

const Toggle = ({ label, checked, onChange }) => (
  <div className="flex items-center justify-between cursor-pointer" onClick={() => onChange(!checked)}>
    <label className="text-xs text-slate-300 font-medium pointer-events-none">{label}</label>
    <div className={`w-9 h-5 flex items-center rounded-full p-1 transition-colors ${checked ? 'bg-indigo-500' : 'bg-slate-700'}`}>
      <div className={`bg-white w-3 h-3 rounded-full shadow-sm transform transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
    </div>
  </div>
);

export default App;