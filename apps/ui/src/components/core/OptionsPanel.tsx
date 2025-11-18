import React from 'react';
import { Select } from 'flyonui'; // Assuming this exists
import { useCoreStore } from '../../stores/coreStore';
import { trpc } from '../../utils/trpc';

const OptionsPanel: React.FC = () => {
  const { data: roles, isLoading } = trpc.role.list.useQuery();
  const { activeRoleId, setActiveRoleId } = useCoreStore();

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <h2>Options</h2>
      <Select
        value={activeRoleId}
        onValueChange={setActiveRoleId}
      >
        {roles?.map(role => (
          <Select.Item key={role.id} value={role.id}>
            {role.name}
          </Select.Item>
        ))}
      </Select>
    </div>
  );
};

export default OptionsPanel;
