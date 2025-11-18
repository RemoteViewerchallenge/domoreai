import React from 'react';
import { useCoreStore } from '../../stores/useCoreStore';
import { trpc } from '../../utils/trpc';
import { Select } from 'flyonui';

const OptionsPanel: React.FC = () => {
  const { activeRoleId, setActiveRoleId } = useCoreStore();
  const { data: roles, isLoading } = trpc.role.list.useQuery();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-2">
      <Select
        value={activeRoleId}
        onValueChange={(value) => setActiveRoleId(value)}
      >
        <Select.Trigger>
          <Select.Value placeholder="Select a role" />
        </Select.Trigger>
        <Select.Content>
          {roles?.map((role) => (
            <Select.Item key={role.id} value={role.id}>
              {role.name}
            </Select.Item>
          ))}
        </Select.Content>
      </Select>
    </div>
  );
};

export default OptionsPanel;
