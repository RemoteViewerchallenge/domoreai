import React, { useMemo } from 'react';
import { 
  Activity, 
  Layers, 
  Zap, 
  Cpu, 
  Maximize2
} from 'lucide-react';


// --- Types (Strictly Typed for Performance) ---
interface InspectorProps {
  selectedNodeId: string | null;
  nodeType: 'ui' | 'api' | 'data';
  componentName?: string;
  currentClasses?: string; // Tailwind string
  memoryUsage?: number; // Estimated MB
  onClassChange?: (newClasses: string) => void;
}

// --- 1. The Header: Context Awareness ---
const InspectorHeader = ({ title, type }: { title: string, type: string }) => (
  <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-950">
    <div className="flex flex-col">
      <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1">
        {type} NODE
      </span>
      <h2 className="text-zinc-100 font-mono text-sm font-semibold truncate max-w-[200px]">
        {title}
      </h2>
    </div>
    <div className="h-2 w-2 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.6)] animate-pulse" />
  </div>
);

// --- 2. Live Preview: Isolated & Suspended ---
const LivePreviewStage = ({ isLoading }: { isLoading?: boolean }) => {
  return (
    <div className="relative w-full aspect-video bg-zinc-900 border-b border-zinc-800 overflow-hidden group">
      {/* Grid Pattern Background for Transparency Check */}
      <div className="absolute inset-0 opacity-20 pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(#3f3f46 1px, transparent 1px)', backgroundSize: '12px 12px' }} 
      />
      
      {/* The Render Container */}
      <div className="absolute inset-4 border border-dashed border-zinc-700 rounded flex items-center justify-center">
         {isLoading ? (
           <div className="flex flex-col items-center gap-2">
             <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
             <span className="text-xs text-zinc-500 font-mono">Compiling...</span>
           </div>
         ) : (
           <span className="text-zinc-600 text-xs font-mono">[ Live Component Render ]</span>
         )}
      </div>

      {/* Overlay Controls */}
      <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded border border-zinc-600">
          <Maximize2 size={12} />
        </button>
      </div>
    </div>
  );
};

// --- 3. Tailwind Class Inspector: Visual & Code ---
const ClassManager = ({ classes }: { classes: string }) => {
  const classList = useMemo(() => classes.split(' ').filter(Boolean), [classes]);
  
  return (
    <div className="p-4 border-b border-zinc-800">
      <div className="flex items-center gap-2 mb-3">
        <Layers size={14} className="text-purple-400" />
        <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Style Composition</span>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {classList.map((cls, idx) => (
          <span 
            key={`${cls}-${idx}`} 
            className="px-2 py-1 text-[10px] font-mono text-zinc-300 bg-zinc-900 border border-zinc-700 rounded hover:border-purple-500 hover:text-purple-300 cursor-pointer transition-colors"
          >
            {cls}
          </span>
        ))}
        <button className="px-2 py-1 text-[10px] font-mono text-zinc-500 border border-dashed border-zinc-700 rounded hover:text-zinc-300 hover:border-zinc-500">
          + Add
        </button>
      </div>
    </div>
  );
};

// --- 4. Memory Health Monitor (Performance First) ---
const SystemHealth = ({ usage }: { usage: number }) => {
  // Determine health color
  const statusColor = usage > 80 ? 'text-red-500' : usage > 50 ? 'text-amber-500' : 'text-emerald-500';
  
  return (
    <div className="mt-auto p-3 bg-zinc-925 border-t border-zinc-800">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Activity size={12} className="text-zinc-500" />
          <span className="text-[10px] text-zinc-500 font-medium">GRAPH HEALTH</span>
        </div>
        <span className={`text-[10px] font-mono font-bold ${statusColor}`}>
          {usage < 20 ? 'OPTIMAL' : 'HEAVY'}
        </span>
      </div>
      
      <div className="w-full bg-zinc-800 h-1 rounded-full overflow-hidden">
        <div 
          className={`h-full ${usage > 80 ? 'bg-red-500' : 'bg-emerald-500'} transition-all duration-500`} 
          style={{ width: `${usage}%` }} 
        />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[9px] text-zinc-600 font-mono">VRAM: {usage}MB</span>
        <span className="text-[9px] text-zinc-600 font-mono">FPS: 60</span>
      </div>
    </div>
  );
};

// --- MAIN COMPONENT: VisualInspectorPanel ---
export const VisualInspectorPanel: React.FC<InspectorProps> = React.memo(({
  selectedNodeId,
  nodeType,
  componentName = "Untitled Component",
  currentClasses = "p-4 bg-white rounded shadow-lg flex flex-col gap-2",
  memoryUsage = 12
}) => {
  
  if (!selectedNodeId) {
    return (
      <div className="h-full w-80 bg-zinc-950 border-l border-zinc-800 flex flex-col items-center justify-center text-zinc-600 p-6 text-center">
        <Cpu size={32} className="mb-4 opacity-20" />
        <span className="text-xs font-mono">Select a Node to inspect signal flow.</span>
      </div>
    );
  }

  return (
    <div className="h-full w-80 bg-zinc-950 border-l border-zinc-800 flex flex-col shadow-2xl z-50">
      {/* 1. Identity */}
      <InspectorHeader title={componentName} type={nodeType} />

      {/* 2. Visual Reality */}
      <LivePreviewStage />

      {/* 3. Scrollable Controls */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        
        {/* Actions Toolbar */}
        <div className="grid grid-cols-2 gap-2 p-4 border-b border-zinc-800">
           <button className="flex items-center justify-center gap-2 py-2 bg-purple-900/20 border border-purple-500/30 text-purple-400 text-xs font-bold rounded hover:bg-purple-900/40 transition-all">
             <Zap size={12} />
             Edit Code
           </button>
           <button className="flex items-center justify-center gap-2 py-2 bg-zinc-900 border border-zinc-700 text-zinc-300 text-xs font-bold rounded hover:bg-zinc-800 transition-all">
             <Layers size={12} />
             Wrap
           </button>
        </div>

        {/* CSS Classes */}
        <ClassManager classes={currentClasses} />

        {/* AI Context Integration (Addressing the "useless AI button" issue) */}
        <div className="p-4 border-b border-zinc-800">
           <div className="flex items-center gap-2 mb-2">
             <div className="w-2 h-2 rounded-full bg-emerald-500" />
             <span className="text-xs font-bold text-zinc-400">AI Context</span>
           </div>
           <p className="text-[10px] text-zinc-500 leading-relaxed">
             Active Agent: <span className="text-zinc-300">Frontend Specialist</span>.
             Listening for styling directives.
           </p>
        </div>

      </div>

      {/* 4. Telemetry */}
      <SystemHealth usage={memoryUsage} />
    </div>
  );
});

VisualInspectorPanel.displayName = 'VisualInspectorPanel';

export default VisualInspectorPanel;
