import { Editor, type OnChange, type OnMount } from '@monaco-editor/react'; // Import OnMount
import { MonacoLanguageClient } from 'monaco-languageclient';
import { toSocket, WebSocketMessageReader, WebSocketMessageWriter } from 'vscode-ws-jsonrpc';

interface MonacoEditorProps {
  value: string;
  onChange: OnChange;
  language: string;
}

function MonacoEditor({ value, onChange, language }: MonacoEditorProps) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function handleEditorDidMount(_editor: unknown) { // Correctly type monaco
    const url = 'ws://localhost:4000/language-server';
    const webSocket = new WebSocket(url);

    webSocket.onopen = () => {
      const languageClient = new MonacoLanguageClient({
        name: 'TypeScript Language Client',
        clientOptions: {
          documentSelector: ['typescript'],
          errorHandler: {
            error: () => ({ action: 1 }),
            closed: () => ({ action: 1 })
          }
        },
        messageTransports: {
          reader: new WebSocketMessageReader(toSocket(webSocket)),
          writer: new WebSocketMessageWriter(toSocket(webSocket))
        }
      });
      languageClient.start();
    };
  }

  return (
    <Editor
      height="300px"
      language={language}
      value={value}
      onChange={onChange}
      theme="vs-dark"
      onMount={handleEditorDidMount as OnMount} // Cast to OnMount
    />
  );
}

export default MonacoEditor;
