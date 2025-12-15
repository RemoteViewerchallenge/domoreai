import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import MonacoEditor from './MonacoEditor.js'; // Your existing wrapper
import { Bot } from 'lucide-react';

interface SmartEditorProps {
  fileName: string;
  content: string;
  onChange: (val: string) => void;
  isAiTyping?: boolean; // New prop to show AI activity
  onRun?: () => void;   // Callback for running the agent (Cmd+Enter)
}

const TiptapEditor = ({ content, onChange, isAiTyping, onRun }: { content: string, onChange: (val: string) => void, isAiTyping: boolean, onRun?: () => void }) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      // No placeholder extension, start empty
    ],
    content: content,
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none focus:outline-none min-h-[100px] text-gray-300 text-sm p-4',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Keep Tiptap content synced if content prop changes externally (e.g. AI writes)
  useEffect(() => {
    if (editor && !editor.isDestroyed && content !== editor.getHTML()) {
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

    // Safely access DOM
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
    <div className="h-full w-full bg-zinc-900 overflow-y-auto relative flex flex-col">
       {/* AI Status Indicator */}
       {isAiTyping && (
          <div className="absolute bottom-4 right-4 z-50 flex items-center gap-2 bg-purple-900/80 text-purple-400 px-2 py-1 rounded text-xs border border-purple-700 backdrop-blur-sm">
            <Bot size={12} />
            <span>AI Generating...</span>
          </div>
        )}

      <EditorContent editor={editor} className="flex-1" />
    </div>
  );
};

const SmartEditor: React.FC<SmartEditorProps> = ({ fileName, content, onChange, isAiTyping = false, onRun }) => {
  // 1. DETECT FILE TYPE
  // If it ends in .ts, .js, .css, .json -> It's CODE (Monaco)
  // If it ends in .md, .txt, or no extension -> It's TEXT (Tiptap)
  const isCode = /\.(ts|tsx|js|jsx|css|json|py)$/.test(fileName);

  // --- RENDER: CODE MODE (Monaco) ---
  if (isCode) {
    return (
      <div className="h-full w-full flex flex-col relative">
        {/* AI Status Indicator overlay */}
        {isAiTyping && (
          <div className="absolute top-2 right-4 z-50 flex items-center gap-2 bg-green-900/80 text-green-400 px-2 py-1 rounded text-xs border border-green-700 backdrop-blur-sm animate-pulse">
            <Bot size={12} />
            <span>AI Writing...</span>
          </div>
        )}
        
        <MonacoEditor
          value={content}
          onChange={(val) => onChange(val || '')}
          language={fileName.split('.').pop()} 
          theme="vs-dark"
          options={{
            minimap: { enabled: true },
            wordWrap: 'off',
            readOnly: isAiTyping, // Optional: Lock file while AI types?
          }} 
        />
      </div>
    );
  }

  // --- RENDER: TEXT MODE (Tiptap) ---
  return <TiptapEditor key={fileName} content={content} onChange={onChange} isAiTyping={isAiTyping} onRun={onRun} />;
};

export default SmartEditor;
