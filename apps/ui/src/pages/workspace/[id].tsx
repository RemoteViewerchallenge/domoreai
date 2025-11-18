import { useParams } from 'react-router-dom';
import React, { useEffect } from 'react';
import { FileTree, Terminal, Book, GanttChartSquare } from 'lucide-react';
import useCoreStore from '../../stores/useCoreStore';
import WorkspaceGrid from '../../components/core/WorkspaceGrid';
import { Button } from 'flyonui';

/**
 * Renders the main workspace page, integrating the dynamic grid layout.
 * @returns {JSX.Element} The rendered workspace page.
 */
const MyWorkspacePage = () => {
  const { id } = useParams<{ id: string }>();
  const workspaceName = id || 'default';
  const { setWorkspace, openPage } = useCoreStore();

  useEffect(() => {
    setWorkspace(workspaceName);
  }, [workspaceName, setWorkspace]);

  // Helper to open a page, ensuring a unique ID
  const handleOpenPage = (type: 'VFS' | 'TERMINAL' | 'SPREADSHEET' | 'TASKS') => {
    const page = {
      id: `${type}-${Date.now()}`, // Simple unique ID for now
      type,
      title: `${type.charAt(0)}${type.slice(1).toLowerCase()} View`,
    };
    openPage(page);
  };

  return (
    <div className="flex h-screen bg-neutral-900 text-neutral-100">
      {/* Sidebar for actions */}
      <aside className="w-16 flex flex-col items-center gap-4 p-2 bg-neutral-800 border-r border-neutral-700">
        <h1 className="text-sm font-bold text-neon-cyan mb-4">C.O.R.E</h1>
        <Button size="icon" variant="ghost" onClick={() => handleOpenPage('VFS')} aria-label="Open File Explorer">
          <FileTree className="h-6 w-6" />
        </Button>
        <Button size="icon" variant="ghost" onClick={() => handleOpenPage('TERMINAL')} aria-label="Open Terminal">
          <Terminal className="h-6 w-6" />
        </Button>
        <Button size="icon" variant="ghost" onClick={() => handleOpenPage('SPREADSHEET')} aria-label="Open Spreadsheet">
          <Book className="h-6 w-6" />
        </Button>
        <Button size="icon" variant="ghost" onClick={() => handleOpenPage('TASKS')} aria-label="Open Tasks">
          <GanttChartSquare className="h-6 w-6" />
        </Button>
      </aside>

      {/* Main Content Area */}
      <main className="flex-grow">
        <WorkspaceGrid />
      </main>
    </div>
  );
};

export default MyWorkspacePage;
