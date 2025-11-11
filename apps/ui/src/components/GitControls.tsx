import { useState } from 'react';
import { trpc } from '../utils/trpc.js';
import { Button } from './ui/Button.js'; // Using your UI kit
import { Icon } from './ui/Icon.js'; // Using your UI kit
import { Panel } from './ui/Panel.js'; // Using your UI kit

// This component now assumes it's being passed the vfsToken
interface GitControlsProps {
  vfsToken: string;
}

export function GitControls({ vfsToken }: GitControlsProps) {
  const [commitMessage, setCommitMessage] = useState('');
  const [showLog, setShowLog] = useState(false);

  const gitCommit = trpc.git.commit.useMutation();

  // The input `{ vfsToken }` and options `{ enabled: ... }` must be separate arguments.
  const gitLog = trpc.git.log.useQuery(
    { vfsToken },
    { enabled: showLog && !!vfsToken },
  );

  const handleCommit = () => {
    if (!vfsToken) return; // Don't commit without a token
    gitCommit.mutate({ vfsToken, message: commitMessage });
    setCommitMessage(''); // Clear message on commit
  };

  if (!vfsToken) {
    return (
      <Panel borderColor="border-red-500">
        <p className="text-red-400">Git Controls: vfsToken not available.</p>
      </Panel>
    );
  }

  return (
    <Panel borderColor="border-blue-400">
      <div className="flex flex-col space-y-2 p-2">
        <h3 className="text-lg font-semibold">Git Controls</h3>
        <div className="flex space-x-2">
          <input
            type="text"
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            placeholder="Commit message..."
            className="flex-grow rounded-md border border-neutral-700 bg-neutral-900 p-2 text-neutral-100"
          />
          <Button
            onClick={handleCommit}
            disabled={gitCommit.isPending || !commitMessage}
            size="sm"
          >
            <Icon name="git-commit" /> Commit
          </Button>
        </div>
        <Button
          onClick={() => setShowLog(prev => !prev)}
          size="sm"
          variant="ghost"
        >
          {showLog ? 'Hide Log' : 'View Log'}
        </Button>

        {gitCommit.isSuccess && (
          <p className="text-green-400">Commit successful!</p>
        )}
        {gitCommit.isError && gitCommit.error && (
          <p className="text-red-400">Error: {gitCommit.error?.message}</p>
        )}

        {showLog && (
          <div className="mt-2 rounded-md border border-neutral-700 bg-neutral-900 p-2">
            <h4 className="text-md font-semibold">Git Log</h4>
            {gitLog.isLoading && <p>Loading log...</p>}
            {gitLog.isError && gitLog.error && (
              <p className="text-red-400">Error: {gitLog.error?.message}</p>
            )}
            {gitLog.data && (
              <pre className="h-48 overflow-auto text-xs">
                {gitLog.data.map((log) => (
                  <div key={log.hash}>
                    <p className="text-yellow-400">commit {log.hash}</p>
                    <p>Author: {log.author}</p>
                    <p>Date: {log.date}</p>
                    <p className="mt-2 mb-2 ml-4">{log.message}</p>
                  </div>
                ))}
              </pre>
            )}
          </div>
        )}
      </div>
    </Panel>
  );
}