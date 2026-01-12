import { trpc } from "../../utils/trpc.js";
import { NebulaGrid } from "../../components/nebula/primitives/NebulaGrid.js";

export const RoleManagementGrid = () => {
  // 1. Fetch Data (The Soul)
  const { data: roles } = trpc.role.list.useQuery();

  // 2. Define Configuration for the Primitive
  const columns = [
    { key: "name", label: "Role Name" },
    { key: "description", label: "Description" },
    { key: "updatedAt", label: "Last Active" }
  ];

  // 3. Render the Primitive with the Data
  return (
    <NebulaGrid 
      title="System Roles"
      columns={columns}
      data={roles || []} // Inject Data
    />
  );
};
