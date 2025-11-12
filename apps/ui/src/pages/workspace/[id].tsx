import { useParams } from 'react-router-dom';
import { trpc } from '../../utils/trpc';
import { VfsViewer } from '../../components/VfsViewer';
import { GitControls } from '../../components/GitControls';
import { useState, useEffect } from 'react';
import { Panel } from '../../components/ui/Panel';

const MyWorkspacePage = () => {
  const { id } = useParams<{ id: string }>();
  const workspaceName = id || 'default';

  const [vfsToken, setVfsToken] = useState<string | null>(null);

  const tokenMutation = trpc.vfs.getToken.useMutation<any>({
    onSuccess: (data: any) => setVfsToken(data.token),
  });

  useEffect(() => {
    if (workspaceName) {
      tokenMutation.mutate({ workspaceId: workspaceName });
    }
  }, [workspaceName, tokenMutation.mutate]); // Added tokenMutation.mutate to dependency array

  const {
    data: files,
    isLoading,
    isError,
    error,
  } = trpc.vfs.listFiles.useQuery(
    { vfsToken: vfsToken! }, // Input
    { enabled: !!vfsToken }  // Options
  );

  return (
    <div className="flex h-screen flex-col gap-4 bg-neutral-900 p-4 text-neutral-100">
      <div className="flex items-center justify-between">
         <h1 className="text-xl font-bold text-neon-cyan">Workspace: {workspaceName}</h1>
      </div>
      
      <div className="flex flex-grow gap-4 overflow-hidden">
        {/* Left Sidebar: File Tree */}
        <div className="w-64 flex-shrink-0">
            <Panel borderColor="border-purple-500">
                <div className="h-full flex flex-col">
                    <div className="p-2 font-bold border-b border-neutral-800">Explorer</div>
                    <div className="flex-grow overflow-hidden">
                        <VfsViewer
                        files={files || []}
                        workspaceName={workspaceName!}
                        isLoading={isLoading || tokenMutation.isPending }
                        />
                    </div>
                    {isError && <p className="p-2 text-xs text-red-500">Error: {error?.message}</p>}
                </div>
            </Panel>
        </div>

        {/* Main Content Area (Placeholder for Editor) */}
        <div className="flex-grow">
             <Panel borderColor="border-green-400">
                <div className="flex items-center justify-center h-full text-neutral-500">
                    Select a file to edit (Editor Component coming in Epic 12)
                </div>
             </Panel>
        </div>

        {/* Right Sidebar: Git & Tools */}
        <div className="w-80 flex-shrink-0 flex flex-col gap-4">
            {vfsToken && <GitControls vfsToken={vfsToken} />}
        </div>
      </div>
    </div>
  );
};

export default MyWorkspacePage;
