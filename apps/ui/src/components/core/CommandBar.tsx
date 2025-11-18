import React, { useState } from 'react';
import { Button, IconButton, Tooltip, Dialog } from 'flyonui';
import { Mic, FileText, Terminal, Table, ListChecks, Settings } from 'lucide-react';
import MonacoEditor from '../MonacoEditor';
import useSpeechRecognition from '../../hooks/useSpeechRecognition';
import { useCoreStore } from '../../stores/useCoreStore';
import { trpc } from '../../utils/trpc';
import OptionsPanel from './OptionsPanel';

const CommandBar: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const { text, isListening, startListening, stopListening, hasRecognitionSupport } = useSpeechRecognition();
  const { openPage, activeRoleId } = useCoreStore();
  const runTaskMutation = trpc.agent.runTask.useMutation();

  const handleRunTask = () => {
    runTaskMutation.mutate({ prompt, activeRoleId });
  };

  return (
    <>
      <div className="flex items-center gap-2 p-2 bg-gray-100 rounded-md">
        <div className="flex-grow">
          <MonacoEditor
            value={prompt}
            onChange={(value) => setPrompt(value || '')}
            language="plaintext"
            height="40px"
          />
        </div>
        <Tooltip content="Run">
          <Button onClick={handleRunTask}>Run</Button>
        </Tooltip>
        {hasRecognitionSupport && (
          <Tooltip content={isListening ? 'Stop listening' : 'Start listening'}>
            <IconButton onClick={isListening ? stopListening : startListening}>
              <Mic className={isListening ? 'text-red-500' : ''} />
            </IconButton>
          </Tooltip>
        )}
        <Tooltip content="VFS">
          <IconButton onClick={() => openPage({ id: 'vfs', type: 'VFS', title: 'File System' })}>
            <FileText />
          </IconButton>
        </Tooltip>
        <Tooltip content="Terminal">
          <IconButton onClick={() => openPage({ id: 'terminal', type: 'TERMINAL', title: 'Terminal' })}>
            <Terminal />
          </IconButton>
        </Tooltip>
        <Tooltip content="Spreadsheet">
          <IconButton onClick={() => openPage({ id: 'spreadsheet', type: 'SPREADSHEET', title: 'Spreadsheet' })}>
            <Table />
          </IconButton>
        </Tooltip>
        <Tooltip content="Tasks">
          <IconButton onClick={() => openPage({ id: 'tasks', type: 'TASKS', title: 'Tasks' })}>
            <ListChecks />
          </IconButton>
        </Tooltip>
        <Tooltip content="Options">
          <IconButton onClick={() => setIsOptionsOpen(true)}>
            <Settings />
          </IconButton>
        </Tooltip>
      </div>
      <Dialog open={isOptionsOpen} onOpenChange={setIsOptionsOpen}>
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>Options</Dialog.Title>
          </Dialog.Header>
          <OptionsPanel />
        </Dialog.Content>
      </Dialog>
    </>
  );
};

export default CommandBar;
