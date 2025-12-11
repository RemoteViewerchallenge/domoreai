import { useState, useEffect, useCallback } from 'react';
import { trpc } from '../utils/trpc';
import type { VFile } from '../stores/FileSystemTypes.js';

export const useVFS = (_token: string, initialPath: string = '/') => {
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [files, setFiles] = useState<VFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const utils = trpc.useUtils();

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await utils.vfs.list.fetch({ path: currentPath, provider: 'local' });
      setFiles(result as unknown as VFile[]);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to list files');
    } finally {
      setIsLoading(false);
    }
  }, [currentPath, utils]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const navigateTo = (path: string) => {
    setCurrentPath(path);
  };

  const readFile = async (path: string): Promise<string> => {
    try {
      const result = await utils.vfs.read.fetch({ path, provider: 'local' });
      return result.content;
    } catch (err) {
      console.error(err);
      return '';
    }
  };

  return {
    files,
    currentPath,
    isLoading,
    error,
    navigateTo,
    refresh,
    readFile
  };
};
