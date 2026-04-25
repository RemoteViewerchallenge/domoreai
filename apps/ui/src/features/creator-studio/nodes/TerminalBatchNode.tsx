import React, { memo, useState } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { 
  Terminal, 
  Settings, 
  Shield, 
  ShieldCheck, 
  Activity, 
  ChevronRight,
  Loader2,
  CheckCircle2,
  XCircle,
  Wrench
} from 'lucide-react';
import { Button } from '../../../components/ui/button.js';
import XtermTerminal from '../../../components/XtermTerminal.js';
import useWebSocketStore from '../../../stores/websocket.store.js';

export interface TerminalBatchData {
  label?: string;
  goal?: string;
  autoRecovery?: boolean;
  status?: 'pending' | 'running' | 'failed' | 'fixed' | 'success';
}

/**
 * [STEP 4] Canvas UI Integration - TerminalBatchNode
 * A visual node for assembling and monitoring terminal batch orchestrations.
 */
const TerminalBatchNode = ({ data, id, selected }: NodeProps<TerminalBatchData>) => {
  const [autoRecovery, setAutoRecovery] = useState(data.autoRecovery ?? true);
  const { messages } = useWebSocketStore();

  const status = data.status || 'pending';

  const getStatusIcon = () => {
    switch (status) {
      case 'running': return <Loader2 size={14} className="animate-spin text-blue-400" />;
      case 'success': return <CheckCircle2 size={14} className="text-green-400" />;
      case 'failed': return <XCircle size={14} className="text-red-400" />;
      case 'fixed': return <Wrench size={14} className="text-orange-400" />;
      default: return <Activity size={14} className="text-gray-400" />;
    }
  };

  return (
    <div 
      className="relative rounded-xl border transition-all duration-300 flex flex-col shadow-2xl overflow-hidden group"
      style={{
        width: '500px',
        height: '400px',
        backgroundColor: '#0a0a0a',
        borderColor: selected ? 'var(--color-primary)' : 'rgba(255,255,255,0.1)',
        boxShadow: selected ? '0 0 20px rgba(var(--color-primary-rgb), 0.3)' : 'none'
      }}
    >
      {/* PREMIUM GLOW EFFECT */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />

      {/* HEADER */}
      <div 
        className="flex-none h-12 flex items-center justify-between px-4 border-b bg-white/[0.03]"
        style={{ borderColor: 'rgba(255,255,255,0.05)' }}
      >
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20">
            <Terminal size={18} className="text-primary" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-xs text-white tracking-tight">Terminal Batch Orchestrator</span>
            <span className="text-[9px] text-white/40 font-mono uppercase">ID: {id.split('-').pop()}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* AUTO-RECOVERY TOGGLE */}
          <div 
            onClick={() => setAutoRecovery(!autoRecovery)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border cursor-pointer transition-all duration-200 ${
              autoRecovery 
              ? 'bg-green-500/10 border-green-500/30 text-green-400' 
              : 'bg-white/5 border-white/10 text-white/40'
            }`}
          >
            {autoRecovery ? <ShieldCheck size={14} /> : <Shield size={14} />}
            <span className="text-[10px] font-bold uppercase tracking-widest">Auto-Fix</span>
          </div>

          <Button variant="ghost" size="icon" className="h-8 w-8 text-white/40 hover:text-white hover:bg-white/5">
            <Settings size={16} />
          </Button>
        </div>
      </div>

      {/* GOAL BANNER */}
      <div className="flex-none p-4 bg-white/[0.02] border-b border-white/[0.05]">
         <div className="flex items-center gap-2 text-[9px] text-primary font-bold uppercase tracking-widest mb-2">
            <ChevronRight size={10} />
            Target Objective
         </div>
         <div className="text-sm text-white/80 font-medium leading-relaxed italic">
            "{data.goal || "Execute complex multi-stage deployment pipeline with automated recovery..."}"
         </div>
      </div>

      {/* TERMINAL LOG STREAM */}
      <div className="flex-1 flex flex-col min-h-0 bg-black/40 p-2">
        <div className="flex-1 rounded-lg overflow-hidden border border-white/5 bg-black">
          <XtermTerminal 
            logs={messages.filter(m => m.nodeId === id || !m.nodeId)}
            workingDirectory={`/orchestrations/${id}`}
            onInput={() => {}} // Read-only for batch playback
          />
        </div>
      </div>

      {/* STATUS FOOTER */}
      <div className="flex-none h-10 bg-black flex items-center justify-between px-4 border-t border-white/5">
         <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
               {getStatusIcon()}
               <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">{status}</span>
            </div>
            <div className="h-1 w-1 rounded-full bg-white/20" />
            <div className="text-[10px] text-white/30 font-mono">
               {messages.length} Events Logged
            </div>
         </div>

         <div className="flex items-center gap-2">
            <div className={`h-1.5 w-1.5 rounded-full animate-pulse ${status === 'running' ? 'bg-blue-400' : 'bg-green-400'}`} />
            <span className="text-[9px] text-white/40 font-mono uppercase tracking-tighter">Live Stream</span>
         </div>
      </div>

      {/* HANDLES */}
      <Handle 
        type="target" 
        position={Position.Left} 
        id="goal"
        className="!w-2 !h-12 !rounded-r-md !bg-primary !border-none -left-0.5 top-1/2 -translate-y-1/2 hover:!w-3 transition-all" 
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        id="success"
        className="!w-2 !h-12 !rounded-l-md !bg-green-500 !border-none -right-0.5 top-1/2 -translate-y-1/2 hover:!w-3 transition-all" 
      />
    </div>
  );
};

export default memo(TerminalBatchNode);
