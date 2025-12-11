import React from 'react';
import { Editor, type EditorProps } from '@monaco-editor/react';

interface MonacoEditorProps extends EditorProps {
  className?: string;
}

const MonacoEditor: React.FC<MonacoEditorProps> = ({ 
  className, 
  language = 'javascript', 
  theme = 'vs-dark', 
  value, 
  onChange, 
  options,
  ...props 
}) => {
  return (
    <div className={className} style={{ overflow: 'hidden' }}> 
      {/* ^ overflow: hidden is crucial here to stop the parent from expanding */}
      <Editor
        height="100%"
        width="100%"
        language={language}
        theme={theme}
        value={value}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onChange={(val) => onChange && onChange(val, {} as any)} 
        options={{
          ...options,
          // 👇 THIS IS THE FIX FOR THE SLIDER
          automaticLayout: true, 
          fontFamily: '"JetBrains Mono", "Fira Code", monospace',
          fontLigatures: true,
          minimap: { enabled: false },
        }}
        {...props}
      />
    </div>
  );
};

export default MonacoEditor;