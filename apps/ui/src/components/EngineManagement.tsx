/**
 * Engine Management Component
 * 
 * UI for managing voice engines (add, edit, delete, enable/disable)
 */

import { useState } from 'react';
import { Plus, Trash2, Edit2, Power } from 'lucide-react';
import { trpc } from '../utils/trpc.js';
import { Button } from './ui/button.js';

interface EngineFormData {
  name: string;
  type: 'STT' | 'TTS' | 'KEYWORD_LISTENER' | 'REMOTE_INPUT';
  provider: string;
  config: Record<string, unknown>;
}

export const EngineManagement = () => {
  const [isAddingEngine, setIsAddingEngine] = useState(false);
  const [formData, setFormData] = useState<EngineFormData>({
    name: '',
    type: 'STT',
    provider: '',
    config: {},
  });

  const { data: engines } = trpc.voice.listEngines.useQuery({});

  const handleAddEngine = () => {
    // This would need to be implemented in the API
    // For now, engines are registered programmatically
    console.log('Add engine:', formData);
    setIsAddingEngine(false);
  };

  return (
    <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-zinc-200">
          Voice Engines
        </h3>
        <Button
          onClick={() => setIsAddingEngine(true)}
          size="sm"
          className="bg-blue-500 hover:bg-blue-600 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Engine
        </Button>
      </div>

      {/* Engine List */}
      <div className="space-y-2">
        {engines?.map((engine) => (
          <div
            key={engine.id}
            className="flex items-center justify-between bg-zinc-800 border border-zinc-700 rounded-lg p-4"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-zinc-200">{engine.name}</span>
                <span className="text-xs px-2 py-0.5 bg-zinc-700 rounded text-zinc-400">
                  {engine.type}
                </span>
                <span className="text-xs px-2 py-0.5 bg-zinc-700 rounded text-zinc-400">
                  {engine.provider}
                </span>
              </div>
              {engine.metadata?.description && (
                <p className="text-xs text-zinc-500">
                  {engine.metadata.description}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className={`border-zinc-700 ${
                  engine.isEnabled
                    ? 'text-green-400 hover:bg-green-400/10'
                    : 'text-zinc-500 hover:bg-zinc-700'
                }`}
              >
                <Power className="w-4 h-4" />
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                className="border-zinc-700 text-zinc-400 hover:bg-zinc-700"
              >
                <Edit2 className="w-4 h-4" />
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                className="border-zinc-700 text-red-400 hover:bg-red-400/10"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Engine Modal */}
      {isAddingEngine && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999]">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-zinc-200 mb-4">
              Add Voice Engine
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Engine Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-zinc-200"
                  placeholder="My STT Engine"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as EngineFormData['type'] })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-zinc-200"
                >
                  <option value="STT">STT</option>
                  <option value="TTS">TTS</option>
                  <option value="KEYWORD_LISTENER">Keyword Listener</option>
                  <option value="REMOTE_INPUT">Remote Input</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Provider
                </label>
                {/* cSpell:ignore vosk coqui */}
                <input
                  type="text"
                  value={formData.provider}
                  onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-zinc-200"
                  placeholder="whisper, vosk, google, coqui, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Configuration (JSON)
                </label>
                <textarea
                  value={JSON.stringify(formData.config, null, 2)}
                  onChange={(e) => {
                    try {
                      setFormData({ ...formData, config: JSON.parse(e.target.value) as Record<string, unknown> });
                    } catch {
                      // Invalid JSON, ignore
                    }
                  }}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-zinc-200 font-mono text-xs min-h-[100px]"
                  placeholder='{\n  "modelPath": "/path/to/model"\n}'
                />
              </div>
            </div>

            <div className="flex items-center gap-2 mt-6">
              <Button
                onClick={() => void handleAddEngine()}
                className="bg-blue-500 hover:bg-blue-600 text-white flex-1"
              >
                Add Engine
              </Button>
              <Button
                onClick={() => setIsAddingEngine(false)}
                variant="outline"
                className="border-zinc-700"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EngineManagement;
