import React, { useMemo } from 'react';
import type { Tool } from '../../types/role.js';
import { Wrench, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils.js';

interface RoleToolSelectorProps {
  availableTools?: Tool[];
  selectedTools: string[]; // List of tool names (or IDs, but currently names are used)
  onChange: (tools: string[]) => void;
  className?: string;
}

export const RoleToolSelector: React.FC<RoleToolSelectorProps> = ({
  availableTools = [],
  selectedTools,
  onChange,
  className
}) => {
  
  // Group Tools by ServerID or Fallback
  const groupedTools = useMemo(() => {
    const groups: Record<string, Tool[]> = {};
    
    availableTools.forEach(tool => {
        let serverName = 'Other';
        
        // 1. Prefer explicit serverId from backend
        if (tool.serverId) {
            serverName = tool.serverId;
        } 
        // 2. Fallback to regex (Legacy support)
        else {
            const mcpMatch = tool.description?.match(/^\[MCP: (.+?)\]/);
            if (mcpMatch) {
                serverName = mcpMatch[1];
            } else if (tool.name.includes('_')) {
                 // Fallback: git_read_file -> git
                 serverName = tool.name.split('_')[0];
            }
        }

        if (!groups[serverName]) groups[serverName] = [];
        groups[serverName].push(tool);
    });

    // Sort groups alphabetically
    const sortedKeys = Object.keys(groups).sort();
    
    // Sort tools within groups
    sortedKeys.forEach(key => {
        groups[key].sort((a, b) => a.name.localeCompare(b.name));
    });

    return { groups, sortedKeys };
  }, [availableTools]);

  const toggleTool = (toolName: string) => {
    const newSelection = selectedTools.includes(toolName)
      ? selectedTools.filter(t => t !== toolName)
      : [...selectedTools, toolName];
    onChange(newSelection);
  };

  return (
    <div className={cn("flex flex-col gap-4 p-4", className)}>
       {availableTools.length === 0 && (
           <div className="text-[var(--color-text-muted)] text-sm italic p-4 border border-dashed border-[var(--color-border)] rounded text-center">
               No tools available. Check connection to MCP servers.
           </div>
       )}

       {groupedTools.sortedKeys.map(server => (
           <div key={server} className="flex flex-col gap-2">
               <div className="flex items-center gap-2 text-xs font-bold uppercase text-[var(--color-text-muted)] border-b border-[var(--color-border)] pb-1 mb-1">
                   <div className="w-2 h-2 rounded-full bg-[var(--color-primary)]/50" />
                   {server}
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                   {groupedTools.groups[server].map(tool => {
                       const isSelected = selectedTools.includes(tool.name);
                       return (
                           <div 
                               key={tool.id}
                               onClick={() => toggleTool(tool.name)}
                               className={cn(
                                   "flex items-start gap-2 p-2 rounded cursor-pointer border transition-all text-xs",
                                   isSelected 
                                    ? "bg-[var(--color-primary)]/10 border-[var(--color-primary)]/50 shadow-sm" 
                                    : "bg-[var(--color-background-secondary)]/50 border-[var(--color-border)] hover:border-[var(--color-border)]/80 hover:bg-[var(--color-background-secondary)]"
                               )}
                           >
                               <div className={cn("mt-0.5", isSelected ? "text-[var(--color-primary)]" : "text-[var(--color-text-muted)]")}>
                                   {isSelected ? <CheckCircle size={14} /> : <Wrench size={14} />}
                               </div>
                               <div className="flex-1 overflow-hidden">
                                   <div className={cn("font-bold truncate", isSelected ? "text-[var(--color-primary)]" : "text-[var(--color-text)]")}>
                                       {tool.name}
                                   </div>
                                   <div className="text-[var(--color-text-muted)] text-[10px] line-clamp-2 leading-tight mt-0.5" title={tool.description}>
                                       {tool.description}
                                   </div>
                               </div>
                               {/* Info Icon for Tool Schema tooltip could go here */}
                           </div>
                       );
                   })}
               </div>
           </div>
       ))}
    </div>
  );
};
