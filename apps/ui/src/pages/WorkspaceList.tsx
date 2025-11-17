import { Link } from 'react-router-dom';
import { Button } from 'flyonui';

/**
 * A simple component to list available workspaces.
 * In a real application, this would be dynamic and fetch data from an API.
 * @returns {JSX.Element} The rendered workspace list.
 */
export default function WorkspaceListPage() {
  return (
    <div>
      <Button>Flyon UI Button</Button>
      <h1>Workspaces</h1>
      <ul>
        <li><Link to="/workspace/default">Default Workspace</Link></li>
        <li><Link to="/providers">Provider Manager</Link></li>
      </ul>
    </div>
  );
}