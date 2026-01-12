import { useRef } from 'react';
import { SmartContainer } from './nebula/containers/SmartContainer.js';
import MonacoEditor from './MonacoEditor.js';

export const SmartMonacoEditor = ({ value, path, language, onChange }: { value: string, path?: string, language?: string, onChange?: (val: string | undefined) => void }) => {
  const editorRef = useRef<any>(null);
  const detectedLanguage = language || (path?.split('.').pop()) || 'javascript';

  return (
    <SmartContainer 
      type="MONACO" 
      title={`Editor (${language})`}
      onAiResponse={(res) => {
          // AI wrote code -> Inject it
          // Assuming SuperAiButton response has the code or is the code string
          const code = typeof res === 'string' ? res : res.content || res.code;
          if(editorRef.current && code) {
              editorRef.current.setValue(code);
          }
      }}
    >
      {(registerContext) => (
        <MonacoEditor 
          path={path}
          value={value}
          language={detectedLanguage}
          onChange={onChange}
          onMount={(editor) => {
             editorRef.current = editor;
             // VITAL: Tell the SmartContainer how to read this component
             registerContext(() => editor.getValue());
          }}
        />
      )}
    </SmartContainer>
  );
};
