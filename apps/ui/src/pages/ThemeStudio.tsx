import { Palette, Layout as LayoutIcon, MousePointer, Type } from 'lucide-react';
import { SuperAiButton } from '../components/ui/SuperAiButton.js';

export default function ThemeStudio() {
  return (
    <div className="flex flex-col h-full bg-zinc-950 text-white overflow-hidden">
      
      {/* Header */}
      <div className="flex-none h-16 border-b border-zinc-800 bg-zinc-900/50 px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
           <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
             <Palette size={24} />
           </div>
           <div>
             <h1 className="text-xl font-bold tracking-tight">Theme Studio</h1>
             <p className="text-xs text-zinc-500">Personalize the visual &quot;Skin&quot; of your operating system.</p>
           </div>
        </div>
        
        <SuperAiButton contextId="theme_studio" />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Colors & Themes */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-6">
            <div className="flex items-center gap-2 text-purple-400 border-b border-zinc-800 pb-2">
              <Palette size={20} />
              <h2 className="font-bold text-lg">Colors & Themes</h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-black/40 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors">
                <span className="text-sm text-zinc-300">Theme Mode</span>
                <select className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-300 outline-none focus:border-purple-500">
                  <option>Dark (Default)</option>
                  <option>Midnight</option>
                  <option>OLED Black</option>
                  <option>Glassmorphism</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-3 bg-black/40 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors">
                <span className="text-sm text-zinc-300">Accent Color</span>
                <div className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-purple-600 ring-2 ring-white/20 cursor-pointer shadow-lg shadow-purple-900/20"></div>
                  <div className="w-5 h-5 rounded-full bg-blue-600 cursor-pointer hover:ring-2 hover:ring-white/10 transition-all"></div>
                  <div className="w-5 h-5 rounded-full bg-green-600 cursor-pointer hover:ring-2 hover:ring-white/10 transition-all"></div>
                  <div className="w-5 h-5 rounded-full bg-orange-600 cursor-pointer hover:ring-2 hover:ring-white/10 transition-all"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Layout Density */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-6">
            <div className="flex items-center gap-2 text-blue-400 border-b border-zinc-800 pb-2">
              <LayoutIcon size={20} />
              <h2 className="font-bold text-lg">Layout Density</h2>
            </div>
            
            <div className="grid grid-cols-1 gap-3">
              {['Compact', 'Comfortable', 'Spacious'].map((mode, i) => (
                <label key={mode} className="flex items-center justify-between p-4 bg-black/40 rounded-lg border border-zinc-800 cursor-pointer hover:border-blue-500/50 hover:bg-black/60 transition-all group">
                  <span className="text-sm text-zinc-300 group-hover:text-white">{mode}</span>
                  <input type="radio" name="density" defaultChecked={i === 1} className="accent-blue-500 w-4 h-4" />
                </label>
              ))}
            </div>
          </div>

          {/* Typography */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-6">
            <div className="flex items-center gap-2 text-yellow-400 border-b border-zinc-800 pb-2">
              <Type size={20} />
              <h2 className="font-bold text-lg">Typography</h2>
            </div>
            
            <div className="p-6 bg-black/40 rounded-lg border border-zinc-800 text-center space-y-2">
              <p className="text-3xl font-bold text-white tracking-tight">Inter Display</p>
              <p className="text-xs text-zinc-500 uppercase tracking-widest">System Interface Font</p>
              <div className="pt-4 flex justify-center gap-2">
                <button className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-[10px] rounded transition-colors">Change Font</button>
                <button className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-[10px] rounded transition-colors">Adjust Kerning</button>
              </div>
            </div>
          </div>

          {/* Input & FX */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-6">
            <div className="flex items-center gap-2 text-green-400 border-b border-zinc-800 pb-2">
              <MousePointer size={20} />
              <h2 className="font-bold text-lg">Input & Effects</h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-zinc-200">Glassmorphism Overlay</p>
                  <p className="text-[10px] text-zinc-500">Enable frosted glass effects on cards.</p>
                </div>
                <div className="w-10 h-5 bg-green-950 border border-green-500/30 rounded-full relative cursor-pointer">
                  <div className="absolute right-1 top-1 w-3 h-3 bg-green-400 rounded-full shadow-[0_0_8px_rgba(74,222,128,0.5)]"></div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-zinc-200">Micro-animations</p>
                  <p className="text-[10px] text-zinc-500">Smooth transitions for interactions.</p>
                </div>
                <div className="w-10 h-5 bg-green-950 border border-green-500/30 rounded-full relative cursor-pointer">
                  <div className="absolute right-1 top-1 w-3 h-3 bg-green-400 rounded-full shadow-[0_0_8px_rgba(74,222,128,0.5)]"></div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
