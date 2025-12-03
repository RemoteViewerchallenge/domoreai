import React from 'react';
import { useTheme } from '../../hooks/useTheme.js';
import { Sparkles, Volume2, Layout, Eye, Zap, Palette } from 'lucide-react';

export const ThemeCustomization: React.FC = () => {
  const { theme, setTheme, applyPreset } = useTheme();

  return (
    <div className="space-y-6">
      {/* Preset Selector */}
      <div className="border-4 border-[var(--color-primary)] rounded-lg p-4 bg-black shadow-[var(--glow-primary)]">
        <h3 className="text-sm font-black text-[var(--color-primary)] uppercase mb-4 flex items-center gap-2">
          <Sparkles size={16} strokeWidth={3} />
          Theme Presets
        </h3>
        <div className="grid grid-cols-4 gap-3">
          {(['minimal', 'standard', 'flashy', 'extreme'] as const).map((preset) => (
            <button
              key={preset}
              onClick={() => applyPreset(preset)}
              className={`p-4 rounded font-black uppercase text-xs transition-all ${
                theme.preset === preset
                  ? 'bg-[var(--color-primary)] text-black shadow-[var(--glow-primary)] scale-105'
                  : 'bg-black border-2 border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-black hover:scale-105'
              }`}
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      {/* Visual Settings */}
      <div className="border-4 border-[var(--color-accent)] rounded-lg p-4 bg-[var(--color-background)] shadow-[var(--glow-accent)]">
        <h3 className="text-sm font-black text-[var(--color-accent)] uppercase mb-4 flex items-center gap-2">
          <Eye size={16} strokeWidth={3} />
          Visual Settings
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-black text-[var(--color-primary)] uppercase mb-2">
              Text Brightness: {theme.visual.textBrightness}%
            </label>
            <input
              type="range"
              min="50"
              max="100"
              value={theme.visual.textBrightness}
              onChange={(e) => setTheme({ visual: { ...theme.visual, textBrightness: parseInt(e.target.value) } })}
              className="w-full h-2 bg-black border-2 border-[var(--color-primary)] rounded-lg appearance-none cursor-pointer"
            />
          </div>
          <div>
            <label className="block text-xs font-black text-[var(--color-primary)] uppercase mb-2">
              Border Brightness: {theme.visual.borderBrightness}%
            </label>
            <input
              type="range"
              min="50"
              max="100"
              value={theme.visual.borderBrightness}
              onChange={(e) => setTheme({ visual: { ...theme.visual, borderBrightness: parseInt(e.target.value) } })}
              className="w-full h-2 bg-black border-2 border-[var(--color-primary)] rounded-lg appearance-none cursor-pointer"
            />
          </div>
          <div>
            <label className="block text-xs font-black text-[var(--color-primary)] uppercase mb-2">
              Glow Intensity: {theme.visual.glowIntensity}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={theme.visual.glowIntensity}
              onChange={(e) => setTheme({ visual: { ...theme.visual, glowIntensity: parseInt(e.target.value) } })}
              className="w-full h-2 bg-black border-2 border-[var(--color-primary)] rounded-lg appearance-none cursor-pointer"
            />
          </div>
          <div>
            <label className="block text-xs font-black text-[var(--color-primary)] uppercase mb-2">
              Font Size: {theme.visual.fontSize}px
            </label>
            <input
              type="range"
              min="8"
              max="24"
              value={theme.visual.fontSize}
              onChange={(e) => setTheme({ visual: { ...theme.visual, fontSize: parseInt(e.target.value) } })}
              className="w-full h-2 bg-black border-2 border-[var(--color-primary)] rounded-lg appearance-none cursor-pointer"
            />
          </div>
          <div>
            <label className="block text-xs font-black text-[var(--color-primary)] uppercase mb-2">
              Border Width: {theme.visual.borderWidth}px
            </label>
            <input
              type="range"
              min="1"
              max="4"
              value={theme.visual.borderWidth}
              onChange={(e) => setTheme({ visual: { ...theme.visual, borderWidth: parseInt(e.target.value) } })}
              className="w-full h-2 bg-black border-2 border-[var(--color-primary)] rounded-lg appearance-none cursor-pointer"
            />
          </div>
          <div>
            <label className="block text-xs font-black text-[var(--color-primary)] uppercase mb-2">
              Transparency: {theme.visual.transparency}%
            </label>
            <input
              type="range"
              min="0"
              max="90"
              value={theme.visual.transparency}
              onChange={(e) => setTheme({ visual: { ...theme.visual, transparency: parseInt(e.target.value) } })}
              className="w-full h-2 bg-black border-2 border-[var(--color-primary)] rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Animation Settings */}
      <div className="border-4 border-[var(--color-secondary)] rounded-lg p-4 bg-black shadow-[var(--glow-secondary)]">
        <h3 className="text-sm font-black text-[var(--color-secondary)] uppercase mb-4 flex items-center gap-2">
          <Zap size={16} strokeWidth={3} />
          Animation Settings
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={theme.animations.enabled}
                onChange={(e) => setTheme({ animations: { ...theme.animations, enabled: e.target.checked } })}
                className="w-5 h-5 rounded border-2 border-[var(--color-secondary)] bg-black checked:bg-[var(--color-secondary)]"
              />
              <span className="text-xs font-black text-[var(--color-secondary)] uppercase">Enable Animations</span>
            </label>
          </div>
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={theme.animations.particleEffects}
                onChange={(e) => setTheme({ animations: { ...theme.animations, particleEffects: e.target.checked } })}
                className="w-5 h-5 rounded border-2 border-[var(--color-secondary)] bg-black checked:bg-[var(--color-secondary)]"
              />
              <span className="text-xs font-black text-[var(--color-secondary)] uppercase">Particle Effects</span>
            </label>
          </div>
          <div>
            <label className="block text-xs font-black text-[var(--color-secondary)] uppercase mb-2">
              Animation Speed: {theme.animations.speed}x
            </label>
            <input
              type="range"
              min="0.1"
              max="3"
              step="0.1"
              value={theme.animations.speed}
              onChange={(e) => setTheme({ animations: { ...theme.animations, speed: parseFloat(e.target.value) } })}
              className="w-full h-2 bg-black border-2 border-[var(--color-secondary)] rounded-lg appearance-none cursor-pointer"
            />
          </div>
          <div>
            <label className="block text-xs font-black text-[var(--color-secondary)] uppercase mb-2">
              Hover Intensity: {theme.animations.hoverEffectsIntensity}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={theme.animations.hoverEffectsIntensity}
              onChange={(e) => setTheme({ animations: { ...theme.animations, hoverEffectsIntensity: parseInt(e.target.value) } })}
              className="w-full h-2 bg-black border-2 border-[var(--color-secondary)] rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Sound Settings */}
      <div className="border-4 border-[var(--color-warning)] rounded-lg p-4 bg-black shadow-[0_0_20px_rgba(255,255,0,0.8)]">
        <h3 className="text-sm font-black text-[var(--color-warning)] uppercase mb-4 flex items-center gap-2">
          <Volume2 size={16} strokeWidth={3} />
          Sound Effects
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={theme.sounds.enabled}
                onChange={(e) => setTheme({ sounds: { ...theme.sounds, enabled: e.target.checked } })}
                className="w-5 h-5 rounded border-2 border-[var(--color-warning)] bg-black checked:bg-[var(--color-warning)]"
              />
              <span className="text-xs font-black text-[var(--color-warning)] uppercase">Enable Sounds</span>
            </label>
          </div>
          <div>
            <label className="block text-xs font-black text-[var(--color-warning)] uppercase mb-2">
              Volume: {theme.sounds.volume}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={theme.sounds.volume}
              onChange={(e) => setTheme({ sounds: { ...theme.sounds, volume: parseInt(e.target.value) } })}
              className="w-full h-2 bg-black border-2 border-[var(--color-warning)] rounded-lg appearance-none cursor-pointer"
              disabled={!theme.sounds.enabled}
            />
          </div>
        </div>
      </div>

      {/* Layout Settings */}
      <div className="border-4 border-[var(--color-success)] rounded-lg p-4 bg-black shadow-[0_0_20px_rgba(0,255,0,0.8)]">
        <h3 className="text-sm font-black text-[var(--color-success)] uppercase mb-4 flex items-center gap-2">
          <Layout size={16} strokeWidth={3} />
          Layout Settings
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-black text-[var(--color-success)] uppercase mb-2">Menu Style</label>
            <select
              value={theme.layout.menuStyle}
              onChange={(e) => setTheme({ layout: { ...theme.layout, menuStyle: e.target.value as any } })}
              className="w-full bg-black border-2 border-[var(--color-success)] text-[var(--color-success)] px-3 py-2 rounded font-black focus:outline-none"
            >
              <option value="compact">Compact</option>
              <option value="standard">Standard</option>
              <option value="dashboard">Dashboard</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-black text-[var(--color-success)] uppercase mb-2">Icon Theme</label>
            <select
              value={theme.layout.iconTheme}
              onChange={(e) => setTheme({ layout: { ...theme.layout, iconTheme: e.target.value as any } })}
              className="w-full bg-black border-2 border-[var(--color-success)] text-[var(--color-success)] px-3 py-2 rounded font-black focus:outline-none"
            >
              <option value="outline">Outline</option>
              <option value="filled">Filled</option>
              <option value="duotone">Duotone</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-black text-[var(--color-success)] uppercase mb-2">Density</label>
            <select
              value={theme.layout.density}
              onChange={(e) => setTheme({ layout: { ...theme.layout, density: e.target.value as any } })}
              className="w-full bg-black border-2 border-[var(--color-success)] text-[var(--color-success)] px-3 py-2 rounded font-black focus:outline-none"
            >
              <option value="compact">Compact</option>
              <option value="normal">Normal</option>
              <option value="comfortable">Comfortable</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};