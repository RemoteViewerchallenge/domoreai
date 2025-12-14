import React, { memo, useState, useMemo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { 
  FileCode, Sparkles,
  Maximize2, Minimize2, X 
} from 'lucide-react';
import { CodeCapability } from './capabilities/CodeCapability.js'; 
import { CardAgentPrompt } from '../../../components/work-order/CardAgentPrompt.js';

export interface SuperNodeData {
  label?: string;
  type?: 'data' | 'api' | 'code';
  department?: string;
  roleId?: string;
  filePath?: string;
}

const SuperNode = ({ data, id, selected }: NodeProps<SuperNodeData>) => {
  const [viewMode, setViewMode] = useState<'hud' | 'window'>('hud');
  const [aiMode, setAiMode] = useState(false);

  // Theme-aware colors
  const deptStyle = useMemo(() => {
    const dept = data.department || 'general';
    // Mapping departments to Theme Palette variables
    if (dept === 'frontend') return { border: 'var(--color-primary)', text: 'var(--color-primary)' };
    if (dept === 'backend') return { border: 'var(--color-secondary)', text: 'var(--color-secondary)' };
    if (dept === 'database') return { border: 'var(--color-accent)', text: 'var(--color-accent)' };
    return { border: 'var(--color-text-muted)', text: 'var(--color-text-muted)' };
  }, [data.department]);

  const sizeClass = viewMode === 'hud' ? 'w-[280px] h-[40px]' : 'w-[600px] h-[500px]';
  const zIndex = viewMode === 'window' ? 'z-50' : 'z-0';

  return (
    <div 
      className={`relative rounded-sm border-l-4 transition-all duration-200 flex flex-col shadow-2xl ${sizeClass} ${zIndex}`}
      style={{
        backgroundColor: 'var(--color-card-background)',
        borderLeftColor: deptStyle.border,
        borderTop: '1px solid var(--color-border)',
        borderRight: '1px solid var(--color-border)',
        borderBottom: '1px solid var(--color-border)',
        outline: selected ? '1px solid var(--color-primary)' : 'none'
      }}
      onDoubleClick={() => setViewMode(prev => prev === 'hud' ? 'window' : 'hud')}
    >
      {/* HEADER */}
      <div 
        className="flex-none h-10 flex items-center justify-between px-3 border-b"
        style={{ backgroundColor: 'var(--color-card-header-background)', borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-center gap-3">
          <FileCode size={14} style={{ color: deptStyle.text }} />
          <span className="font-mono text-[11px] font-bold truncate max-w-[180px]" style={{ color: 'var(--color-text)' }} title={data.label}>
            {data.label}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
           <button 
             onClick={() => { setAiMode(!aiMode); if(!aiMode) setViewMode('window'); }}
             className="p-1 rounded hover:opacity-80 transition-opacity"
             style={{ color: aiMode ? 'var(--color-primary)' : 'var(--color-text-muted)' }}
           >
             <Sparkles size={12} />
           </button>
           <button 
             onClick={() => setViewMode(prev => prev === 'hud' ? 'window' : 'hud')}
             className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
           >
             {viewMode === 'hud' ? <Maximize2 size={12}/> : <Minimize2 size={12}/>}
           </button>
        </div>
      </div>

      {/* BODY */}
      {viewMode === 'window' && (
        <div className="flex-1 flex min-h-0 relative" style={{ backgroundColor: 'var(--color-background)' }}>
           {/* Code View */}
           {!aiMode && (
             <div className="flex-1 flex flex-col h-full w-full">
                <CodeCapability nodeId={id} filePath={data.filePath} />
             </div>
           )}

           {/* AI Overlay */}
           {aiMode && (
             <div className="absolute inset-0 z-20 backdrop-blur flex flex-col p-4" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
                <div className="flex-none flex justify-between items-center mb-4 border-b pb-2" style={{ borderColor: 'var(--color-border)' }}>
                   <div className="text-sm font-bold" style={{ color: 'var(--color-primary)' }}>AI Architect ({data.roleId})</div>
                   <button onClick={() => setAiMode(false)} style={{ color: 'var(--color-text-muted)' }}><X size={14}/></button>
                </div>
                <CardAgentPrompt 
                   cardId={id} 
                   cardContext={{ 
                     currentPath: data.filePath || '',
                     activeFile: data.filePath ? data.filePath.split('/').pop() || null : null,
                     content: '', 
                     type: 'code'
                   }} 
                   onSubmit={() => {}} 
                />
             </div>
           )}
        </div>
      )}

      <Handle type="target" position={Position.Left} className="!w-2 !h-8 !border-none !rounded-r opacity-0" />
      <Handle type="source" position={Position.Right} className="!w-2 !h-8 !border-none !rounded-l opacity-0" />
    </div>
  );
};

export default memo(SuperNode);
