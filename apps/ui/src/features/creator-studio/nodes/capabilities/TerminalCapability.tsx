import React from 'react';
import XtermTerminal from '../../../../components/XtermTerminal';
import useWebSocketStore from '../../../../stores/websocket.store';

export const TerminalCapability = ({ nodeId }: { nodeId: string }) => {
  const { messages, actions } = useWebSocketStore();

  return (
    <div className="h-full w-full bg-black pl-1 pt-1">
      <XtermTerminal 
        logs={messages}
        workingDirectory={`/nodes/${nodeId}`}
        onInput={(cmd) => actions.sendMessage({ command: cmd })}
      />
    </div>
  );
};
