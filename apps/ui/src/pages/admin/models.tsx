import { trpc } from '../../utils/trpc.js';

const ModelsPage = () => {
  const { data: models, isLoading, isError, error } = trpc.model.list.useQuery();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (isError) {
    return <div>Error: {error instanceof Error ? error.message : 'Unknown error'}</div>;
  }

  return (
    <div>
      <h1>Models</h1>
      <ul>
        {models?.map((model: { id: string; name: string }) => (
          <li key={model.id}>{model.name}</li>
        ))}
      </ul>
    </div>
  );
};

export default ModelsPage;
