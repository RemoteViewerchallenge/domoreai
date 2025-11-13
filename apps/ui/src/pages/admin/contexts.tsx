import React from 'react';
import { trpc } from '../../utils/trpc';

/**
 * Renders the admin page for viewing contexts.
 * It fetches the list of contexts using tRPC and displays them.
 * @returns {JSX.Element} The rendered contexts page.
 */
function ContextsPage() {
  const { data: contexts, isLoading, error } = trpc.context.findMany.useQuery();

  if (isLoading) {
    return <div>Loading contexts...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <div>
      <h1>Contexts</h1>
      <ul>
        {contexts?.map((context) => (
          <li key={context.id}>
            <h2>{context.name}</h2>
            <p>{context.description}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default ContextsPage;
