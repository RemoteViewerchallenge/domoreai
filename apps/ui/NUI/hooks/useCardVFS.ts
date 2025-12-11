import { useState, useEffect, useCallback } from 'react';
import { trpc } from '../utils/trpc';
import type { VFile } from '../stores/FileSystemTypes';

/**
 * Per-card VFS hook that maintains independent directory state for each card
 */
export const useCardVFS = (cardId: string, initialPath: string = '/home/guy/mono') => {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    // Load from localStorage first, then fall back to initialPath
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`core_card_vfs_${cardId}`);
      if (saved) return saved;
    }
    return initialPath;
  });
  const [files, setFiles] = useState<VFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const utils = trpc.useUtils();

  // Persist currentPath to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(`core_card_vfs_${cardId}`, currentPath);
  }, [currentPath, cardId]);

  /**
   * Build a tree structure from flat file list
   * This enables proper folder expansion in the UI
   */
  const buildTree = useCallback((flatFiles: Array<{ path: string; type: 'file' | 'directory' }>, basePath: string): VFile[] => {
    const tree: VFile[] = [];
    
    for (const file of flatFiles) {
      const relativePath = file.path.startsWith(basePath) 
        ? file.path.slice(basePath.length).replace(/^\//, '')
        : file.path;
      
      const parts = relativePath.split('/').filter(Boolean);
      
      if (parts.length === 0) continue;
      
      // For top-level items (no nested path)
      if (parts.length === 1) {
        tree.push({
          path: file.path,
          type: file.type,
          children: file.type === 'directory' ? [] : undefined
        });
      }
    }
    
    return tree;
  }, []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await utils.vfs.list.fetch({ 
        path: currentPath, 
        provider: 'local',
        cardId 
      });
      
      // Build tree structure from flat list
      const treeFiles = buildTree(result as Array<{ path: string; type: 'file' | 'directory' }>, currentPath);
      setFiles(treeFiles);
    } catch (err: unknown) {
      console.error('[useCardVFS] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to list files');
    } finally {
      setIsLoading(false);
    }
  }, [currentPath, utils, cardId, buildTree]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const navigateTo = useCallback((path: string) => {
    setCurrentPath(path);
  }, []);

  const readFile = useCallback(async (path: string): Promise<string> => {
    try {
      const result = await utils.vfs.read.fetch({ 
        path, 
        provider: 'local',
        cardId 
      });
      return result.content;
    } catch (err) {
      console.error('[useCardVFS] Read error:', err);
      return '';
    }
  }, [utils, cardId]);

  const writeFile = useCallback(async (path: string, content: string): Promise<void> => {
    try {
      await utils.client.vfs.write.mutate({ 
        path, 
        content, 
        provider: 'local',
        cardId 
      });
      await refresh();
    } catch (err) {
      console.error('[useCardVFS] Write error:', err);
      throw err;
    }
  }, [utils, cardId, refresh]);

  const createFile = useCallback(async (path: string, initialContent = ''): Promise<void> => {
    await writeFile(path, initialContent);
  }, [writeFile]);

  const mkdir = useCallback(async (path: string): Promise<void> => {
    try {
      await utils.client.vfs.mkdir.mutate({ 
        path, 
        provider: 'local',
        cardId 
      });
      await refresh();
    } catch (err) {
      console.error('[useCardVFS] Mkdir error:', err);
      throw err;
    }
  }, [utils, cardId, refresh]);

  /**
   * Load children for a directory (lazy loading)
   */
  const loadChildren = useCallback(async (dirPath: string): Promise<VFile[]> => {
    try {
      const result = await utils.vfs.list.fetch({ 
        path: dirPath, 
        provider: 'local',
        cardId 
      });
      
      return buildTree(result as Array<{ path: string; type: 'file' | 'directory' }>, dirPath);
    } catch (err) {
      console.error('[useCardVFS] Load children error:', err);
      return [];
    }
  }, [utils, cardId, buildTree]);

  return {
    files,
    currentPath,
    isLoading,
    error,
    navigateTo,
    refresh,
    readFile,
    writeFile,
    createFile,
    mkdir,
    loadChildren
  };
};