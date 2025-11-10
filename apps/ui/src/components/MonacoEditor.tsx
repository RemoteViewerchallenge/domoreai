import Editor, { type OnChange } from '@monaco-editor/react';

interface MonacoEditorProps {
  value: string;
  onChange: OnChange;
  language: string;
}

function MonacoEditor({ value, onChange, language }: MonacoEditorProps) {
  return (
    <Editor
      height="300px"
      language={language}
      value={value}
      onChange={onChange}
      theme="vs-dark"
    />
  );
}

export default MonacoEditor;