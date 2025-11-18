import { useParams } from 'react-router-dom';
import { useState } from 'react';

import { GitControls } from '../../components/GitControls';
import { Panel } from '../../components/ui/Panel';
import { VfsPage } from '../../components/pages/VfsPage';
import { TerminalPage } from '../../components/pages/TerminalPage';
import { SpreadsheetPage } from '../../components/pages/SpreadsheetPage';

type Tab = 'editor' | 'terminal' | 'spreadsheet';

/**
 * Renders the main workspace page for a given workspace ID.
 * This component displays the file explorer, a tabbed interface for the editor,
 * terminal, and spreadsheet, and Git controls.
 * @returns {JSX.Element} The rendered workspace page.
 */
const MyWorkspacePage = () => {
  const { id } = useParams<{ id: string }>();
  const workspaceName = id || 'default';

  const [vfsToken] = useState<string>('mock-token-for-now'); // Placeholder
  const [activeTab, setActiveTab] = useState<Tab>('editor');

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
              <div className="p-2 font-bold border-b border-neutral-800">Explorer</div>
              <div className="flex-grow overflow-auto p-2">
                <VfsPage />
              </div>
            </div>
          </Panel>
        </div>

        {/* Main Content Area */}
        <div className="flex-grow flex flex-col">
          {/* Tab Navigation */}
          <div className="flex border-b border-neutral-800">
            <button
              className={`px-4 py-2 ${activeTab === 'editor' ? 'border-b-2 border-neon-cyan text-neon-cyan' : 'text-neutral-400'}`}
              onClick={() => setActiveTab('editor')}
            >
              Editor
            </button>
            <button
              className={`px-4 py-2 ${activeTab === 'terminal' ? 'border-b-2 border-neon-cyan text-neon-cyan' : 'text-neutral-400'}`}
              onClick={() => setActiveTab('terminal')}
            >
              Terminal
            </button>
            <button
              className={`px-4 py-2 ${activeTab === 'spreadsheet' ? 'border-b-2 border-neon-cyan text-neon-cyan' : 'text-neutral-400'}`}
              onClick={() => setActiveTab('spreadsheet')}
            >
              Spreadsheet
            </button>
          </div>
          {/* Tab Content */}
          <div className="flex-grow mt-4">
            <Panel borderColor="border-green-400">
              {activeTab === 'editor' && (
                <div className="flex items-center justify-center h-full text-neutral-500">
                  Select a file to edit (Editor Component coming in Epic 12)
                </div>
              )}
              {activeTab === 'terminal' && <TerminalPage />}
              {activeTab === 'spreadsheet' && <SpreadsheetPage />}
            </Panel>
          </div>
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
