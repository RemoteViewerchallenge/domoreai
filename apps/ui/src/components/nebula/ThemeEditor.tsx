import React, { useState } from 'react';
import { 
  Settings, 
  Type, 
  Palette, 
  Box as BoxIcon, 
  Copy, 
  Check, 
  Save,
  Monitor
} from 'lucide-react';

const darkTheme = {
  primaryColor: '#6366f1',
  secondaryColor: '#ec4899',
  backgroundColor: '#0f172a',
  surfaceColor: '#1e293b',
  textColor: '#f8fafc',
  mutedColor: '#94a3b8',
  borderColor: '#334155',
  enableGradients: false,
  primaryGradient: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
  navFontSize: 14,
  smallFontSize: 14,
  baseFontSize: 16,
  h3FontSize: 20,
  h2FontSize: 32,
  h1FontSize: 48,
  lineHeight: 1.5,
  fontWeightNormal: 400,
  fontWeightBold: 700,
  borderWidth: 1,
  borderRadius: 12,
  iconSize: 24,
  iconStrokeWidth: 2,
  iconBgScale: 2.0,
  iconBgRadius: 12,
  iconFill: false,
  spacingUnit: 4, 
  containerPadding: 32,
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

export const ThemeEditor = () => {
  const [theme, setTheme] = useState(darkTheme);
  const [activeTab, setActiveTab] = useState('colors');
  const [copied, setCopied] = useState(false);
  
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
    const cssString = `:root {
  --primary: ${theme.primaryColor};
  --secondary: ${theme.secondaryColor};
  --background: ${theme.backgroundColor};
  --surface: ${theme.surfaceColor};
  --text: ${theme.textColor};
  --muted: ${theme.mutedColor};
  --border: ${theme.borderColor};
  --radius: ${theme.borderRadius}px;
}`;
    navigator.clipboard.writeText(cssString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border space-y-3 bg-muted/30">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <Settings size={16} className="text-primary" />
            Theme Engine
          </h3>
          <button 
            onClick={handleCopyCSS}
            className="text-xs bg-primary hover:bg-primary/90 text-primary-foreground px-3 py-1.5 rounded-md flex items-center gap-2 transition-colors font-medium"
          >
            {copied ? <Check size={14} /> : <Copy size={14}/>}
            {copied ? 'Copied' : 'Export CSS'}
          </button>
        </div>

        {/* Preset Selector */}
        <div className="flex gap-2">
          <select 
            value={currentPresetName}
            onChange={(e) => handleLoadPreset(e.target.value)}
            className="flex-1 bg-background border border-border text-foreground text-xs rounded-lg p-2 focus:ring-1 focus:ring-primary outline-none"
          >
            {Object.keys(presets).map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex p-2 gap-1 border-b border-border bg-muted/20 shrink-0">
        {[
          { id: 'type', icon: Type, label: 'Type' },
          { id: 'layout', icon: BoxIcon, label: 'Shape' },
          { id: 'colors', icon: Palette, label: 'Color' },
          { id: 'settings', icon: Monitor, label: 'Misc' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex flex-col items-center justify-center py-2 rounded-lg transition-all ${
              activeTab === tab.id 
                ? 'bg-primary/20 text-primary border border-primary/30' 
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <tab.icon size={16} className="mb-1" />
            <span className="text-[10px] font-medium uppercase">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {activeTab === 'colors' && (
          <div className="space-y-4">
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
          <div className="space-y-4">
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
          </div>
        )}

        {activeTab === 'layout' && (
          <div className="space-y-4">
            <ControlGroup title="Global Shape">
              <RangeInput label="Border Radius" value={theme.borderRadius} min={0} max={32} unit="px" onChange={(v) => handleChange('borderRadius', v)} />
              <RangeInput label="Border Width" value={theme.borderWidth} min={0} max={4} unit="px" onChange={(v) => handleChange('borderWidth', v)} />
            </ControlGroup>

            <ControlGroup title="Icon Style">
              <RangeInput label="Icon Size" value={theme.iconSize} min={16} max={48} unit="px" onChange={(v) => handleChange('iconSize', v)} />
              <RangeInput label="Stroke Width" value={theme.iconStrokeWidth} min={0.5} max={3} step={0.5} unit="px" onChange={(v) => handleChange('iconStrokeWidth', v)} />
            </ControlGroup>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-4">
            <ControlGroup title="Shadows & Depth">
              <RangeInput label="Blur Radius" value={theme.shadowBlur} min={0} max={100} unit="px" onChange={(v) => handleChange('shadowBlur', v)} />
              <RangeInput label="Opacity" value={theme.shadowOpacity} min={0} max={1} step={0.05} onChange={(v) => handleChange('shadowOpacity', v)} />
            </ControlGroup>
            
            <ControlGroup title="Spacing System">
              <RangeInput label="Base Unit" value={theme.spacingUnit} min={2} max={12} unit="px" onChange={(v) => handleChange('spacingUnit', v)} />
              <RangeInput label="Container Padding" value={theme.containerPadding} min={12} max={64} unit="px" onChange={(v) => handleChange('containerPadding', v)} />
            </ControlGroup>
          </div>
        )}
      </div>
    </div>
  );
};

const ControlGroup = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-3 p-3 bg-muted/30 rounded-lg border border-border">
    <h4 className="text-[10px] font-bold text-primary uppercase tracking-widest">{title}</h4>
    <div className="space-y-3">{children}</div>
  </div>
);

const ColorInput = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
  <div className="flex items-center justify-between">
    <label className="text-xs text-foreground font-medium">{label}</label>
    <div className="flex items-center gap-2">
      <div 
        className="w-10 h-6 rounded border border-border cursor-pointer relative overflow-hidden"
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
  onChange: (v: number) => void 
}) => (
  <div className="space-y-2">
    <div className="flex justify-between items-center">
      <label className="text-xs text-foreground font-medium">{label}</label>
      <span className="text-[10px] font-mono text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
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
      className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
    />
  </div>
);
