import { Link } from 'react-router-dom';
import { Button } from 'flyonui';
import { useCoreStore } from '../stores/useCoreStore';

/**
 * A simple component to list available workspaces.
 * In a real application, this would be dynamic and fetch data from an API.
 * @returns {JSX.Element} The rendered workspace list.
 */
export default function WorkspaceListPage() {
  const { openPage } = useCoreStore();

  const handleOpenTestPages = () => {
    openPage({ id: 'vfs-1', type: 'VFS', title: 'VFS' });
    openPage({ id: 'terminal-1', type: 'TERMINAL', title: 'Terminal' });
    openPage({ id: 'spreadsheet-1', type: 'SPREADSHEET', title: 'Spreadsheet' });
  };

  return (
    <div>
      <Button>Flyon UI Button</Button>
      <h1>Workspaces</h1>
      <ul>
        <li><Link to="/workspace/default">Default Workspace</Link></li>
        <li><Link to="/providers">Provider Manager</Link></li>
        <li>
          <Button onClick={handleOpenTestPages}>Open Test Pages</Button>
          <Link to="/grid-test" className="ml-4">Go to Grid Test</Link>
        </li>
      </ul>
    </div>
  );
}