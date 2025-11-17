import React, { useState } from 'react';
import { Input } from 'flyonui';
import { trpc } from '../../utils/trpc';

const TerminalPage: React.FC = () => {
  const [command, setCommand] = useState('');
  const assistTerminal = trpc.agent.assistTerminal.useMutation();
  const executeTool = trpc.lootbox.executeTool.useMutation();

  const handleCommand = async () => {
    const correctedCommand = await assistTerminal.mutateAsync({ command });
    await executeTool.mutateAsync({ tool: correctedCommand });
    setCommand('');
  };

  return (
    <div>
      <h1>Terminal</h1>
      <Input
        value={command}
        onChange={(e) => setCommand(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            handleCommand();
          }
        }}
      />
    </div>
  );
};

export default TerminalPage;
