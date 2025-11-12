import { useEffect } from 'react';
import useWebSocketStore from '../stores/websocket.store';

const useWebSocket = (vfsToken: string | null) => {
  const { status, messages, actions } = useWebSocketStore();

  useEffect(() => {
    if (vfsToken) {
      actions.connect(vfsToken);
    }

    return () => {
      actions.disconnect();
    };
  }, [vfsToken, actions]);

  return {
    status,
    messages,
    sendMessage: actions.sendMessage,
  };
};

export default useWebSocket;
