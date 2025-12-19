import { Palette, Shield } from 'lucide-react';
import { useTheme } from '../hooks/useTheme.js';
import { SuperAiButton } from '../components/ui/SuperAiButton.js';

export default function Constitution() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-white overflow-hidden font-sans">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-zinc-800 bg-zinc-900/50">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">System Constitution</h1>
          <p className="text-zinc-400 text-sm">Define the laws, visuals, and behavior of the OS.</p>
        </div>
        <SuperAiButton contextId="constitution_global" />
      </div>

      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Appearance Section */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-6">
            <div className="flex items-center gap-2 text-purple-400 border-b border-zinc-800 pb-2">
              <Palette size={20} />
              <h2 className="font-bold text-lg">Visual Theme</h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-300">System Mode</span>
                <select 
                  value={(theme as unknown as Record<string, string>).mode || 'dark'} 
                  onChange={(e) => setTheme({ mode: e.target.value } as unknown as Partial<typeof theme>)}
                  className="bg-black border border-zinc-700 rounded px-3 py-1.5 text-sm text-zinc-300 focus:border-purple-500 outline-none"
                >
                  <option value="dark">Standard Dark</option>
                  <option value="midnight">Midnight Blue</option>
                  <option value="oled">OLED Black</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-300">Accent Color</span>
                <div className="flex gap-2">
                  {['purple', 'blue', 'green', 'orange'].map(color => (
                    <button
                      key={color}
                      onClick={() => setTheme({ primaryColor: color } as unknown as Partial<typeof theme>)}
                      className={`w-6 h-6 rounded-full border-2 transition-all ${
                        (theme as unknown as Record<string, string>).primaryColor === color ? 'border-white scale-110' : 'border-transparent opacity-50 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: `var(--color-${color})` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Rules & Governance */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-6">
            <div className="flex items-center gap-2 text-blue-400 border-b border-zinc-800 pb-2">
              <Shield size={20} />
              <h2 className="font-bold text-lg">Core Directives</h2>
            </div>
            <div className="space-y-4">
               {/* Placeholder for future Rule/Glossary injection via VFS */}
               <div className="p-4 bg-black/40 rounded-lg border border-zinc-800">
                 <div className="flex items-center justify-between mb-2">
                   <span className="text-sm font-bold text-zinc-300">Auto-Commit Changes</span>
                   <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                 </div>
                 <p className="text-xs text-zinc-500">
                   All AI actions in the VFS currently trigger automatic git commits tagged with the active Role ID.
                 </p>
               </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}