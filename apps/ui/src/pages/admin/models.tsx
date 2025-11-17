import { trpc } from '@/utils/trpc';

const ModelsPage = () => {
  const { data: models, isLoading } = trpc.lootbox.getModels.useQuery();

  if (isLoading) {
    return <div>Loading...</div>;
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
