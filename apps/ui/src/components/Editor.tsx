import Editor from "@monaco-editor/react";

/**
 * @component MonacoEditor
 * @description A wrapper component for the Monaco Editor.
 * @returns {JSX.Element} The Monaco Editor component.
 */
export default function MonacoEditor() {
  return (
    <Editor
      height="90vh"
      defaultLanguage="javascript"
      defaultValue="// some comment"
    />
  );
}
