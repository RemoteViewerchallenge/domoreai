import React from 'react';
import Editor, { type OnChange } from '@monaco-editor/react';
import { MonacoLanguageClient } from 'monaco-languageclient';
import { toSocket, WebSocketMessageReader, WebSocketMessageWriter } from 'vscode-ws-jsonrpc';

interface MonacoEditorProps {
  value: string;
  onChange: OnChange;
  language: string;
}

function MonacoEditor({ value, onChange, language }: MonacoEditorProps) {
  function handleEditorDidMount(editor: any, monaco: any) {
    const url = 'ws://localhost:4000/language-server';
    const webSocket = new WebSocket(url);

    webSocket.onopen = () => {
      const socket = toSocket(webSocket);
      const reader = new WebSocketMessageReader(socket);
      const writer = new WebSocketMessageWriter(socket);
      const languageClient = new MonacoLanguageClient({
        name: 'TypeScript Language Client',
        clientOptions: {
          documentSelector: ['typescript'],
          errorHandler: {
            error: () => ({ action: 1 }),
            closed: () => ({ action: 1 })
          }
        },
        connectionProvider: {
          get: (errorHandler, closeHandler) => {
            return Promise.resolve({ reader, writer });
          }
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
      onMount={handleEditorDidMount}
    />
  );
}

export default MonacoEditor;
