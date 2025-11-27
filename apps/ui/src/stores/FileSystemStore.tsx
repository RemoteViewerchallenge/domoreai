import React, { useState, useCallback } from 'react';
import type { FileSystemProviderType } from './FileSystemTypes.js';
import { trpc } from '../utils/trpc.js';
import type { SshConfig } from '../components/SshConnectionModal.js';
import { FileSystemContext } from './FileSystemContext.js';

export const FileSystemProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const utils = trpc.useUtils();
  
  // --- STATE ---
  const [currentProvider, setProvider] = useState<FileSystemProviderType>('local');
  const [sshConnectionId, setSshConnection] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState<string>('/home/guy/CORE_Workspace');

  // --- TRPC QUERIES ---
  const listQuery = trpc.vfs.list.useQuery({
    path: currentPath,
    provider: currentProvider,
    connectionId: sshConnectionId || undefined
  }, {
    keepPreviousData: true,
    refetchOnWindowFocus: false
  });

  // --- TRPC MUTATIONS ---
  const { mutateAsync: writeMutateAsync } = trpc.vfs.write.useMutation({
    onSuccess: () => utils.vfs.list.invalidate()
  });
  
  const { mutateAsync: mkdirMutateAsync } = trpc.vfs.mkdir.useMutation({
    onSuccess: () => utils.vfs.list.invalidate()
  });
  
  const { mutateAsync: connectSshMutateAsync } = trpc.vfs.connectSsh.useMutation();

  // --- ACTIONS ---

  const refresh = useCallback(() => {
     listQuery.refetch();
  }, [listQuery]);

  const readFile = useCallback(async (path: string) => {
    // We use the direct client to fetch on demand
    const result = await utils.client.vfs.read.query({
        path,
        provider: currentProvider,
        connectionId: sshConnectionId || undefined
    });
    return result.content;
  }, [utils, currentProvider, sshConnectionId]);

  const writeFile = useCallback(async (path: string, content: string) => {
    await writeMutateAsync({
        path,
        content,
        provider: currentProvider,
        connectionId: sshConnectionId || undefined
    });
  }, [writeMutateAsync, currentProvider, sshConnectionId]);

  const createFile = useCallback(async (path: string, initialContent = '') => {
     await writeMutateAsync({
         path,
         content: initialContent,
         provider: currentProvider,
         connectionId: sshConnectionId || undefined
     });
  }, [writeMutateAsync, currentProvider, sshConnectionId]);
  
  const mkdir = useCallback(async (path: string) => {
      await mkdirMutateAsync({
          path,
          provider: currentProvider,
          connectionId: sshConnectionId || undefined
      });
  }, [mkdirMutateAsync, currentProvider, sshConnectionId]);

  const connectSsh = useCallback(async (config: SshConfig) => {
      const result = await connectSshMutateAsync({
          host: config.host,
          port: config.port,
          username: config.username,
          password: config.password,
          privateKey: config.privateKey
      });
      setSshConnection(result.connectionId);
      setProvider('ssh');
      return result.connectionId;
  }, [connectSshMutateAsync]);

  return (
    <FileSystemContext.Provider value={{ 
        files: listQuery.data || [], 
        currentProvider, 
        sshConnectionId, 
        currentPath,
        isLoading: listQuery.isLoading,
        setProvider, 
        setSshConnection,
        navigate: setCurrentPath,
        readFile, 
        writeFile, 
        createFile,
        mkdir,
        connectSsh,
        refresh
    }}>
      {children}
    </FileSystemContext.Provider>
  );
};
