import React, { useState } from 'react';
import { trpc } from '../../utils/trpc';
import { callVoid } from '../../lib/callVoid.js';
import { Play, Save, Globe, Code } from 'lucide-react';

export const ApiExplorerNode: React.FC = () => {
  const [method, setMethod] = useState<'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'>('GET');
  const [url, setUrl] = useState('https://jsonplaceholder.typicode.com/todos/1');
  const [headers, setHeaders] = useState('{\n  "Content-Type": "application/json"\n}');
  const [body, setBody] = useState('');
  const [response, setResponse] = useState<unknown>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [status, setStatus] = useState<number | null>(null);

  const executeMutation = trpc.apiExplorer.executeRequest.useMutation({
    onSuccess: (data) => {
      setResponse(data.data);
      setDuration(data.duration ?? null);
      setStatus(data.status ?? null);
    }
  });

  const saveMutation = trpc.apiExplorer.saveResponse.useMutation({
    onSuccess: () => alert('Response saved to Raw Data Lake!')
  });

  const handleExecute = () => {
    try {
      const parsedHeaders = JSON.parse(headers);
      callVoid(() => executeMutation.mutate({
        method,
        url,
        headers: parsedHeaders,
        body: method !== 'GET' ? body : undefined
      }));
    } catch {
      alert('Invalid JSON in Headers');
    }
  };

  return (
    <div className="flex flex-col h-[600px] w-full bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden font-mono text-xs">
      {/* Header */}
      <div className="flex-none h-12 px-4 bg-zinc-900 border-b border-zinc-800 flex items-center gap-3">
        <Globe size={16} className="text-blue-500" />
        <span className="font-bold text-zinc-300 text-sm">API EXPLORER</span>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Request Config */}
        <div className="w-1/3 border-r border-zinc-800 p-4 flex flex-col gap-4 overflow-y-auto">
          
          {/* Method & URL */}
          <div className="flex gap-2">
            <select 
              value={method}
              onChange={(e) => setMethod(e.target.value as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH')}
              className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-zinc-300 font-bold outline-none"
            >
              {['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <input 
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-zinc-300 outline-none"
              placeholder="https://api.example.com/v1/resource"
            />
          </div>

          {/* Headers */}
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-[var(--color-text-secondary)] font-bold flex items-center gap-2"><Code size={12}/> Headers (JSON)</label>
            <textarea 
              value={headers}
              onChange={(e) => setHeaders(e.target.value)}
              className="flex-1 bg-black border border-zinc-800 rounded p-2 text-green-400 resize-none outline-none font-mono"
            />
          </div>

          {/* Body */}
          {method !== 'GET' && (
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-[var(--color-text-secondary)] font-bold flex items-center gap-2"><Code size={12}/> Body (JSON)</label>
              <textarea 
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="flex-1 bg-black border border-zinc-800 rounded p-2 text-blue-400 resize-none outline-none font-mono"
              />
            </div>
          )}

          <button 
            onClick={() => callVoid(handleExecute)}
            disabled={executeMutation.isLoading}
            className="btn btn-sm btn-primary w-full gap-2"
          >
            <Play size={14} className={executeMutation.isLoading ? "animate-spin" : ""} />
            {executeMutation.isLoading ? 'Sending...' : 'Send Request'}
          </button>
        </div>

        {/* Right: Response */}
        <div className="flex-1 bg-black p-4 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mb-2">
             <span className="text-[var(--color-text-secondary)] font-bold">RESPONSE</span>
             {status && (
               <div className="flex items-center gap-4">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${status >= 200 && status < 300 ? 'bg-green-900 text-green-400' : 'bg-red-900 text-red-400'}`}>
                    {status}
                  </span>
                  <span className="text-zinc-600">{duration}ms</span>
               </div>
             )}
          </div>

          <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded p-2 overflow-auto relative group">
             {response ? (
               <pre className="text-xs text-zinc-300 font-mono whitespace-pre-wrap">
                 {JSON.stringify(response, null, 2)}
               </pre>
             ) : (
               <div className="flex items-center justify-center h-full text-zinc-700">
                 No response yet
               </div>
             )}
             
             {response !== null && (
               <button 
              onClick={() => {
                const name = prompt("Provider Name for Data Lake?");
                if (name) callVoid(() => saveMutation.mutate({ providerName: name, data: response }));
              }}
                 className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1 rounded text-xs flex items-center gap-2 border border-zinc-600"
               >
                 <Save size={12} /> Save to Lake
               </button>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};
