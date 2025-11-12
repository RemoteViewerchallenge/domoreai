import React from 'react';
interface VfsViewerProps {
    files: {
        path: string;
        type: 'file' | 'dir';
    }[];
    workspaceName: string;
    isLoading: boolean;
}
export declare const VfsViewer: React.FC<VfsViewerProps>;
export {};
