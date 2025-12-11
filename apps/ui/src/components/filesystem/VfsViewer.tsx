import React from 'react';

interface VfsViewerProps {
  files: { path: string; type: 'file' | 'dir' }[];
  workspaceName: string;
  isLoading: boolean;
}

export const VfsViewer: React.FC<VfsViewerProps> = ({ files, isLoading }) => {
  if (isLoading) {
    return <div>Loading files...</div>;
  }

  return (
    <pre>{JSON.stringify(files, null, 2)}</pre>
  );
};
