import React, { memo, useState, useMemo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { Button } from '../../../components/ui/button.js';
import { 
  FileCode, Sparkles,
  Maximize2, Minimize2, X,
  AppWindow, Component, FunctionSquare,
  Activity, ShieldCheck, ShieldAlert, Shield
} from 'lucide-react';
import { CodeCapability } from './capabilities/CodeCapability.js'; 
import { CardAgentPrompt } from '../../../components/work-order/CardAgentPrompt.js';
import type { RoleConfig } from '../types.js';

export interface SuperNodeData {
  label?: string;
  type?: 'data' | 'api' | 'code';
  department?: string;
  roleId?: string;
  filePath?: string;
  // Injected role data
  roles?: RoleConfig[];
}

const SuperNode = ({ data, id, selected }: NodeProps<SuperNodeData>) => {
  const [viewMode, setViewMode] = useState<'hud' | 'window'>('hud');
  const [aiMode, setAiMode] = useState(false);

  // Resolve role details
  const role = useMemo(() => {
     if (!data.roles || !data.roleId) return null;
     return data.roles.find(r => r.id === data.roleId);
  }, [data.roles, data.roleId]);

  // Health / Probation Status
  const healthStatus = useMemo(() => {
     const score = role?.healthScore || 100;
     if (score >= 80) return 'stable';
     if (score >= 50) return 'probation';
     return 'critical';
  }, [role]);

  // Theme-aware colors
  const deptStyle = useMemo(() => {
    const dept = data.department || 'general';
    // Mapping departments to Theme Palette variables
    if (healthStatus === 'critical') return { border: 'var(--color-error)', text: 'var(--color-error)' };
    if (healthStatus === 'probation') return { border: 'var(--color-warning)', text: 'var(--color-warning)' };

    if (dept === 'frontend') return { border: 'var(--color-primary)', text: 'var(--color-primary)' };
    if (dept === 'backend') return { border: 'var(--color-secondary)', text: 'var(--color-secondary)' };
    if (dept === 'database') return { border: 'var(--color-accent)', text: 'var(--color-accent)' };
    return { border: 'var(--color-text-muted)', text: 'var(--color-text-muted)' };
  }, [data.department, healthStatus]);

  const sizeClass = viewMode === 'hud' ? 'w-[320px] h-[100px]' : 'w-[600px] h-[500px]';
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
        className="flex-none h-8 flex items-center justify-between px-3 border-b"
        style={{ backgroundColor: 'var(--color-card-header-background)', borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-center gap-2">
          {data.roleId === 'page' ? <AppWindow size={14} style={{ color: deptStyle.text }} /> :
           data.roleId === 'component' ? <Component size={14} style={{ color: deptStyle.text }} /> :
           data.roleId === 'hook' ? <FunctionSquare size={14} style={{ color: deptStyle.text }} /> :
           <FileCode size={14} style={{ color: deptStyle.text }} />
          }
          <span className="font-mono text-[11px] font-bold truncate max-w-[150px]" style={{ color: 'var(--color-text)' }} title={data.label}>
            {data.label || role?.name || 'Unknown Node'}
          </span>
        </div>
        
        {/* MODEL BADGE */}
        {role?.currentModel && (
            <div className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-[var(--color-background)] border border-[var(--color-border)] opacity-80" title="Current Active Model">
               {role.currentModel}
            </div>
        )}

        <div className="flex items-center gap-1">
           <Button
             onClick={() => { setAiMode(!aiMode); if(!aiMode) setViewMode('window'); }}
             variant="ghost"
             size="icon"
             className="h-6 w-6 p-0 hover:bg-transparent hover:opacity-80"
             style={{ color: aiMode ? 'var(--color-primary)' : 'var(--color-text-muted)' }}
           >
             <Sparkles size={12} />
           </Button>
           <Button
             onClick={() => setViewMode(prev => prev === 'hud' ? 'window' : 'hud')}
             variant="ghost"
             size="icon"
             className="h-6 w-6 p-0 hover:bg-transparent hover:opacity-80 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
           >
             {viewMode === 'hud' ? <Maximize2 size={12}/> : <Minimize2 size={12}/>}
           </Button>
        </div>
      </div>

      {/* HUD CONTENT (Visible when minimized) */}
      {viewMode === 'hud' && (
          <div className="flex-1 p-2 flex flex-col justify-between">
              {/* SCOPE SECTION */}
              {role?.scope && (
                  <div className="flex items-center gap-2 text-[10px] text-[var(--color-text-secondary)]">
                     <span className="opacity-70">Jurisdiction:</span>
                     <span className="font-mono bg-[var(--color-background-secondary)] px-1 rounded truncate max-w-[180px]" title={role.scope}>
                         {role.scope}
                     </span>
                  </div>
              )}

              {/* HEALTH BAR */}
              <div className="mt-1">
                 <div className="flex justify-between items-center text-[9px] mb-0.5" style={{ color: deptStyle.text }}>
                    <span className="flex items-center gap-1">
                        {healthStatus === 'stable' ? <ShieldCheck size={10}/> :
                         healthStatus === 'probation' ? <Shield size={10}/> : <ShieldAlert size={10}/>}
                        {healthStatus.toUpperCase()}
                    </span>
                    <span>{role?.healthScore || 100}%</span>
                 </div>
                 <div className="h-1 w-full bg-[var(--color-background-secondary)] rounded-full overflow-hidden">
                     <div
                        className="h-full transition-all duration-500"
                        style={{
                            width: `${role?.healthScore || 100}%`,
                            backgroundColor: deptStyle.text
                        }}
                     />
                 </div>
              </div>
          </div>
      )}

      {/* WINDOW BODY */}
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
