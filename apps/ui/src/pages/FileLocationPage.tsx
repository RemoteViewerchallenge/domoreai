import { useState, useEffect } from 'react';
import { FolderOpen, Save, AlertCircle } from 'lucide-react';
import { useFileSystem } from '../stores/FileSystemContext.js';

export default function FileLocationPage() {
  const { currentPath, navigate } = useFileSystem();
  const [workspaceRoot, setWorkspaceRoot] = useState<string>('');
  const [savedRoot, setSavedRoot] = useState<string>('');

  useEffect(() => {
    const saved = localStorage.getItem('workspaceRoot');
    if (saved) {
      setSavedRoot(saved);
      setWorkspaceRoot(saved);
    } else {
      setWorkspaceRoot(currentPath);
    }
  }, [currentPath]);

  const handleSave = () => {
    localStorage.setItem('workspaceRoot', workspaceRoot);
    setSavedRoot(workspaceRoot);
    navigate(workspaceRoot);
    alert('Workspace root saved! All new cards will default to this directory.');
  };

  return (
    <div className="flex flex-col h-full w-full bg-black text-zinc-200 overflow-hidden font-mono">
      {/* Header */}
      <div className="flex-none h-12 bg-zinc-950 border-b border-zinc-900 flex items-center justify-between px-4">
        <h1 className="text-lg font-bold text-green-400 uppercase tracking-widest flex items-center gap-2">
          <FolderOpen size={20} />
          File Location
        </h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Info Box */}
          <div className="bg-blue-950/30 border border-blue-800 rounded-lg p-4 flex gap-3">
            <AlertCircle size={20} className="text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-200">
              <p className="font-bold mb-1">Project = Folder</p>
              <p className="text-blue-300">
                Set your workspace root directory. All cards will default to this location.
                Only one project exists per folder, and no embedded projects are allowed.
              </p>
            </div>
          </div>

          {/* Current Path Display */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-zinc-400 uppercase">Current Path</label>
            <div className="bg-zinc-950 border border-zinc-800 rounded px-4 py-3 text-sm text-zinc-300 font-mono">
              {currentPath}
            </div>
          </div>

          {/* Workspace Root Input */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-zinc-400 uppercase">Workspace Root Directory</label>
            <input
              type="text"
              value={workspaceRoot}
              onChange={(e) => setWorkspaceRoot(e.target.value)}
              placeholder="/path/to/your/workspace"
              className="w-full bg-black border border-zinc-700 text-white text-sm px-4 py-3 rounded font-mono focus:border-green-500 focus:outline-none"
            />
            <p className="text-xs text-zinc-500">
              Enter the absolute path to your workspace directory
            </p>
          </div>

          {/* Saved Root Display */}
          {savedRoot && (
            <div className="space-y-2">
              <label className="block text-xs font-bold text-zinc-400 uppercase">Saved Workspace Root</label>
              <div className="bg-green-950/30 border border-green-800 rounded px-4 py-3 text-sm text-green-300 font-mono">
                {savedRoot}
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="flex justify-end pt-4">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded text-sm font-bold uppercase shadow-[0_0_15px_rgba(34,197,94,0.6)] transition-all"
            >
              <Save size={16} />
              Save Workspace Root
            </button>
          </div>

          {/* Additional Info */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 space-y-2">
            <h3 className="text-xs font-bold text-zinc-400 uppercase">Notes</h3>
            <ul className="text-xs text-zinc-500 space-y-1 list-disc list-inside">
              <li>Cards can navigate to other directories manually</li>
              <li>Configuration is saved per browser/device</li>
              <li>Create or specify a folder that doesn't contain embedded projects</li>
              <li>All card states and positions will be saved relative to this root</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}