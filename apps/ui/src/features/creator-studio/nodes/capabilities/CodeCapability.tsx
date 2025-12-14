import React, { useState, useEffect } from 'react';
import MonacoEditor from '../../../../components/MonacoEditor.js';
import { trpc } from '../../../../utils/trpc.js';
import { Loader2, FileWarning } from 'lucide-react';

interface CodeCapabilityProps {
  nodeId: string;
  filePath?: string;
}

export const CodeCapability = ({ nodeId, filePath }: CodeCapabilityProps) => {
  const [code, setCode] = useState('');
  
  // 1. Fetch Real Content
  const { data, isLoading, error } = trpc.vfs.readFile.useQuery(
    { path: filePath || '' },
    { 
      enabled: !!filePath,
      retry: false 
    }
  );

  // 2. Sync State
  useEffect(() => {
    if (data) setCode(data);
  }, [data]);

  // Loading State
  if (isLoading) return (
    <div className="h-full w-full bg-[#1e1e1e] flex items-center justify-center text-zinc-500 gap-2">
       <Loader2 size={16} className="animate-spin" />
       <span className="text-xs font-mono">FETCHING BYTES...</span>
    </div>
  );

  // Error State
  if (error) return (
    <div className="h-full w-full bg-[#1e1e1e] flex flex-col items-center justify-center text-red-400 gap-2">
       <FileWarning size={24} />
       <span className="text-xs font-mono">FILE ACCESS DENIED</span>
       <span className="text-[10px] text-zinc-600">{filePath}</span>
    </div>
  );

  return (
    <div className="h-full w-full bg-[#1e1e1e] flex flex-col">
       <div className="flex-1 relative overflow-hidden">
         <MonacoEditor 
           value={code}
           onChange={setCode} // In future: Auto-save via debounce
           language="typescript"
           theme="vs-dark"
           minimap={false}
         />
       </div>
       <div className="h-5 bg-[#007acc] text-white flex items-center px-2 text-[10px] justify-between font-mono">
          <span>TSX</span>
          <span>Ln 1, Col 1</span>
       </div>
    </div>
  );
};
