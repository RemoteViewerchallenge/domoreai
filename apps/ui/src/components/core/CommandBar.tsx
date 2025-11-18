import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { Button, IconButton, Tooltip } from 'flyonui';
import { VscMic, VscTerminal, VscVm, VscSettingsGear, VscBook, VscTable } from 'react-icons/vsc';
import useSpeechRecognition from '../../hooks/useSpeechRecognition';
import { useCoreStore } from '../../stores/coreStore';
import { trpc } from '../../utils/trpc';

const CommandBar: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const { isListening, transcript, startListening, stopListening } = useSpeechRecognition();
  const openPage = useCoreStore(state => state.openPage);
  const activeRoleId = useCoreStore(state => state.activeRoleId);
  const runTaskMutation = trpc.agent.runTask.useMutation();

  const handleRun = () => {
    runTaskMutation.mutate({ prompt, roleId: activeRoleId });
  };

  React.useEffect(() => {
    if (transcript) {
      setPrompt(transcript);
    }
  }, [transcript]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '8px', gap: '8px' }}>
      <Editor
        height="40px"
        defaultLanguage="plaintext"
        value={prompt}
        onChange={(value) => setPrompt(value || '')}
        options={{
          minimap: { enabled: false },
          lineNumbers: 'off',
          glyphMargin: false,
          folding: false,
          lineDecorationsWidth: 0,
          lineNumbersMinChars: 0,
          scrollBeyondLastLine: false,
          wordWrap: 'on',
        }}
      />
      <Button onClick={handleRun}>Run</Button>
      <Tooltip content={isListening ? 'Stop Listening' : 'Start Listening'}>
        <IconButton onClick={isListening ? stopListening : startListening}>
          <VscMic />
        </IconButton>
      </Tooltip>
      <Tooltip content="VFS">
        <IconButton onClick={() => openPage('vfs')}>
          <VscBook />
        </IconButton>
      </Tooltip>
      <Tooltip content="Terminal">
        <IconButton onClick={() => openPage('terminal')}>
          <VscTerminal />
        </IconButton>
      </Tooltip>
      <Tooltip content="Spreadsheet">
        <IconButton onClick={() => openPage('spreadsheet')}>
          <VscTable />
        </IconButton>
      </Tooltip>
      <Tooltip content="Tasks">
        <IconButton onClick={() => openPage('tasks')}>
          <VscVm />
        </IconButton>
      </Tooltip>
      <Tooltip content="Options">
        <IconButton onClick={() => openPage('options')}>
          <VscSettingsGear />
        </IconButton>
      </Tooltip>
    </div>
  );
};

export default CommandBar;
