import { Check, X, Eye } from 'lucide-react';
import { Button } from '../ui/button.js';
import { ScrollArea } from '../ui/scroll-area.js';

interface CardTaskApprovalProps {
  taskId?: string; // Optional if not used yet
  roleName: string;
  intent: string;
  diffSummary?: {
    files: string[];
    additions: number;
    deletions: number;
  };
  onApprove: () => void;
  onReject: (reason: string) => void;
  onInspect: () => void;
}

export function CardTaskApproval({ 
  roleName, 
  intent, 
  diffSummary = { files: ['src/components/App.tsx', 'src/styles.css'], additions: 12, deletions: 4 }, 
  onApprove, 
  onReject, 
  onInspect 
}: CardTaskApprovalProps) {
  return (
    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-zinc-900 border border-yellow-500/50 rounded-lg shadow-2xl flex flex-col overflow-hidden ring-1 ring-yellow-500/20">
        
        {/* Header */}
        <div className="bg-yellow-500/10 border-b border-yellow-500/20 p-3 flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-yellow-500/20 flex items-center justify-center shrink-0">
            <Eye size={16} className="text-yellow-500" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-yellow-500 uppercase tracking-wider">Visual Check Required</h3>
            <p className="text-[10px] text-zinc-400">Agent <strong>{roleName}</strong> needs approval</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-zinc-500 uppercase">Intent</label>
            <p className="text-sm text-zinc-200 leading-snug font-medium">"{intent}"</p>
          </div>

          <div className="space-y-2 bg-zinc-950/50 rounded border border-zinc-800 p-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-zinc-500">Proposed Changes</span>
              <button onClick={onInspect} className="text-[10px] text-blue-400 hover:text-blue-300 underline flex items-center gap-1">
                <Eye size={10} /> View Code Diff
              </button>
            </div>
            
            <ScrollArea className="h-20 w-full pr-2">
              <div className="space-y-1">
                {diffSummary.files.map((file, i) => (
                  <div key={i} className="flex items-center justify-between text-[10px] font-mono text-zinc-300">
                    <span className="truncate max-w-[180px]">{file}</span>
                    <span className="text-zinc-500">M</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
             
            <div className="flex gap-4 pt-2 border-t border-zinc-800/50 text-[10px] font-mono">
              <span className="text-emerald-500">+{diffSummary.additions} lines</span>
              <span className="text-red-500">-{diffSummary.deletions} lines</span>
            </div>
          </div>

          {/* FlyonUI Diff Visual Placeholder */}
          {/* <div className="diff aspect-[16/9] rounded overflow-hidden">
               <div className="diff-item-1">
                 <div className="bg-primary text-primary-content grid place-content-center text-xl font-black">AFTER</div>
               </div>
               <div className="diff-item-2">
                 <div className="bg-base-200 grid place-content-center text-xl font-black">BEFORE</div>
               </div>
               <div className="diff-resizer"></div>
          </div> */}

        </div>

        {/* Actions */}
        <div className="p-3 bg-zinc-950 border-t border-zinc-800 flex gap-2">
          <Button 
            onClick={() => onReject("User rejected visual check")}
            variant="ghost" 
            className="flex-1 h-9 bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:text-red-400 border border-red-500/20"
          >
            <X size={14} className="mr-2" /> Reject
          </Button>
          <Button 
            onClick={onApprove}
            className="flex-1 h-9 bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
          >
            <Check size={14} className="mr-2" /> Approve Change
          </Button>
        </div>
      </div>
    </div>
  );
}
