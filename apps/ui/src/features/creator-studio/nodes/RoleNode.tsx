import { memo, useState } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { 
  Terminal, Database, Brain, 
  Send, ChevronDown, ChevronUp, FolderTree
} from 'lucide-react';
import { Button } from '../../../components/ui/button.js';
import { Input } from '../../../components/ui/input.js';

export interface RoleNodeData {
  id: string;
  name: string;
  status: 'online' | 'idle' | 'busy' | 'error';
  class: 'Code' | 'DB' | 'Planning' | string;
  vfsPath?: string;
  systemPrompt?: string;
  onSendDirective?: (id: string, directive: string) => void;
}

const RoleNode = ({ data, selected }: NodeProps<RoleNodeData>) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [directive, setDirective] = useState('');

  const Icon = data.class === 'Code' ? Terminal : 
               data.class === 'DB' ? Database : 
               data.class === 'Planning' ? Brain : Brain;

  const statusColor = data.status === 'online' ? 'bg-emerald-500' :
                      data.status === 'idle' ? 'bg-zinc-500' :
                      data.status === 'busy' ? 'bg-amber-500' : 'bg-rose-500';

  const handleSend = () => {
    if (directive.trim() && data.onSendDirective) {
      data.onSendDirective(data.id, directive);
      setDirective('');
    }
  };

  return (
    <div className={`
      w-[350px] bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl overflow-hidden transition-all
      ${selected ? 'ring-2 ring-purple-500 border-purple-500/50' : ''}
    `}>
      {/* HEADER */}
      <div className="px-4 py-3 bg-zinc-800/50 border-b border-zinc-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/10 rounded-md">
            <Icon size={18} className="text-purple-400" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-zinc-100 leading-tight">{data.name}</span>
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${statusColor} animate-pulse`} />
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">{data.status}</span>
            </div>
          </div>
        </div>
        <div className="text-[10px] px-2 py-1 bg-zinc-900 border border-zinc-700 rounded text-zinc-400 font-mono">
          {data.class}
        </div>
      </div>

      {/* BODY */}
      <div className="p-4 space-y-3">
        {/* VFS PATH */}
        <div className="flex items-center gap-2 px-2 py-1.5 bg-zinc-950 rounded border border-zinc-800 text-zinc-400">
          <FolderTree size={12} className="text-zinc-600" />
          <span className="text-[10px] font-mono truncate" title={data.vfsPath}>
            {data.vfsPath || 'root://vfs/agent'}
          </span>
        </div>

        {/* PROMPT BLOCK */}
        <div className="bg-zinc-950 rounded border border-zinc-800 overflow-hidden">
          <div 
            className="px-2 py-1 bg-zinc-900 flex items-center justify-between cursor-pointer hover:bg-zinc-800 transition-colors"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold">System Directive</span>
            {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </div>
          <div className={`
            transition-all duration-300 ease-in-out
            ${isExpanded ? 'max-h-[200px] overflow-y-auto' : 'max-h-[40px] overflow-hidden'}
          `}>
            <pre className="p-2 text-[11px] font-mono text-zinc-300 whitespace-pre-wrap leading-relaxed opacity-80">
              {data.systemPrompt || 'No system prompt defined.'}
            </pre>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div className="px-4 py-3 bg-zinc-800/30 border-t border-zinc-800 flex gap-2">
        <Input 
          placeholder="Inject new directive..."
          value={directive}
          onChange={(e) => setDirective(e.target.value)}
          className="h-8 text-xs bg-zinc-950 border-zinc-700 text-zinc-200 placeholder:text-zinc-600"
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        />
        <Button 
          size="sm" 
          onClick={handleSend}
          className="h-8 px-3 bg-purple-600 hover:bg-purple-500 text-white"
        >
          <Send size={14} />
        </Button>
      </div>

      {/* HANDLES */}
      <Handle type="target" position={Position.Top} className="!bg-zinc-700 !w-3 !h-3 !border-zinc-900" />
      <Handle type="source" position={Position.Bottom} className="!bg-purple-500 !w-3 !h-3 !border-zinc-900" />
    </div>
  );
};

export default memo(RoleNode);
