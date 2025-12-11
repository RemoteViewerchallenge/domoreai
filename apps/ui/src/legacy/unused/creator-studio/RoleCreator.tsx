import RoleCreatorPanel from '../features/creator-studio/RoleCreatorPanel.js';

export default function RoleCreator() {
  return (
    <div className="h-full w-full bg-black overflow-hidden flex flex-col">
       <RoleCreatorPanel className="flex-1 overflow-hidden" />
    </div>
  );
}
