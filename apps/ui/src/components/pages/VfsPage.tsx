import React from 'react';
import { trpc } from '../../utils/trpc';
import { TreeView } from '../TreeView';

export const VfsPage: React.FC = () => {
  const { data: tree, isLoading, error } = trpc.vfs.getTree.useQuery();
  const moveFileMutation = trpc.vfs.moveFile.useMutation();

  const handleMove = (source: string, destination: string) => {
    moveFileMutation.mutate({ from: source, to: destination });
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <div>
      <h2 className="text-lg font-bold mb-4">VFS Page</h2>
      {tree && <TreeView tree={tree} onMove={handleMove} />}
    </div>
  );
};
