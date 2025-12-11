import React, { useState } from 'react';
import { trpc } from '../utils/trpc.js';
import { callVoid } from '../../lib/callVoid.js';
import { X, Upload } from 'lucide-react';

interface JsonImportModalProps {
  onClose: () => void;
  onSuccess: (tableName: string) => void;
}

export const JsonImportModal: React.FC<JsonImportModalProps> = ({ onClose, onSuccess }) => {
  const [tableName, setTableName] = useState('');
  const [jsonString, setJsonString] = useState('');
  const [error, setError] = useState<string | null>(null);

  const utils = trpc.useContext();
  const importMutation = trpc.dataRefinement.importJsonToTable.useMutation({
    onSuccess: (data: { tableName: string; }) => {
      onSuccess(data.tableName);
      utils.dataRefinement.listAllTables.invalidate();
      onClose();
    },
    onError: (err: { message: React.SetStateAction<string | null>; }) => {
      setError(err.message);
    },
  });

  const handleImport = () => {
    if (!tableName) {
      setError('Table name is required.');
      return;
    }
    if (!jsonString) {
      setError('JSON data is required.');
      return;
    }
    try {
      // Validate JSON
      JSON.parse(jsonString);
    } catch (e) {
      setError('Invalid JSON format.');
      return;
    }
    setError(null);
    importMutation.mutate({ tableName, jsonString });
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl w-full max-w-2xl mx-auto text-white">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Upload size={18} /> Import JSON to New Table
          </h2>
          <button onClick={() => callVoid(onClose)} className="text-zinc-500 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label htmlFor="tableName" className="block text-sm font-medium text-zinc-400 mb-1">
              New Table Name
            </label>
            <input
              id="tableName"
              type="text"
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
              placeholder="e.g., my_models"
              className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-2 outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div>
            <label htmlFor="jsonString" className="block text-sm font-medium text-zinc-400 mb-1">
              JSON Data (must be an array of objects)
            </label>
            <textarea
              id="jsonString"
              value={jsonString}
              onChange={(e) => setJsonString(e.target.value)}
              placeholder='[{"id": "model-1", "value": "some value"}, ...]'
              className="w-full h-64 bg-zinc-950 border border-zinc-700 rounded px-3 py-2 font-mono text-sm outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-800 text-red-300 px-4 py-2 rounded text-sm">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end p-4 border-t border-zinc-800 space-x-2">
          <button onClick={() => callVoid(onClose)} className="px-4 py-2 rounded bg-zinc-800 hover:bg-zinc-700">
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={importMutation.isLoading}
            className="px-4 py-2 rounded bg-green-600 hover:bg-green-500 text-white font-bold disabled:opacity-50 flex items-center gap-2"
          >
            {importMutation.isLoading ? 'Importing...' : 'Import'}
          </button>
        </div>
      </div>
    </div>
  );
};
