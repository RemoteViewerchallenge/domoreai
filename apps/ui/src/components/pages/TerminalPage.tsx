import React, { useState } from 'react';
import { trpc } from '../../utils/trpc';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

export const TerminalPage: React.FC = () => {
  const [command, setCommand] = useState('');
  const [output, setOutput] = useState('');

  const assistTerminalMutation = trpc.agent.assistTerminal.useMutation();
  const executeToolMutation = trpc.lootbox.executeTool.useMutation();

  const handleCommandChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCommand(e.target.value);
  };

  const handleExecute = async () => {
    const assistedCommand = await assistTerminalMutation.mutateAsync({ command });
    const result = await executeToolMutation.mutateAsync({
      tool: assistedCommand.tool,
      args: assistedCommand.args,
    });
    setOutput(result.output);
  };

  return (
    <div>
      <h2 className="text-lg font-bold mb-4">AI-Assisted Terminal</h2>
      <div className="flex gap-2">
        <Input
          type="text"
          value={command}
          onChange={handleCommandChange}
          placeholder="Enter a command"
          className="flex-grow"
        />
        <Button onClick={handleExecute}>Execute</Button>
      </div>
      <pre className="mt-4 p-4 bg-neutral-800 rounded-lg">{output}</pre>
    </div>
  );
};
