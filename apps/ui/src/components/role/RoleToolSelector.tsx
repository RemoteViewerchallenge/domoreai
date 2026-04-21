import React, { useMemo, useState } from 'react';
import { trpc } from '../../utils/trpc.js';
import { Wrench, ChevronDown, ChevronRight, Folder, CheckSquare, Square } from 'lucide-react';
import { cn } from '../../lib/utils.js';

interface RoleToolSelectorProps {
    selectedTools: string[]; // List of tool names
    onChange: (tools: string[]) => void;
    className?: string;
}

export const RoleToolSelector: React.FC<RoleToolSelectorProps> = ({ selectedTools = [], onChange, className }) => {
    const { data: tools } = trpc.tool.list.useQuery();
    const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

    // 1. Group Tools
    const groups = useMemo(() => {
        const g: Record<string, typeof tools> = {};
        (tools || []).forEach(t => {
            let category = t.serverId || 'General';
            // Fallback inference if missing serverId
            if (!t.serverId && t.name.includes('_')) {
                const parts = t.name.split('_');
                category = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
            }
            if (!g[category]) g[category] = [];
            g[category]?.push(t);
        });
        return Object.entries(g).sort((a, b) => a[0].localeCompare(b[0]));
    }, [tools]);

    const toggleTool = (toolName: string) => {
        if (selectedTools.includes(toolName)) {
            onChange(selectedTools.filter(t => t !== toolName));
        } else {
            onChange([...selectedTools, toolName]);
        }
    };

    const toggleGroup = (groupName: string, toolsInGroup: string[]) => {
        const allSelected = toolsInGroup.every(t => selectedTools.includes(t));
        if (allSelected) {
            // Deselect all
            onChange(selectedTools.filter(t => !toolsInGroup.includes(t)));
        } else {
            // Select all
            const newSelection = new Set([...selectedTools, ...toolsInGroup]);
            onChange(Array.from(newSelection));
        }
    };

    return (
        <div className={cn("h-full flex flex-col bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)] overflow-hidden", className)}>
            <div className="p-3 border-b border-[var(--border-color)] bg-[var(--bg-primary)]">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-2">
                    <Wrench size={12} /> Available Tools
                </h3>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                {groups.map(([groupName, groupTools]) => {
                    const isOpen = expandedGroup === groupName;
                    const toolNames = groupTools?.map(t => t.name) || [];
                    const selectedCount = toolNames.filter(t => selectedTools.includes(t)).length;
                    const isAllSelected = toolNames.length > 0 && selectedCount === toolNames.length;

                    return (
                        <div key={groupName} className="border border-[var(--border-color)] rounded bg-[var(--bg-primary)]">
                            {/* Group Header */}
                            <div
                                className={cn(
                                    "flex items-center justify-between p-2 cursor-pointer hover:bg-[var(--bg-secondary)] transition-colors",
                                    isOpen ? "bg-[var(--bg-secondary)]" : ""
                                )}
                                onClick={() => setExpandedGroup(isOpen ? null : groupName)}
                            >
                                <div className="flex items-center gap-2 overflow-hidden">
                                    {isOpen ? <ChevronDown size={14} className="text-[var(--text-muted)]" /> : <ChevronRight size={14} className="text-[var(--text-muted)]" />}
                                    <Folder size={14} className="text-orange-500/70" />
                                    <span className="text-xs font-bold text-[var(--text-primary)] truncate">{groupName}</span>
                                    <span className="text-[9px] text-[var(--text-muted)] bg-[var(--bg-background)] px-1.5 py-0.5 rounded-full">
                                        {selectedCount}/{toolNames.length}
                                    </span>
                                </div>

                                {/* Select All Button (Stop Propagation) */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleGroup(groupName, toolNames);
                                    }}
                                    className="p-1 hover:text-[var(--color-primary)] transition-colors text-[var(--text-muted)]"
                                    title={isAllSelected ? "Deselect All" : "Select All"}
                                >
                                    {isAllSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                                </button>
                            </div>

                            {/* Accordion Content */}
                            {isOpen && (
                                <div className="p-1 space-y-0.5 border-t border-[var(--border-color)] bg-[var(--bg-background)] shadow-inner">
                                    {groupTools?.map(tool => {
                                        const isSelected = selectedTools.includes(tool.name);
                                        return (
                                            <div
                                                key={tool.name}
                                                onClick={() => toggleTool(tool.name)}
                                                className={cn(
                                                    "flex items-center gap-2 p-2 rounded cursor-pointer transition-all border border-transparent ml-2",
                                                    isSelected
                                                        ? "bg-orange-500/10 border-orange-500/20 text-orange-500"
                                                        : "hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)]"
                                                )}
                                            >
                                                <div className={cn(
                                                    "w-3 h-3 rounded border flex items-center justify-center shrink-0 transition-colors",
                                                    isSelected ? "bg-orange-500 border-orange-500" : "border-[var(--text-muted)]"
                                                )}>
                                                    {isSelected && <Wrench size={8} className="text-white" />}
                                                </div>
                                                <div className="flex flex-col overflow-hidden">
                                                    <span className="text-[11px] font-medium truncate">{tool.name}</span>
                                                    {tool.description && (
                                                        <span className="text-[9px] text-[var(--text-muted)] truncate opacity-70">{tool.description}</span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
