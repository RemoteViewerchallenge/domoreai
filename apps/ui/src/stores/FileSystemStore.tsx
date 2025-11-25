import React, { createContext, useContext, useState, useCallback } from 'react';
import type { VFile } from './FileSystemTypes.js';

// Re-export for convenience (using regular export to ensure Vite sees it)
export { type VFile } from './FileSystemTypes.js';

interface FileSystemContextType {
  files: VFile[];
  readFile: (path: string) => string;
  writeFile: (path: string, content: string) => void;
  createFile: (path: string, initialContent?: string) => void;
}

const FileSystemContext = createContext<FileSystemContextType | null>(null);

export const FileSystemProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // INITIAL STATE: Mock Data
  const [files, setFiles] = useState<VFile[]>([
    { path: 'workspace', type: 'dir', children: [
        { path: 'workspace/readme.md', type: 'file', content: '# Project Overview\n\nTarget: Build AI Interface.' },
        { path: 'workspace/agents', type: 'dir', children: [] }
    ]}
  ]);

  // Helper to find a node in the tree
  const findNode = (nodes: VFile[], path: string): VFile | undefined => {
    for (const node of nodes) {
      if (node.path === path) return node;
      if (node.children) {
        const found = findNode(node.children, path);
        if (found) return found;
      }
    }
    return undefined;
  };

  const readFile = useCallback((path: string) => {
    const node = findNode(files, path);
    if (node && node.type === 'file') {
        return node.content || '';
    }
    return "// Content loaded from VFS for " + path; 
  }, [files]);

  const writeFile = useCallback((path: string, content: string) => {
    console.log(`Writing to ${path}:`, content.substring(0, 20) + '...');
    
    setFiles(prevFiles => {
        const newFiles = [...prevFiles];
        const node = findNode(newFiles, path);
        if (node && node.type === 'file') {
            node.content = content;
        }
        return newFiles;
    });
  }, []);

  const createFile = useCallback((path: string, initialContent = '') => {
     console.log(`Creating file: ${path}`);
     
     setFiles(prevFiles => {
         // 1. Check if already exists
         if (findNode(prevFiles, path)) return prevFiles;

         // 2. Simple insertion logic (assuming flat structure for the mock or just inserting into 'workspace/agents' if path matches)
         // For this mock, we'll just push to the appropriate directory if we can find it, otherwise top level.
         // Real implementation needs a proper path parser.
         
         const newFiles = [...prevFiles];
         const parts = path.split('/');
         const fileName = parts.pop();
         const dirPath = parts.join('/');
         
         const dirNode = findNode(newFiles, dirPath);
         
         if (dirNode && dirNode.type === 'dir') {
             if (!dirNode.children) dirNode.children = [];
             dirNode.children.push({
                 path: path,
                 type: 'file',
                 content: initialContent
             });
         } else {
             // Fallback: add to root if dir not found (simplified)
             // In a real app, we'd create directories recursively.
         }
         
         return newFiles;
     });
  }, []);

  return (
    <FileSystemContext.Provider value={{ files, readFile, writeFile, createFile }}>
      {children}
    </FileSystemContext.Provider>
  );
};

export const useFileSystem = () => {
  const context = useContext(FileSystemContext);
  if (!context) throw new Error("useFileSystem must be used within a FileSystemProvider");
  return context;
};
