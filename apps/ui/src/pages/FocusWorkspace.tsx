import React, { useState, useCallback } from 'react';
import { SuperAiButton } from '@/components/ui/SuperAiButton.js';
import { cn } from '@/lib/utils.js';
import { Maximize2, Terminal, FileCode, UploadCloud, Eye, Code as CodeIcon, X } from 'lucide-react';

const ViewToggle = ({ mode, setMode }: { mode: 'code' | 'view', setMode: (m: 'code' | 'view') => void }) => (
  <div className="flex bg-[var(--color-background-secondary)]/50 rounded-lg p-1 border border-[var(--color-border)]/50 backdrop-blur-sm">
    <button
      onClick={() => setMode('code')}
      className={cn(
        "px-4 py-1.5 rounded-md text-xs font-medium flex items-center gap-2 transition-all",
        mode === 'code' ? "bg-[var(--color-primary)] text-[var(--color-background)] shadow-sm" : "text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-white/5"
      )}
    >
      <CodeIcon size={14} /> Code
    </button>
    <button
      onClick={() => setMode('view')}
      className={cn(
        "px-4 py-1.5 rounded-md text-xs font-medium flex items-center gap-2 transition-all",
        mode === 'view' ? "bg-[var(--color-primary)] text-[var(--color-background)] shadow-sm" : "text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-white/5"
      )}
    >
      <Eye size={14} /> Preview
    </button>
  </div>
);

export const FocusWorkspace = () => {
  const [activeSlot, setActiveSlot] = useState<'stage' | 'context'>('stage');
  const [viewMode, setViewMode] = useState<'code' | 'view'>('code');
  const [isDragging, setIsDragging] = useState(false);
  
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      setFileName(file.name);
      if (file.name.endsWith('.png') || file.name.endsWith('.jpg')) { setViewMode('view'); } else { setViewMode('code'); }
      const reader = new FileReader();
      reader.onload = (event) => { setFileContent(event.target?.result as string); };
      if (file.type.startsWith('image/')) { reader.readAsDataURL(file); } else { reader.readAsText(file); }
    }
  }, []);

  return (
    <div className="h-screen w-screen bg-[var(--color-background)] flex flex-col overflow-hidden text-[var(--color-text)] font-sans">
      
      {/* TOP BAR */}
      <div className="h-12 bg-[var(--color-background-secondary)] border-b border-[var(--color-border)] flex items-center px-4 justify-between shrink-0 select-none z-10">
        <div className="flex items-center gap-6">
          <span className="text-xs font-bold text-[var(--color-primary)] tracking-[0.2em]">DOMORE.OS</span>
          <div className="h-4 w-[1px] bg-[var(--color-border)]" />
          <div className="flex gap-4 text-[10px] text-[var(--color-text-secondary)]">
             <span className="flex items-center gap-2 hover:text-[var(--color-primary)] cursor-pointer transition-colors px-2 py-1 rounded hover:bg-white/5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"/> 
                Backend (3000)
             </span>
          </div>
        </div>
        <div className="absolute left-1/2 -translate-x-1/2">
            {fileContent && <ViewToggle mode={viewMode} setMode={setViewMode} />}
        </div>
        <div className="flex items-center gap-4 text-[10px] text-[var(--color-text-secondary)] font-mono">
            <span>CPU: 12%</span>
            <span>MEM: 430MB</span>
        </div>
      </div>

      {/* WORKSPACE */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* SLOT A: STAGE */}
        <div className={cn(
          "h-full border-r border-[var(--color-border)] relative transition-all duration-300 ease-out flex flex-col bg-[var(--color-background)]",
          activeSlot === 'stage' ? "w-2/3" : "w-1/3"
        )}>
          <div className="h-10 bg-[var(--color-background-secondary)]/30 border-b border-[var(--color-border)] flex items-center justify-between px-4 shrink-0">
            <span className="text-[10px] uppercase text-[var(--color-text-secondary)] tracking-wider flex items-center gap-2">
              <FileCode size={14} className="text-[var(--color-primary)]"/> 
              {fileName || 'IDLE_STATE'}
            </span>
            <div className="flex items-center gap-2">
                {fileContent && (
                    <button onClick={() => { setFileContent(null); setFileName(null); }} className="p-1 hover:bg-red-500/20 text-[var(--color-text-secondary)] hover:text-red-500 rounded transition-colors"><X size={14} /></button>
                )}
                <button onClick={() => setActiveSlot('stage')} className="text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]"><Maximize2 size={14} /></button>
            </div>
          </div>

          <div 
            className={cn("flex-1 relative overflow-hidden transition-all duration-300", isDragging ? "bg-[var(--color-primary)]/10 ring-2 ring-[var(--color-primary)] ring-inset m-4 rounded-xl" : "")}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            {!fileContent ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <div className={cn("p-6 rounded-full mb-6 border border-[var(--color-border)] transition-all duration-500", isDragging ? "bg-[var(--color-primary)] text-[var(--color-background)] scale-110 border-transparent" : "bg-[var(--color-background-secondary)] text-[var(--color-text-secondary)]")}>
                        <UploadCloud size={48} strokeWidth={1} />
                    </div>
                    <h3 className="text-sm font-medium text-[var(--color-text)] tracking-widest opacity-80">DROP SOURCE FILE</h3>
                </div>
            ) : (
                <div className="h-full w-full relative group">
                    {viewMode === 'code' ? (
                        <div className="h-full overflow-auto custom-scrollbar bg-[#0d0d0d]">
                            <pre className="p-6 font-mono text-xs text-[var(--color-text-secondary)] leading-relaxed whitespace-pre-wrap">{fileContent}</pre>
                        </div>
                    ) : (
                        <div className="h-full w-full flex items-center justify-center bg-white/5 border border-white/10 m-4 rounded-lg w-[calc(100%-2rem)] h-[calc(100%-2rem)]">
                            {fileName?.match(/\.(png|jpg|jpeg|gif)$/) ? (
                                <img src={fileContent} className="max-h-full max-w-full object-contain" alt={fileName} />
                            ) : (
                                <div className="text-center">
                                    <Eye size={48} className="mx-auto text-[var(--color-text-secondary)] mb-4 opacity-50" />
                                    <p className="text-sm font-medium">Preview Unavailable</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* SUPER AI BUTTON - CENTERED AT BOTTOM */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50">
                <SuperAiButton 
                    contextId={fileName || "global"}
                    expandUp={true}
                    onGenerate={(prompt: string) => console.log(`[AI Action on ${fileName}]: ${prompt}`)} 
                />
            </div>
          </div>
        </div>

        {/* SLOT B: CONTEXT */}
        <div className={cn(
          "h-full relative transition-all duration-300 ease-out bg-[var(--color-background-secondary)]/5 flex flex-col border-l border-[var(--color-border)]",
          activeSlot === 'context' ? "w-2/3" : "w-1/3"
        )}>
           <div className="h-10 bg-[var(--color-background-secondary)]/30 border-b border-[var(--color-border)] flex items-center justify-between px-4 shrink-0">
            <span className="text-[10px] uppercase text-[var(--color-text-secondary)] tracking-wider">Context Stack</span>
            <button onClick={() => setActiveSlot('context')} className="text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]"><Maximize2 size={14} /></button>
          </div>
          <div className="flex-1 p-4 overflow-y-auto">
             <div className="bg-[var(--color-background-secondary)] border border-[var(--color-border)] rounded p-3 mb-2 opacity-50 hover:opacity-100 transition-opacity cursor-pointer">
                <div className="flex items-center gap-2 mb-1"><Terminal size={12} /><span className="text-[10px] font-bold">Terminal Output</span></div>
                <div className="text-[9px] font-mono text-[var(--color-text-secondary)]">&gt; pnpm dev<br/>&gt; ready in 400ms</div>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default FocusWorkspace;
