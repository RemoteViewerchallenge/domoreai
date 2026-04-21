import React from 'react';
import { AddProviderForm } from '../components/AddProviderForm.js';
import { ProviderHealth } from '../components/ProviderHealth.js';
import { ShieldCheck, ArrowLeft, Settings, Database, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button.js';

export const ControlPlane: React.FC = () => {
  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-white overflow-hidden">
      {/* Header */}
      <header className="h-16 border-b border-zinc-800 flex items-center justify-between px-6 bg-zinc-900/50 backdrop-blur-md z-10">
        <div className="flex items-center gap-4">
          <Link to="/workbench">
            <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white">
              <ArrowLeft size={20} />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-500/10 rounded-lg">
                <ShieldCheck size={20} className="text-emerald-500" />
            </div>
            <h1 className="text-lg font-black uppercase tracking-tighter">Zero-Trust Control Plane</h1>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800/50 rounded-full border border-zinc-700/50">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Router Online</span>
          </div>
          <Button variant="outline" size="sm" className="h-8 border-zinc-700 text-zinc-400 hover:text-white gap-2">
            <Settings size={14} /> Settings
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Provider Registration & Config */}
        <aside className="w-80 border-r border-zinc-800 flex flex-col bg-zinc-900/30">
          <div className="p-6 space-y-8 overflow-y-auto">
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-zinc-400 mb-2">
                <Database size={14} />
                <h2 className="text-[10px] font-black uppercase tracking-[0.2em]">Provider Registry</h2>
              </div>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Register new upstream providers to expand your agent's capabilities. The Surveyor will automatically discover available models.
              </p>
              <AddProviderForm onSuccess={() => console.log('Provider added')} />
            </section>

            <div className="divider opacity-10" />

            <section className="space-y-4">
              <div className="flex items-center gap-2 text-zinc-400 mb-2">
                <Activity size={14} />
                <h2 className="text-[10px] font-black uppercase tracking-[0.2em]">Live Audit Log</h2>
              </div>
              <div className="space-y-2">
                {[
                  { time: '16:34', msg: 'Groq: Scouted 12 models', type: 'success' },
                  { time: '16:35', msg: 'MAB: Preference → DeepSeek-V3', type: 'info' },
                  { time: '16:36', msg: 'Audit: Free-tier enforced (OpenRouter)', type: 'warning' },
                ].map((log, i) => (
                  <div key={i} className="text-[10px] font-mono p-2 rounded bg-zinc-950/50 border border-zinc-800/50 flex gap-2">
                    <span className="text-zinc-600">[{log.time}]</span>
                    <span className={
                        log.type === 'success' ? 'text-emerald-400' :
                        log.type === 'warning' ? 'text-amber-400' : 'text-indigo-400'
                    }>{log.msg}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
          
          <div className="mt-auto p-6 bg-zinc-950/50 border-t border-zinc-800">
            <div className="flex items-center justify-between text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                <span>System Status</span>
                <span className="text-emerald-500">Nominal</span>
            </div>
          </div>
        </aside>

        {/* Right Content: Health Dashboard */}
        <div className="flex-1 p-8 overflow-y-auto bg-zinc-950/50">
            <div className="max-w-6xl mx-auto space-y-8">
                <header>
                    <h2 className="text-2xl font-black tracking-tighter">Multi-Armed Bandit Analytics</h2>
                    <p className="text-zinc-500 text-sm mt-1">Real-time learning metrics and utility preference ranking across all active providers.</p>
                </header>
                
                <div className="h-[600px] bg-zinc-900/50 rounded-2xl border border-zinc-800 p-6">
                    <ProviderHealth />
                </div>
            </div>
        </div>
      </main>
    </div>
  );
};

export default ControlPlane;
