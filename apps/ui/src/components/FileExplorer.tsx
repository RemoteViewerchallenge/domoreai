import React, { useState } from 'react';
import { Folder, FileText, ChevronRight, ChevronDown } from 'lucide-react';
import type { VFile } from '../stores/FileSystemTypes.js';

interface FileExplorerProps {
  files: VFile[];
  onSelect: (path: string) => void;
  className?: string;
}

// Recursive Tree Node
const FileNode = ({ node, onSelect, depth = 0 }: { node: VFile, onSelect: (p: string) => void, depth: number }) => {
  const [isOpen, setIsOpen] = useState(true);
  const paddingLeft = depth * 12 + 12;

  if (node.type === 'file') {
    return (
      <div 
        onClick={() => onSelect(node.path)}
        className="flex items-center gap-2 py-1 hover:bg-zinc-800 cursor-pointer text-zinc-400 hover:text-cyan-400 text-xs"
        style={{ paddingLeft }}
      >
        <FileText size={13} />
        <span className="truncate">{node.path.split('/').pop()}</span>
      </div>
    );
  }

  return (
    <div>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 py-1 hover:bg-zinc-800 cursor-pointer text-zinc-300 text-xs font-bold"
        style={{ paddingLeft }}
      >
        {isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        <Folder size={13} className="text-purple-400" />
        <span>{node.path.split('/').pop()}</span>
      </div>
      {isOpen && node.children?.map(child => (
        <FileNode key={child.path} node={child} onSelect={onSelect} depth={depth + 1} />
      ))}
    </div>
  );
};

export const FileExplorer: React.FC<FileExplorerProps> = ({ files, onSelect, className }) => {
  return (
    <div className={`flex flex-col overflow-y-auto ${className}`}>
       {files.map(f => <FileNode key={f.path} node={f} onSelect={onSelect} depth={0} />)}
    </div>
  );
};
