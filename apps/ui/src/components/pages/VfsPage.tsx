import React from 'react';
import { TreeView } from 'flyonui';
import { trpc } from '../../utils/trpc';

const VfsPage: React.FC = () => {
  const { data, error, isLoading } = trpc.vfs.listFiles.useQuery({
    vfsToken: 'mock-token-for-now',
    path: '/',
  });
  const moveFile = trpc.vfs.renameFile.useMutation();

  const handleDrop = (draggedPath: string, targetPath: string) => {
    moveFile.mutate({ vfsToken: 'mock-token-for-now', from: draggedPath, to: targetPath });
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <div>
      <h1>VFS</h1>
      <TreeView data={data} onDrop={handleDrop} />
    </div>
  );
};

export default VfsPage;
