import React, { useState } from 'react';
import { Button, IconButton, Tooltip } from 'flyonui';
import { VscTerminal, VscSourceControl, VscSettingsGear, VscVm, VscOrganization } from 'react-icons/vsc';
import MonacoEditor from '../MonacoEditor';
import useSpeechRecognition from '../../hooks/useSpeechRecognition';
import { useCoreStore } from '../../stores/core';
import { trpc } from '../../utils/trpc';

const CommandBar: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const { isListening, transcript, startListening, stopListening } = useSpeechRecognition();
  const agentRunTask = trpc.agent.runTask.useMutation();
  const openPage = useCoreStore((state) => state.openPage);

  const handleRun = () => {
    agentRunTask.mutate({ prompt });
  };

  React.useEffect(() => {
    if (transcript) {
      setPrompt(transcript);
    }
  }, [transcript]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '10px', background: '#252526' }}>
      <div style={{ flex: 1, marginRight: '10px' }}>
        <MonacoEditor
          value={prompt}
          onChange={(value) => setPrompt(value || '')}
          language="plaintext"
          height="40px"
        />
      </div>
      <Button onClick={handleRun} style={{ marginRight: '10px' }}>
        Run
      </Button>
      <Tooltip content={isListening ? 'Stop Listening' : 'Start Listening'}>
        <IconButton onClick={isListening ? stopListening : startListening} style={{ marginRight: '10px' }}>
          <VscVm />
        </IconButton>
      </Tooltip>
      <Tooltip content="VFS">
        <IconButton onClick={() => openPage('vfs')} style={{ marginRight: '10px' }} aria-label="VFS">
          <VscSourceControl />
        </IconButton>
      </Tooltip>
      <Tooltip content="Terminal">
        <IconButton onClick={() => openPage('terminal')} style={{ marginRight: '10px' }} aria-label="Terminal">
          <VscTerminal />
        </IconButton>
      </Tooltip>
      <Tooltip content="Tasks">
        <IconButton onClick={() => openPage('tasks')} style={{ marginRight: '10px' }} aria-label="Tasks">
          <VscOrganization />
        </IconButton>
      </Tooltip>
      <Tooltip content="Options">
        <IconButton onClick={() => openPage('options')} aria-label="Options">
          <VscSettingsGear />
        </IconButton>
      </Tooltip>
    </div>
  );
};

export default CommandBar;
