import { createContext, useContext } from 'react';
import type { VFile, FileSystemProviderType } from './FileSystemTypes.js';

interface FileSystemContextType {
  files: VFile[];
  currentProvider: FileSystemProviderType;
  sshConnectionId: string | null;
  currentPath: string;
  
  // Actions
  setProvider: (provider: FileSystemProviderType) => void;
  setSshConnection: (connectionId: string) => void;
  navigate: (path: string) => void;
  
  // CRUD
  readFile: (path: string) => string;
  writeFile: (path: string, content: string) => void;
  createFile: (path: string, initialContent?: string) => void;
  refresh: () => void;
}

export const FileSystemContext = createContext<FileSystemContextType | null>(null);

export const useFileSystem = () => {
  const context = useContext(FileSystemContext);
  if (!context) throw new Error("useFileSystem must be used within a FileSystemProvider");
  return context;
};
