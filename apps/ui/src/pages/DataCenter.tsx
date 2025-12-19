import { DatabaseBrowser } from '../components/DatabaseBrowser.js';
import { SuperAiButton } from '../components/ui/SuperAiButton.js';

export default function DataCenter() {
  return (
    <div className="flex flex-col h-full w-full bg-zinc-950">
      {/* Context Header */}
      <div className="flex-none h-12 border-b border-zinc-800 flex items-center justify-between px-4 bg-zinc-900">
        <div className="flex items-center gap-2">
           <span className="font-bold text-zinc-200">DATA CENTER</span>
           <span className="text-xs text-zinc-500 px-2 py-0.5 bg-zinc-800 rounded">SQL / JSON Mode</span>
        </div>
        <SuperAiButton contextId="datacenter_root" />
      </div>

      {/* Main Workspace */}
      <div className="flex-1 overflow-hidden relative">
        <DatabaseBrowser />
      </div>
    </div>
  );
}