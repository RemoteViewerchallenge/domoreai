
import { FC } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components/ui/select';
import { trpc } from '../../utils/trpc';
import { useCoreStore } from '../../stores/core';

const OptionsPanel: FC = () => {
  const { data: roles, isLoading } = trpc.role.list.useQuery();
  const setActiveRoleId = useCoreStore((state) => state.setActiveRoleId);
  const activeRoleId = useCoreStore((state) => state.activeRoleId);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold">Options</h3>
      <div className="mt-4">
        <label htmlFor="role-select" className="block text-sm font-medium">
          Select Role
        </label>
        <Select
          value={activeRoleId || ''}
          onValueChange={(value) => setActiveRoleId(value)}
        >
          <SelectTrigger id="role-select">
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
