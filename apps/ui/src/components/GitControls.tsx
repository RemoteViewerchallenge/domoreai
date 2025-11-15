import { useState } from 'react';
import { trpc } from '../utils/trpc';
import { Button } from './ui/Button';
import Icon from './ui/Icon';
import { Panel } from './ui/Panel';

interface GitControlsProps {
  vfsToken: string;
}

export function GitControls({ vfsToken }: GitControlsProps) {
  const [commitMessage, setCommitMessage] = useState('');
  const [showLog, setShowLog] = useState(false);

  const gitCommit = trpc.git.commit.useMutation();

  const gitLog = trpc.git.log.useQuery(
    { vfsToken }, // Input
    { enabled: showLog && !!vfsToken } // Options
  );

  const handleCommit = () => {
    if (!vfsToken) return;
    gitCommit.mutate({ vfsToken, message: commitMessage });
    setCommitMessage('');
  };

  if (!vfsToken) {
    return (
      <Panel borderColor="border-red-500">
        <div className="p-2 text-red-400">Git Controls: vfsToken not available.</div>
      </Panel>
    );
  }

  return (
    <Panel borderColor="border-blue-400">
      <div className="flex flex-col space-y-2 p-2">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-neutral-100">Git Controls</h3>
          <Button onClick={() => setShowLog(!showLog)} size="sm" variant="ghost">
            {showLog ? 'Hide Log' : 'View Log'}
          </Button>
        </div>

        <div className="flex space-x-2">
          <input
            type="text"
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            placeholder="Commit message..."
            className="flex-grow rounded-md border border-neutral-700 bg-neutral-900 p-2 text-neutral-100 placeholder-neutral-500 focus:border-blue-500 focus:outline-none"
          />
          <Button onClick={handleCommit} disabled={gitCommit.isLoading} size="sm">
            <Icon name="git-commit" /> Commit
          </Button>
        </div>

        {gitCommit.isSuccess && <p className="text-xs text-green-400">Commit successful!</p>}
        {gitCommit.isError && <p className="text-xs text-red-400">Error: {gitCommit.error?.message}</p>}

        {showLog && (
          <div className="mt-2 rounded-md border border-neutral-700 bg-neutral-950 p-2">
            {gitLog.isLoading && <p className="text-xs text-neutral-400">Loading log...</p>}
            {gitLog.isError && <p className="text-xs text-red-400">Error: {gitLog.error?.message}</p>}
            {gitLog.data && (
              <pre className="h-48 overflow-auto text-xs font-mono text-neutral-300">
                {Array.isArray(gitLog.data) ? (
                    gitLog.data.map((log: any, i: number) => (
                    <div key={i} className="mb-2 border-b border-neutral-800 pb-1 last:border-0">
                        <span className="text-yellow-400">{log.hash?.substring(0, 7)}</span>
                        <span className="ml-2 text-neutral-500">{log.date}</span>
                        <div className="ml-4 text-neutral-200">{log.message}</div>
                    </div>
                    ))
                ) : (
                    JSON.stringify(gitLog.data, null, 2)
                )}
              </pre>
            )}
          </div>
        )}
      </div>
    </Panel>
  );
}