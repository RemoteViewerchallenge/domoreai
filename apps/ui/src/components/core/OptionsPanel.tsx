import React from 'react';
import { Select } from 'flyonui';
import { useCoreStore } from '../../stores/core';
import { trpc } from '../../utils/trpc';

const OptionsPanel: React.FC = () => {
  const { data: roles } = trpc.role.list.useQuery();
  const { activeRoleId, setActiveRoleId } = useCoreStore();

  const roleOptions = roles?.map((role) => ({
    value: role.id,
    label: role.name,
  }));

  return (
    <div>
      <h3>Options</h3>
      <div>
        <label>Role:</label>
        <Select
          options={roleOptions || []}
          value={roleOptions?.find((option) => option.value === activeRoleId)}
          onChange={(option) => setActiveRoleId(option.value)}
        />
      </div>
    </div>
  );
};

export default OptionsPanel;
