
import { FC, useState } from 'react';
import Editor from '@monaco-editor/react';
import { Button } from '@repo/ui/components/ui/button';
import { Send, Mic, Folder, Terminal, Sheet, Settings } from 'lucide-react';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@repo/ui/components/ui/tooltip';
import useSpeechRecognition from '../../hooks/useSpeechRecognition';
import { trpc } from '../../utils/trpc';
import { useCoreStore } from '../../stores/core';

const CommandBar: FC = () => {
  const [task, setTask] = useState('');
  const {
    isListening,
    transcript,
    startListening,
    stopListening,
    error,
    isSupported,
  } = useSpeechRecognition();
  const activeRoleId = useCoreStore((state) => state.activeRoleId);
  const openPage = useCoreStore((state) => state.openPage);

  trpc.agent.runTask.useSubscription(
    { prompt: task, activeRoleId: activeRoleId || '' },
    {
      onData: (data) => {
        console.log(data);
        // In a real implementation, you would append the data to the editor
      },
      enabled: !!activeRoleId,
    }
  );

  const handleRunTask = () => {
    // The subscription will automatically run when the task or activeRoleId changes
  };

  const handleMicClick = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <div className="flex items-center space-x-2 p-2 rounded-lg">
      <div className="flex-grow">
        <Editor
          height="90px"
          defaultLanguage="markdown"
          value={isListening ? transcript : task}
          onChange={(value) => setTask(value || '')}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            wordWrap: 'on',
            lineNumbers: 'off',
            glyphMargin: false,
            folding: false,
            lineDecorationsWidth: 0,
            lineNumbersMinChars: 0,
          }}
        />
        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
      </div>

      <div className="flex flex-col space-y-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button onClick={handleRunTask} size="icon" disabled={!task.trim() || !activeRoleId}>
                <Send className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Run</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={handleMicClick}
                size="icon"
                variant={isListening ? 'destructive' : 'outline'}
                disabled={!isSupported}
              >
                <Mic className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isListening ? 'Stop Listening' : 'Start Listening'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="flex flex-col space-y-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button onClick={() => openPage('vfs')} size="icon" variant="ghost">
                <Folder className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>VFS</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button onClick={() => openPage('terminal')} size="icon" variant="ghost">
                <Terminal className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Terminal</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <div className="flex flex-col space-y-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button onClick={() => openPage('spreadsheet')} size="icon" variant="ghost">
              <Sheet className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Spreadsheet</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button onClick={() => openPage('options')} size="icon" variant="ghost">
              <Settings className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Options</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
};

export default CommandBar;
