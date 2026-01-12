import React from 'react';
import { 
  Save, Undo, Redo, Monitor, Tablet, Smartphone, Eye 
} from 'lucide-react';
import { useParams } from 'react-router-dom';
import { useBuilderStore } from '../../../../stores/builder.store.js';
import { cn } from '../../../../lib/utils.js';

export const BuilderToolbar = () => {
  const { projectId } = useParams();
  const { triggerSave, isDirty, viewport, setViewport } = useBuilderStore();

  return (
    <div className="flex items-center justify-between w-full animate-in fade-in duration-300">
      
      {/* GROUP 1: Context (What am I editing?) */}
      <div className="flex items-center gap-3 pl-2">
        <span className="text-neutral-500 text-[10px] font-mono uppercase tracking-wider">
          Builder Mode
        </span>
        <div className="h-4 w-px bg-neutral-800" />
        <span className="text-white text-sm font-bold truncate max-w-[150px]">
          {projectId || 'Untitled Project'}
        </span>
        {isDirty && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" title="Unsaved Changes" />}
      </div>

      {/* GROUP 2: The Tools (Center) */}
      <div className="flex items-center gap-1 bg-neutral-900 rounded-lg p-1 border border-neutral-800 shadow-inner">
        <IconButton 
          icon={<Monitor size={14} />} 
          tooltip="Desktop View" 
          active={viewport === 'desktop'} 
          onClick={() => setViewport('desktop')}
        />
        <IconButton 
          icon={<Tablet size={14} />} 
          tooltip="Tablet View" 
          active={viewport === 'tablet'} 
          onClick={() => setViewport('tablet')}
        />
        <IconButton 
          icon={<Smartphone size={14} />} 
          tooltip="Mobile View" 
          active={viewport === 'mobile'} 
          onClick={() => setViewport('mobile')}
        />
        <div className="w-px h-4 bg-neutral-800 mx-1" />
        <IconButton icon={<Undo size={14} />} tooltip="Undo" />
        <IconButton icon={<Redo size={14} />} tooltip="Redo" />
      </div>

      {/* GROUP 3: Actions (Right) */}
      <div className="flex items-center gap-2">
        <button className="text-neutral-400 hover:text-white px-3 py-1.5 text-xs font-medium border border-transparent hover:border-neutral-700 rounded-lg transition-colors flex items-center gap-2">
           <Eye size={14} /> Preview
        </button>
        <button 
          onClick={triggerSave}
          disabled={!isDirty}
          className={cn(
            "px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all shadow-lg",
            isDirty 
              ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20" 
              : "bg-neutral-800 text-neutral-500 cursor-not-allowed opacity-50"
          )}
        >
          <Save size={14} /> {isDirty ? 'SAVE CHANGES' : 'SAVED'}
        </button>
      </div>
    </div>
  );
};

// Helper for clean buttons
const IconButton = ({ icon, active, tooltip, onClick }: { icon: React.ReactNode, active?: boolean, tooltip?: string, onClick?: () => void }) => (
  <button 
    title={tooltip}
    onClick={onClick}
    className={cn(
      "p-1.5 rounded-md transition-all",
      active 
        ? "bg-neutral-800 text-indigo-400 shadow-sm ring-1 ring-neutral-700" 
        : "text-neutral-500 hover:text-white hover:bg-neutral-800"
    )}
  >
    {icon}
  </button>
);
