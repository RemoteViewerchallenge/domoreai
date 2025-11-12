import React, { useRef, useEffect, useMemo } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import type { TerminalMessage } from '@repo/common/agent';

interface TerminalLogViewerProps {
  messages: TerminalMessage[];
}

const TerminalLogViewer: React.FC<TerminalLogViewerProps> = ({ messages }) => {
  const editorRef = useRef<any>(null);

  const handleEditorDidMount: OnMount = (editor) => {
    editorRef.current = editor;
  };

  const formattedMessages = useMemo(() => {
    return messages
      .map((msg) => `[${msg.timestamp}] [${msg.type.toUpperCase()}] ${msg.message}`)
      .join('\n');
  }, [messages]);

  useEffect(() => {
    if (editorRef.current) {
      const model = editorRef.current.getModel();
      if (model) {
        editorRef.current.revealLine(model.getLineCount());
      }
    }
  }, [messages]);

  return (
    <Editor
      height="100%"
      width="100%"
      language="log"
      theme="vs-dark"
      value={formattedMessages}
      onMount={handleEditorDidMount}
      options={{
        readOnly: true,
        domReadOnly: true,
        lineNumbers: 'off',
        minimap: { enabled: false },
        wordWrap: 'on',
        scrollBeyondLastLine: false,
        folding: false,
        glyphMargin: false,
        lineDecorationsWidth: 0,
        lineNumbersMinChars: 0,
      }}
    />
  );
};

export default TerminalLogViewer;
