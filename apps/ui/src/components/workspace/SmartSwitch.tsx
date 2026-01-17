import { useWorkspaceStore } from '../../stores/workspace.store.js';
import { cn } from '../../lib/utils.js';
import { Monitor } from 'lucide-react';

export const SmartSwitch = () => {
    const { activeScreenspaceId, screenspaces, switchScreenspace } = useWorkspaceStore();

    return (
        <div className="flex items-center gap-1 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-sm p-0.5">
            {screenspaces.map((ss) => (
                <button
                    key={ss.id}
                    onClick={() => switchScreenspace(ss.id)}
                    className={cn(
                        "px-2 py-0.5 text-[10px] font-bold rounded-sm transition-all flex items-center gap-1",
                        activeScreenspaceId === ss.id
                            ? "bg-[var(--color-primary)] text-white shadow-sm"
                            : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
                    )}
                    title={`Switch to ${ss.name}`}
                >
                    <Monitor size={10} />
                    <span>{ss.id}</span>
                </button>
            ))}
        </div>
    );
};
