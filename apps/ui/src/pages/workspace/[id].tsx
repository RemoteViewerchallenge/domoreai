import { useParams } from 'react-router-dom';

import { GitControls } from '../../components/GitControls.js';
import { FileExplorer } from '../../components/FileExplorer.js';
import MonacoEditor from '../../components/MonacoEditor.js';
import { useVFS } from '../../hooks/useVFS.js';
import { useEffect, useState } from 'react';
import { Panel } from '../../components/ui/Panel.js';

/**
 * Renders the main workspace page for a given workspace ID.
 * This component fetches a VFS token, lists the files in the workspace's virtual file system,
 * and displays the file explorer, a placeholder for the editor, and Git controls.
 * @returns {JSX.Element} The rendered workspace page.
 */
const MyWorkspacePage = () => {
  const { id } = useParams<{ id: string }>();
  const workspaceName = id || 'default';
  const [activeTab, setActiveTab] = useState('files');
  const [vfsToken] = useState<string>('mock-token-for-now'); // Placeholder

  const { files, currentPath, isLoading, error, navigateTo, refresh, readFile } = useVFS(vfsToken, '/');

  const [editorContent, setEditorContent] = useState('');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const handleFileSelect = async (path: string) => {
    const content = await readFile(path);
    setEditorContent(content);
    setSelectedFile(path);
  };

  useEffect(() => {
    if (activeTab === 'brain') {
      navigateTo('/packages/agents/sops');
    } else {
      navigateTo('/');
    }
  }, [activeTab, navigateTo]);

  return (
    <div className="flex h-screen flex-col gap-4 bg-neutral-900 p-4 text-neutral-100">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-neon-cyan">Workspace: {workspaceName}</h1>
      </div>

      <div className="flex flex-grow gap-4 overflow-hidden">
        {/* Left Sidebar: File Tree */}
        <div className="w-64 flex-shrink-0">
          <Panel borderColor="border-purple-500">
            <div className="h-full flex flex-col">
              <div className="flex border-b border-neutral-800">
                <button
                  className={`flex-1 p-2 font-bold text-center ${
                    activeTab === 'files' ? 'bg-neutral-800' : ''
                  }`}
                  onClick={() => setActiveTab('files')}
                >
                  Files
                </button>
                <button
                  className={`flex-1 p-2 font-bold text-center ${
                    activeTab === 'brain' ? 'bg-neutral-800' : ''
                  }`}
                  onClick={() => setActiveTab('brain')}
                >
                  Brain
                </button>
              </div>
              <div className="flex-grow overflow-auto p-2">
                {isLoading && <p>Loading...</p>}
                {error && <p className="text-red-500">{error}</p>}
                {!isLoading && !error && (
                  <FileExplorer
                    files={files}
                    onSelect={handleFileSelect}
                    currentPath={currentPath}
                    onNavigate={navigateTo}
                    onRefresh={refresh}
                  />
                )}
              </div>
            </div>
          </Panel>
        </div>

        {/* Main Content Area (Placeholder for Editor) */}
        <div className="flex-grow">
          <Panel borderColor="border-green-400">
            {selectedFile ? (
              <MonacoEditor
                filePath={selectedFile}
                content={editorContent}
                onContentChange={setEditorContent}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-neutral-500">
                Select a file to edit
              </div>
            )}
          </Panel>
        </div>

        {/* Right Sidebar: Git & Tools */}
        <div className="w-80 flex-shrink-0 flex flex-col gap-4">
          {vfsToken && <GitControls vfsToken={vfsToken} />}
        </div>
      </div>
    </div>
  );
};

export default MyWorkspacePage;
