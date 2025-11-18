import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'flyonui/components/ui/Select';
import { useCoreStore } from '../../stores/core.store';
import { trpc } from '../../utils/trpc';

const OptionsPanel: React.FC = () => {
  const { data: roles, isLoading } = trpc.role.list.useQuery();
  const { activeRoleId, setActiveRoleId } = useCoreStore();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-4">Options</h2>
      <div className="flex items-center">
        <span className="mr-2">Role:</span>
        <Select onValueChange={setActiveRoleId} value={activeRoleId || ''}>
          <SelectTrigger>
            <SelectValue placeholder="Select a role" />
          </SelectTrigger>
          <SelectContent>
            {roles?.map((role) => (
              <SelectItem key={role.id} value={role.id}>
                {role.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default OptionsPanel;
