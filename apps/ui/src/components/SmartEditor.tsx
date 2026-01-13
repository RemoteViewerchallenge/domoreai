import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import MonacoEditor from './MonacoEditor.js'; 
import { Bot, Loader2 } from 'lucide-react';
import { SmartContainer } from './nebula/containers/SmartContainer.js';

interface SmartEditorProps {
  fileName: string;
  content: string;
  onChange: (val: string) => void;
  isAiTyping?: boolean; // New prop to show AI activity
  onRun?: () => void;   // Callback for running the agent (Cmd+Enter)
}

const TiptapEditor = ({ content, onChange, isAiTyping, onRun }: { content: string, onChange: (val: string) => void, isAiTyping: boolean, onRun?: () => void }) => {
  const [isInitializing, setIsInitializing] = React.useState(true);
  
  const editor = useEditor({
    extensions: [
      StarterKit,
    ],
    content: content,
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none focus:outline-none min-h-[100px] text-zinc-300 text-sm p-4 h-full',
      },
    },
    onCreate: () => {
      setIsInitializing(false);
    },
    onUpdate: ({ editor }) => {
      // Only trigger onChange if the update was NOT from an external setContent
      // We check if the editor is focused to determine if user is typing
      if (editor.isFocused) {
        onChange(editor.getHTML());
      }
    },
  });

  // Keep Tiptap content synced if content prop changes externally (e.g. AI writes)
  // BUT avoid loops by checking focus - if focussed, we assume the user is typing
  useEffect(() => {
    if (editor && !editor.isDestroyed && !editor.isFocused && content !== editor.getHTML()) {
      editor.commands.setContent(content); 
    }
  }, [content, editor]);

  // Handle Cmd+Enter to Run
  useEffect(() => {
    if (!editor || editor.isDestroyed || !onRun) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter' && event.shiftKey) {
        event.preventDefault();
        onRun();
      }
    };

    try {
      if (!editor.isDestroyed && editor.view?.dom) {
        const dom = editor.view.dom;
        dom.addEventListener('keydown', handleKeyDown);
        return () => dom.removeEventListener('keydown', handleKeyDown);
      }
    } catch (e) {
      console.warn("SmartEditor: Error attaching keydown listener", e);
    }
  }, [editor, onRun]);

  return (
    <SmartContainer 
      type="DOCS" 
      title="Document Editor"
      onAiResponse={(res) => {
        const text = typeof res === 'string' ? res : res.content || res.text;
        if(editor && text) {
          editor.commands.setContent(text);
          onChange(text);
        }
      }}
    >
      {(registerContext) => {
        // Register context for AI
        if (editor && !editor.isDestroyed) {
          registerContext(() => editor.getText());
        }

        if (isInitializing || !editor) {
          return (
            <div className="h-full w-full flex flex-col items-center justify-center bg-zinc-950 text-zinc-500 gap-3">
               <Loader2 className="animate-spin text-purple-500" size={24} />
               <span className="text-xs font-medium uppercase tracking-widest animate-pulse">Initializing Editor...</span>
            </div>
          );
        }

        return (
          <div className="h-full w-full bg-zinc-900 overflow-y-auto relative flex flex-col group">
            {/* AI Status Indicator */}
            {isAiTyping && (
                <div className="absolute bottom-4 right-4 z-50 flex items-center gap-2 bg-purple-900/80 text-purple-400 px-2 py-1 rounded text-xs border border-purple-700 backdrop-blur-sm shadow-xl animate-in fade-in zoom-in">
                  <Bot size={12} className="animate-pulse" />
                  <span className="font-bold">AI Synchronizing...</span>
                </div>
              )}

            <EditorContent editor={editor} className="flex-1 h-full min-h-0" />
            
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-[10px] text-zinc-600 bg-black/40 px-2 py-0.5 rounded border border-zinc-800 uppercase font-bold">
                Tiptap (Rich Text)
              </span>
            </div>
          </div>
        );
      }}
    </SmartContainer>
  );
};

const SmartEditor: React.FC<SmartEditorProps> = ({ fileName, content, onChange, isAiTyping = false, onRun }) => {
  const isCode = /\.(ts|tsx|js|jsx|css|json|py|sh|yml|yaml|sql)$/.test(fileName);

  if (isCode) {
    const extension = fileName.split('.').pop() || 'text';
    return (
      <SmartContainer 
        type="MONACO" 
        title={`Code: ${fileName}`}
        onAiResponse={(res) => {
          const code = typeof res === 'string' ? res : res.content || res.code;
          if(code) onChange(code);
        }}
      >
        {(registerContext) => (
          <div className="h-full w-full relative flex flex-col">
            {isAiTyping && (
              <div className="absolute top-2 right-4 z-50 flex items-center gap-2 bg-emerald-900/80 text-emerald-400 px-2 py-1 rounded text-xs border border-emerald-700 backdrop-blur-sm animate-pulse shadow-lg">
                <Bot size={12} />
                <span className="font-bold">AI Refactoring...</span>
              </div>
            )}
            
            <MonacoEditor
              value={content}
              onChange={(val) => onChange(val || '')}
              // Map tsx/jsx to typescript/javascript for Monaco
              language={extension === 'tsx' ? 'typescript' : extension === 'jsx' ? 'javascript' : extension} 
              theme="vs-dark"
              onMount={(editor) => {
                registerContext(() => editor.getValue());
              }}
              options={{
                minimap: { enabled: true },
                wordWrap: 'on',
                readOnly: isAiTyping,
              }} 
            />
          </div>
        )}
      </SmartContainer>
    );
  }

  return <TiptapEditor key={fileName} content={content} onChange={onChange} isAiTyping={isAiTyping} onRun={onRun} />;
};

export default SmartEditor;
