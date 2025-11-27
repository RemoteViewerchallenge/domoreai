import React, { useState, useCallback } from 'react';
import { FileSystemContext } from './FileSystemContext.js';
import type { VFile, FileSystemProviderType } from './FileSystemTypes.js';

// Re-export for convenience




export const FileSystemProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  
  // --- STATE ---
  const [currentProvider, setProvider] = useState<FileSystemProviderType>('local');
  const [sshConnectionId, setSshConnection] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState<string>('.');
  
  // --- MOCK DATA FOR LOCAL (To be replaced by vfs.list({ provider: 'local' })) ---
  const [localFiles, setLocalFiles] = useState<VFile[]>([
    { path: 'workspace', type: 'dir', children: [
        { path: 'workspace/readme.md', type: 'file', content: '# Local Workspace\n\nManaged by LocalProvider.' },
        { path: 'workspace/agents', type: 'dir', children: [] }
    ]}
  ]);

  // --- MOCK DATA FOR SSH (To be replaced by vfs.list({ provider: 'ssh' })) ---
  const [sshFiles, setSshFiles] = useState<VFile[]>([
    { path: '/var/www', type: 'dir', children: [
        { path: '/var/www/index.html', type: 'file', content: '<html>Remote Server</html>' },
        { path: '/var/www/logs', type: 'dir', children: [] }
    ]}
  ]);

  // Select active file set based on provider
  const files = currentProvider === 'local' ? localFiles : sshFiles;

  // --- ACTIONS ---

  const refresh = useCallback(() => {
     // This would trigger the TRPC refetch in the real implementation
     console.log(`Refreshing FS: ${currentProvider} @ ${currentPath}`);
  }, [currentProvider, currentPath]);

  const readFile = useCallback((path: string) => {
    // In real implementation: trpc.vfs.read.query({ path, provider, connectionId })
    const node = findNode(files, path);
    if (node && node.type === 'file') {
        return node.content || '';
    }
    return `// Content loaded from ${currentProvider.toUpperCase()} FS for ${path}`; 
  }, [files, currentProvider]);

  const writeFile = useCallback((path: string, content: string) => {
    console.log(`Writing to ${currentProvider}:${path}`, content.substring(0, 20) + '...');
    
    // Mock Update
    const updater = currentProvider === 'local' ? setLocalFiles : setSshFiles;
    updater(prevFiles => {
        const newFiles = JSON.parse(JSON.stringify(prevFiles)); // Deep clone for mock
        const node = findNode(newFiles, path);
        if (node && node.type === 'file') {
            node.content = content;
        }
        return newFiles;
    });
  }, [currentProvider]);

  const createFile = useCallback((path: string, initialContent = '') => {
     console.log(`Creating file on ${currentProvider}: ${path}`);
     
     const updater = currentProvider === 'local' ? setLocalFiles : setSshFiles;
     updater(prevFiles => {
         if (findNode(prevFiles, path)) return prevFiles;
         const newFiles = JSON.parse(JSON.stringify(prevFiles));
         
         // Simplified Mock Insertion Logic
         const root = newFiles[0]; // Just dumping into root/first child for mock
         if(root.children) {
             root.children.push({
                 path: path,
                 type: 'file',
                 content: initialContent
             });
         }
         return newFiles;
     });
  }, [currentProvider]);

  return (
    <FileSystemContext.Provider value={{ 
        files, 
        currentProvider, 
        sshConnectionId, 
        currentPath,
        setProvider, 
        setSshConnection,
        navigate: setCurrentPath,
        readFile, 
        writeFile, 
        createFile,
        refresh
    }}>
      {children}
    </FileSystemContext.Provider>
  );
};



// --- HELPERS ---
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
